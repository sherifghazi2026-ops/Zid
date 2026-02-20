import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const SERVER_URL = 'https://zayedid-production.up.railway.app';

export default function KitchenScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('جنة 2');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // حالات التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  useEffect(() => {
    loadSavedData();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    if (savedPhone) setPhoneNumber(savedPhone);
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedAddress) setAddress(savedAddress);
  };

  // ========== دوال الصور ==========
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للكاميرا');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للمعرض');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // ========== دوال التسجيل الصوتي ==========
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بتسجيل الصوت');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
      Alert.alert('✅ تم', 'تم تسجيل المذكرة الصوتية');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ التسجيل');
    }
  };

  const playRecording = async () => {
    if (!recordedUri) return;
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setIsPlaying(false);
      });
    } catch (error) {
      Alert.alert('خطأ', 'فشل تشغيل التسجيل');
    }
  };

  const deleteRecording = () => {
    setRecordedUri(null);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
  };

  // ========== رفع الصور ==========
  const uploadImage = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`${SERVER_URL}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      return data.success ? data.url : null;
    } catch (error) {
      console.error('❌ فشل رفع الصورة:', error);
      return null;
    }
  };

  // ========== رفع الصوت ==========
  const uploadVoice = async (uri) => {
    try {
      setUploadingVoice(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`${SERVER_URL}/upload-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 }),
      });

      const data = await response.json();
      return data.success ? data.url : null;
    } catch (error) {
      console.error('❌ فشل رفع الصوت:', error);
      return null;
    } finally {
      setUploadingVoice(false);
    }
  };

  // ========== إرسال الطلب ==========
  const sendOrder = async () => {
    if (!phoneNumber) return Alert.alert('تنبيه', 'أدخل رقم الموبايل');
    if (!description) return Alert.alert('تنبيه', 'اكتب وصف الطلب');

    setLoading(true);
    try {
      // رفع الصور
      const uploadedImages = [];
      for (const uri of images) {
        const url = await uploadImage(uri);
        if (url) uploadedImages.push(url);
      }

      // رفع الصوت إن وجد
      let voiceUrl = null;
      if (recordedUri) {
        voiceUrl = await uploadVoice(recordedUri);
      }

      const orderData = {
        phone: phoneNumber,
        address: address,
        rawText: description,
        items: [description],
        imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : null,
        images: uploadedImages,
        voiceUrl: voiceUrl,
        serviceName: 'مطابخ',
      };

      console.log('📤 إرسال طلب مطابخ:', orderData);

      const response = await fetch(`${SERVER_URL}/send-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);

        Alert.alert(
          '✅ تم بنجاح',
          'تم إرسال طلبك، سيتم التواصل معك قريباً',
          [{ text: 'ممتاز', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('⚠️', 'حدث خطأ في الإرسال');
      }
    } catch (e) {
      console.error('❌ خطأ:', e);
      Alert.alert('خطأ', 'فشل الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Ionicons name="restaurant" size={32} color="#10B981" />
        <Text style={styles.headerTitle}>مطابخ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputContainer}>
          <Ionicons name="call" size={20} color="#10B981" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="رقم الموبايل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="location" size={20} color="#10B981" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.textAreaContainer}>
          <Text style={styles.label}>📝 وصف الطلب</Text>
          <TextInput
            style={styles.textArea}
            placeholder="اكتب تفاصيل الطلب هنا..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* قسم الصور */}
        <View style={styles.imagesSection}>
          <Text style={styles.label}>🖼️ صور توضيحية (اختياري)</Text>
          
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#10B981" />
              <Text style={styles.imageButtonText}>تصوير</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="images" size={32} color="#3B82F6" />
              <Text style={styles.imageButtonText}>معرض</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <ScrollView horizontal style={styles.imagesList}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* قسم التسجيل الصوتي */}
        <View style={styles.voiceSection}>
          <Text style={styles.label}>🎤 تسجيل صوتي (اختياري)</Text>

          {!recordedUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={uploadingVoice}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={24}
                color={isRecording ? "#FFF" : "#10B981"}
              />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? 'جاري التسجيل... اضغط للإيقاف' : 'اضغط للتسجيل'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity style={[styles.recordAction, styles.playButton]} onPress={playRecording} disabled={uploadingVoice}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#3B82F6" />
                <Text style={styles.recordActionText}>{isPlaying ? 'إيقاف' : 'استماع'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recordAction, styles.deleteAction]} onPress={deleteRecording} disabled={uploadingVoice}>
                <Ionicons name="trash" size={24} color="#EF4444" />
                <Text style={[styles.recordActionText, styles.deleteText]}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingVoice && <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabled]}
          onPress={sendOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>إرسال الطلب</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  backButton: { marginRight: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  content: { padding: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 14, color: '#1F2937' },
  textAreaContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagesSection: { marginBottom: 20 },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imageButtonText: { marginTop: 8, fontSize: 14, color: '#6B7280' },
  imagesList: { flexDirection: 'row', marginTop: 10 },
  imageWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  removeImage: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12 },
  voiceSection: { marginBottom: 20 },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  recordingButton: { backgroundColor: '#EF4444' },
  voiceButtonText: { fontSize: 14, fontWeight: '600' },
  recordingText: { color: '#FFF' },
  recordedControls: { flexDirection: 'row', gap: 10 },
  recordAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, gap: 6 },
  playButton: { backgroundColor: '#F3F4F6' },
  deleteAction: { backgroundColor: '#FEE2E2' },
  recordActionText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  deleteText: { color: '#EF4444' },
  uploadingText: { textAlign: 'center', color: '#10B981', marginTop: 5, fontSize: 12 },
  sendButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
