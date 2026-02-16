import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ==================== إعدادات السيرفر على Railway ====================
const RAILWAY_API_URL = "https://zayedid-production.up.railway.app/send-order";

export default function GroceryAIModal({ visible, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef(null);

  // تحميل البيانات المحفوظة عند فتح المودال
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedPhone = await AsyncStorage.getItem('zayed_phone');
        const savedAddress = await AsyncStorage.getItem('zayed_address');
        if (savedPhone) setPhoneNumber(savedPhone);
        if (savedAddress) setAddress(savedAddress);
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
      }
    };
    if (visible) loadSavedData();
  }, [visible]);

  // حفظ رقم التليفون
  const savePhoneNumber = async (value) => {
    setPhoneNumber(value);
    await AsyncStorage.setItem('zayed_phone', value);
  };

  // حفظ العنوان
  const saveAddress = async (value) => {
    setAddress(value);
    await AsyncStorage.setItem('zayed_address', value);
  };

  // تحويل النص إلى عناصر
  const handleOrderTextChange = (text) => {
    setOrderText(text);
    const items = text.split(/[،,و\n]+/).map(i => i.trim()).filter(i => i.length > 0);
    setOrderItems(items);
  };

  // حذف عنصر
  const removeItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
    setOrderText(newItems.join('، '));
  };

  // بدء التسجيل الصوتي
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
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

      setRecordingInstance(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };

  // إيقاف التسجيل
  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recordingInstance) return;

    try {
      await recordingInstance.stopAndUnloadAsync();
      setRecordedUri(recordingInstance.getURI());
      setIsRecording(false);
      Alert.alert('تم', 'تم تسجيل الصوت بنجاح');
    } catch (error) {
      console.error(error);
      Alert.alert('خطأ', 'فشل إيقاف التسجيل');
    }
  };

  // ==================== رفع الملف الصوتي وتحويله إلى رابط ====================
  const uploadVoiceToServer = async (uri) => {
    try {
      // قراءة الملف الصوتي وتحويله إلى Base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // إرسال الملف الصوتي إلى السيرفر
      const response = await fetch('https://zayedid-production.up.railway.app/upload-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });
      
      const result = await response.json();
      return result.url; // السيرفر هيرجع رابط الملف الصوتي
    } catch (error) {
      console.error('خطأ في رفع الصوت:', error);
      return null;
    }
  };

  // ==================== دالة الإرسال إلى Railway ====================
  const submitOrder = async () => {
    // التحقق من البيانات
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      Alert.alert('تنبيه', 'أدخل رقم هاتف صحيح');
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

    setSending(true);

    try {
      let voiceUrl = null;
      
      // إذا في تسجيل صوتي، ارفعه الأول
      if (recordedUri) {
        voiceUrl = await uploadVoiceToServer(recordedUri);
      }

      console.log('📤 إرسال الطلب إلى Railway:', {
        phone: phoneNumber,
        address: address,
        items: orderItems,
        rawText: orderText,
        voiceUrl: voiceUrl
      });

      const response = await fetch(RAILWAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          address: address,
          items: orderItems,
          rawText: orderText,
          voiceUrl: voiceUrl
        }),
      });

      const result = await response.json();
      console.log('📥 رد السيرفر:', result);

      if (result.success) {
        // عرض رسالة نجاح
        if (Platform.OS === 'android') {
          ToastAndroid.show('✅ تم إرسال طلبك بنجاح!', ToastAndroid.LONG);
        } else {
          Alert.alert('تم', '✅ تم إرسال طلبك بنجاح!');
        }

        // إعادة تعيين الحقول
        setOrderText('');
        setOrderItems([]);
        setRecordedUri(null);

        // إغلاق المودال بعد 2 ثانية
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('فشل إرسال الطلب');
      }
    } catch (error) {
      console.error('❌ خطأ في الإرسال:', error);
      Alert.alert(
        'خطأ',
        'تعذر الاتصال بالسيرفر. تأكد من اتصال الإنترنت وأن السيرفر شغال على Railway.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            {/* الهيدر */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image
                  source={{ uri: 'https://img.icons8.com/color/96/000000/grocery-store.png' }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.headerTitle}>طلب جديد</Text>
                  <Text style={styles.headerSub}>Zayed-ID</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* حقل رقم التليفون */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>📞 رقم التليفون</Text>
                <TextInput
                  style={styles.input}
                  placeholder="01xxxxxxxxx"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={savePhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>

              {/* حقل العنوان */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>📍 العنوان بالتفصيل</Text>
                <TextInput
                  style={styles.input}
                  placeholder="المنطقة، الشارع، رقم المبني"
                  placeholderTextColor="#9CA3AF"
                  value={address}
                  onChangeText={saveAddress}
                  multiline
                />
              </View>

              {/* حقل الطلب */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>🛒 اكتب طلبك</Text>
                <TextInput
                  style={styles.orderInput}
                  placeholder="مثال: 2 كيلو سكر، زيت، رز"
                  placeholderTextColor="#9CA3AF"
                  value={orderText}
                  onChangeText={handleOrderTextChange}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* عناصر الطلب (Badges) */}
              {orderItems.length > 0 && (
                <View style={styles.badgesContainer}>
                  {orderItems.map((item, index) => (
                    <View key={index} style={styles.badge}>
                      <Text style={styles.badgeText}>{item}</Text>
                      <TouchableOpacity onPress={() => removeItem(index)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* زر التسجيل الصوتي (اختياري) */}
              <View style={styles.voiceSection}>
                <Text style={styles.label}>🎤 تسجيل صوتي (اختياري)</Text>
                {!recordedUri ? (
                  <TouchableOpacity
                    style={[styles.voiceButton, isRecording && styles.recordingActive]}
                    onPress={isRecording ? stopRecording : startRecording}
                  >
                    <Ionicons
                      name={isRecording ? "stop-circle" : "mic-circle"}
                      size={48}
                      color={isRecording ? "#EF4444" : "#F59E0B"}
                    />
                    <Text style={styles.voiceButtonText}>
                      {isRecording ? `تسجيل... ${recordingDuration}ث` : 'اضغط للتسجيل'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.recordedContainer}>
                    <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                    <Text style={styles.recordedText}>تم التسجيل ✓</Text>
                    <TouchableOpacity onPress={() => setRecordedUri(null)}>
                      <Ionicons name="close-circle" size={32} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* زر الإرسال */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (sending || orderItems.length === 0) && styles.submitButtonDisabled
                ]}
                onPress={submitOrder}
                disabled={sending || orderItems.length === 0}
              >
                {sending ? (
                  <ActivityIndicator size="large" color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>تأكيد الطلب</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 60,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { fontSize: 12, color: '#666' },
  closeBtn: { padding: 5, backgroundColor: '#FEE2E2', borderRadius: 15 },
  formContainer: { padding: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12
  },
  orderInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 20
  },
  badge: {
    backgroundColor: '#EEE',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  badgeText: { fontSize: 12 },
  voiceSection: { marginBottom: 20 },
  voiceButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed'
  },
  recordingActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  voiceButtonText: { marginTop: 8, fontSize: 14, color: '#666' },
  recordedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981'
  },
  recordedText: { fontSize: 16, color: '#10B981', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10
  },
  submitButtonDisabled: { backgroundColor: '#CCC' },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
