import React, { useState, useEffect, useRef } from 'react';
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
import { createOrder, uploadFile } from '../services/orderService';
import { getServiceById } from '../services/servicesService';
import { playSendSound } from '../utils/SoundHelper';

export default function ServiceScreen({ navigation, route }) {
  const { serviceType } = route.params;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [voiceUri, setVoiceUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadService();
    loadSavedData();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  const loadService = async () => {
    try {
      setLoading(true);
      const result = await getServiceById(serviceType);
      if (result.success && result.data) {
        setService(result.data);
      } else {
        console.log('❌ الخدمة غير موجودة:', serviceType);
        Alert.alert('تنبيه', 'الخدمة غير متوفرة حالياً', [
          { text: 'حسناً', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الخدمة:', error);
      Alert.alert('خطأ', 'فشل في تحميل الخدمة');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setPhoneNumber(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للمعرض');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصور:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للكاميرا');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('❌ خطأ في التقاط الصورة:', error);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بتسجيل الصوت');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) {
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setVoiceUri(uri);
      Alert.alert('✅ تم', 'تم تسجيل الصوت بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ التسجيل');
    }
  };

  const playVoice = async () => {
    if (!voiceUri) return;
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: voiceUri }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setIsPlaying(false); });
    } catch (error) {
      Alert.alert('خطأ', 'فشل تشغيل التسجيل');
    }
  };

  const deleteVoice = () => {
    setVoiceUri(null);
    setRecordingDuration(0);
    if (sound) { sound.unloadAsync(); setSound(null); setIsPlaying(false); }
  };

  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم الموبايل');
      return;
    }
    if (!address.trim()) {
      Alert.alert('تنبيه', 'أدخل العنوان');
      return;
    }

    setSending(true);

    try {
      let voiceFileUrl = null;
      if (voiceUri) {
        setUploadingVoice(true);
        console.log('🎤 بدء رفع الصوت إلى ImageKit...');
        const uploadResult = await uploadFile(voiceUri, `voice_${Date.now()}.m4a`, 'voice');
        setUploadingVoice(false);

        if (uploadResult.success) {
          voiceFileUrl = uploadResult.fileUrl;
          console.log('✅ تم رفع الصوت:', voiceFileUrl);
        } else {
          console.log('⚠️ فشل رفع الصوت:', uploadResult.error);
        }
      }

      const imageUrls = [];
      if (images.length > 0) {
        setUploadingImages(true);
        console.log(`🖼️ بدء رفع ${images.length} صورة...`);

        for (let i = 0; i < images.length; i++) {
          const uri = images[i];
          console.log(`🖼️ رفع صورة ${i+1}/${images.length}`);
          const imageResult = await uploadFile(uri, `image_${Date.now()}_${i}.jpg`, 'image');
          if (imageResult.success) {
            imageUrls.push(imageResult.fileUrl);
          }
        }
        setUploadingImages(false);
        console.log(`✅ تم رفع ${imageUrls.length} صورة بنجاح`);
      }

      const orderData = {
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: serviceType,
        serviceName: service?.name || serviceType,
        items: description ? [description] : [],
        description: description,
        rawText: description,
        voiceUrl: voiceFileUrl,
        imageUrls: imageUrls,
        notes: '',
      };

      const result = await createOrder(orderData);

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);
        await playSendSound();
        Alert.alert(
          '✅ تم استلام طلبك',
          service?.responseMessage || 'سيتم التواصل معك قريباً',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
        setDescription('');
        setImages([]);
        setVoiceUri(null);
      } else {
        Alert.alert('خطأ', 'فشل في إرسال الطلب: ' + result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في الإرسال:', error);
      Alert.alert('خطأ', 'فشل في إرسال الطلب');
    } finally {
      setSending(false);
      setUploadingVoice(false);
      setUploadingImages(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: service?.color || '#4F46E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{service?.name || 'خدمة'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={[styles.input, { color: '#1F2937' }]}
              placeholder="رقم الموبايل"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!sending}
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={[styles.input, { color: '#1F2937' }]}
              placeholder="العنوان"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              editable={!sending}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>📝 وصف الطلب</Text>
          <TextInput
            style={[styles.textArea, { color: '#1F2937' }]}
            placeholder="اكتب تفاصيل طلبك هنا..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!sending}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>🖼️ صور توضيحية (اختياري)</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto} disabled={sending}>
              <Ionicons name="camera" size={24} color="#4F46E5" />
              <Text style={styles.imageButtonText}>تصوير</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={sending}>
              <Ionicons name="images" size={24} color="#3B82F6" />
              <Text style={styles.imageButtonText}>معرض</Text>
            </TouchableOpacity>
          </View>
          {uploadingImages && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.uploadingText}>جاري رفع الصور...</Text>
            </View>
          )}

          {images.length > 0 && (
            <ScrollView horizontal style={styles.imagesList}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(index)} disabled={sending}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>🎤 تسجيل صوتي (اختياري)</Text>
          {!voiceUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={sending || uploadingVoice}
            >
              <Ionicons name={isRecording ? "stop" : "mic"} size={24} color={isRecording ? "#FFF" : "#4F46E5"} />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? `تسجيل... ${recordingDuration}ث` : 'اضغط للتسجيل'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity style={[styles.recordAction, styles.playButton]} onPress={playVoice} disabled={sending}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFF" />
                <Text style={styles.recordActionText}>{isPlaying ? 'جاري التشغيل' : 'استماع'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recordAction, styles.deleteAction]} onPress={deleteVoice} disabled={sending}>
                <Ionicons name="trash" size={24} color="#FFF" />
                <Text style={styles.recordActionText}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingVoice && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>
            </View>
          )}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{service?.responseMessage || 'سيتم التواصل معك قريباً'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, (sending || uploadingVoice || uploadingImages) && styles.disabled]}
          onPress={sendOrder}
          disabled={sending || uploadingVoice || uploadingImages}
        >
          {(sending || uploadingVoice || uploadingImages) ? (
            <View style={styles.sendingContainer}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.sendingText}>جاري الإرسال...</Text>
            </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', flex: 1 },
  content: { padding: 20 },
  section: { marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    paddingHorizontal: 15,
    gap: 10
  },
  input: { flex: 1, paddingVertical: 15, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  imageButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    gap: 8
  },
  imageButtonText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  imagesList: { flexDirection: 'row', marginTop: 10 },
  imageWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  removeImage: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12 },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  uploadingText: { fontSize: 14, color: '#4F46E5', fontWeight: '500' },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 8
  },
  recordingButton: { backgroundColor: '#EF4444' },
  voiceButtonText: { fontSize: 14, fontWeight: '600' },
  recordingText: { color: '#FFF' },
  recordedControls: { flexDirection: 'row', gap: 10 },
  recordAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6
  },
  playButton: { backgroundColor: '#3B82F6' },
  deleteAction: { backgroundColor: '#EF4444' },
  recordActionText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  noteBox: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 15 },
  noteText: { fontSize: 14, color: '#92400E', textAlign: 'center' },
  sendButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendingText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
