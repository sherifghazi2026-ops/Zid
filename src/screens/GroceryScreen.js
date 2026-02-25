import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { createOrder, uploadFile, SERVICE_TYPES } from '../services/orderService';

export default function GroceryScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('جنة 2');
  const [orderText, setOrderText] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // حالات التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    loadSavedData();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setPhoneNumber(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  };

  const parseOrderText = (text) => {
    if (!text.trim()) return [];
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const separators = /[،,]\s*|\s+و\s+|\s*;\s*|\s*\.\s*/;
    let items = cleanText.split(separators).map(item => item.trim()).filter(item => item.length > 0);
    return items;
  };

  const handleOrderTextChange = (text) => {
    setOrderText(text);
    const items = parseOrderText(text);
    setOrderItems(items);
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
      setRecordedUri(recording.getURI());
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
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setIsPlaying(false); });
    } catch (error) {
      Alert.alert('خطأ', 'فشل تشغيل التسجيل');
    }
  };

  const deleteRecording = () => {
    setRecordedUri(null);
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
    if (orderItems.length === 0) {
      Alert.alert('تنبيه', 'أضف منتجات للطلب');
      return;
    }

    setLoading(true);
    try {
      let voiceFileId = null;
      if (recordedUri) {
        setUploadingVoice(true);
        const uploadResult = await uploadFile(recordedUri, `voice_${Date.now()}.m4a`);
        if (uploadResult.success) {
          voiceFileId = uploadResult.fileId;
        }
        setUploadingVoice(false);
      }

      const result = await createOrder({
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: SERVICE_TYPES.GROCERY,
        serviceName: 'سوبر ماركت',
        items: orderItems,
        rawText: orderText,
        voiceFileId,
        notes: '',
      });

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);

        Alert.alert(
          '✅ تم استلام طلبك',
          'سيتم التواصل معك قريباً',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );

        setOrderText('');
        setOrderItems([]);
        deleteRecording();
      } else {
        Alert.alert('خطأ', 'فشل في إرسال الطلب: ' + result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في الإرسال:', error);
      Alert.alert('خطأ', 'فشل في إرسال الطلب. تأكد من اتصال الإنترنت');
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
        <Text style={styles.headerTitle}>سوبر ماركت</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="basket-outline" size={60} color="#F59E0B" style={styles.icon} />

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="رقم الموبايل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="create-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب طلبك هنا... مثال: 2 كيلو سكر، زيت، رز"
            value={orderText}
            onChangeText={handleOrderTextChange}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        {orderItems.length > 0 && (
          <View style={styles.itemsPreview}>
            <Text style={styles.itemsTitle}>المنتجات:</Text>
            {orderItems.map((item, index) => (
              <Text key={index} style={styles.itemText}>• {item}</Text>
            ))}
          </View>
        )}

        <View style={styles.voiceSection}>
          <Text style={styles.voiceTitle}>🎤 تسجيل صوتي (اختياري)</Text>

          {!recordedUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={uploadingVoice || loading}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={24}
                color={isRecording ? "#FFF" : "#F59E0B"}
              />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? `تسجيل... ${recordingDuration}ث` : 'اضغط للتسجيل'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity
                style={[styles.recordAction, styles.playButton]}
                onPress={playRecording}
                disabled={uploadingVoice || loading}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFF" />
                <Text style={styles.recordActionText}>{isPlaying ? 'جاري التشغيل' : 'استماع'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordAction, styles.deleteAction]}
                onPress={deleteRecording}
                disabled={uploadingVoice || loading}
              >
                <Ionicons name="trash" size={24} color="#FFF" />
                <Text style={styles.recordActionText}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingVoice && <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>سيتم تحديد السعر لاحقاً عند التواصل معك</Text>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabled]}
          onPress={sendOrder}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendButtonText}>إرسال الطلب</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20 },
  icon: { alignSelf: 'center', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 14, color: '#1F2937' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  itemsPreview: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 15 },
  itemsTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 5 },
  itemText: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  voiceSection: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  voiceTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 10 },
  voiceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, gap: 8 },
  recordingButton: { backgroundColor: '#EF4444' },
  voiceButtonText: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  recordingText: { color: '#FFF' },
  recordedControls: { flexDirection: 'row', justifyContent: 'space-around', gap: 10 },
  recordAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 6 },
  playButton: { backgroundColor: '#3B82F6' },
  deleteAction: { backgroundColor: '#EF4444' },
  recordActionText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  uploadingText: { textAlign: 'center', color: '#F59E0B', marginTop: 5, fontSize: 12 },
  noteBox: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 15 },
  noteText: { fontSize: 14, color: '#92400E', textAlign: 'center' },
  sendButton: { backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
});
