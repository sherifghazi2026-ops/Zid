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
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== إعدادات تليجرام ====================
const TELEGRAM_BOT_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_CHAT_ID = "1814331589";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ==================== دالة إرسال رسالة تليجرام ====================
const sendTelegramMessage = async (message) => {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('خطأ في إرسال رسالة تليجرام:', error);
    return false;
  }
};

// ==================== دالة إرسال ملف صوتي لتليجرام ====================
const sendTelegramVoice = async (audioUri) => {
  try {
    // إنشاء FormData
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('voice', {
      uri: audioUri,
      type: 'audio/ogg',
      name: 'voice_note.ogg',
    });
    
    const response = await fetch(`${TELEGRAM_API_URL}/sendVoice`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('خطأ في إرسال الصوت:', error);
    return false;
  }
};

// ==================== دالة تنسيق الفاتورة ====================
const formatReceipt = (customerInfo, items) => {
  const date = new Date();
  const formattedDate = date.toLocaleDateString('ar-EG');
  const formattedTime = date.toLocaleTimeString('ar-EG');
  
  let receipt = `🧾 <b>طلب جديد من Zayed-ID</b>\n`;
  receipt += `📅 ${formattedDate} - ${formattedTime}\n`;
  receipt += `──────────────────\n\n`;
  
  receipt += `👤 <b>معلومات العميل:</b>\n`;
  receipt += `📞 ${customerInfo.phone}\n`;
  receipt += `📍 ${customerInfo.address}\n\n`;
  
  receipt += `🛒 <b>المنتجات المطلوبة:</b>\n`;
  receipt += `──────────────────\n`;
  
  items.forEach((item, index) => {
    receipt += `${index + 1}. ${item}\n`;
  });
  
  receipt += `──────────────────\n`;
  receipt += `✅ تم استلام الطلب وجاري التجهيز\n`;
  
  return receipt;
};

export default function GroceryAIModal({ visible, onClose }) {
  // ===== حالات النموذج =====
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  
  // ===== حالات التسجيل الصوتي =====
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);
  
  // ===== حالات التحميل =====
  const [sending, setSending] = useState(false);
  
  // ===== تحميل البيانات المحفوظة =====
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
    
    if (visible) {
      loadSavedData();
    }
  }, [visible]);
  
  // ===== حفظ رقم التليفون =====
  const savePhoneNumber = async (value) => {
    setPhoneNumber(value);
    try {
      await AsyncStorage.setItem('zayed_phone', value);
    } catch (error) {
      console.error('خطأ في حفظ رقم الهاتف:', error);
    }
  };
  
  // ===== حفظ العنوان =====
  const saveAddress = async (value) => {
    setAddress(value);
    try {
      await AsyncStorage.setItem('zayed_address', value);
    } catch (error) {
      console.error('خطأ في حفظ العنوان:', error);
    }
  };
  
  // ===== تحليل النص وتحويله إلى عناصر =====
  const parseOrderText = (text) => {
    if (!text.trim()) return [];
    
    // تقسيم النص على الفواصل أو "و"
    const separators = /[،,و\n]+/;
    const items = text.split(separators)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    return items;
  };
  
  // ===== معالجة تغيير نص الطلب =====
  const handleOrderTextChange = (text) => {
    setOrderText(text);
    const items = parseOrderText(text);
    setOrderItems(items);
  };
  
  // ===== حذف عنصر من القائمة =====
  const removeItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
    
    // تحديث نص الطلب
    setOrderText(newItems.join('، '));
  };
  
  // ===== بدء التسجيل =====
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
      
      // مؤقت لحساب مدة التسجيل
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };
  
  // ===== إيقاف التسجيل =====
  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!recordingInstance) return;
    
    try {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setRecordingInstance(null);
      setIsRecording(false);
      setRecordedUri(uri);
      
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إيقاف التسجيل');
    }
  };
  
  // ===== حذف التسجيل =====
  const deleteRecording = () => {
    setRecordedUri(null);
    setRecordingDuration(0);
  };
  
  // ===== إرسال الطلب =====
  const submitOrder = async () => {
    // التحقق من البيانات
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      Alert.alert('تنبيه', 'من فضلك أدخل رقم تليفون صحيح');
      return;
    }
    
    if (!address.trim()) {
      Alert.alert('تنبيه', 'من فضلك أدخل العنوان');
      return;
    }
    
    if (orderItems.length === 0) {
      Alert.alert('تنبيه', 'أضف منتجات للطلب أولاً');
      return;
    }
    
    setSending(true);
    
    try {
      // تنسيق الفاتورة
      const customerInfo = { phone: phoneNumber, address };
      const receipt = formatReceipt(customerInfo, orderItems);
      
      // إرسال الرسالة لتليجرام
      const messageSent = await sendTelegramMessage(receipt);
      
      if (!messageSent) {
        throw new Error('فشل إرسال الرسالة');
      }
      
      // إرسال التسجيل الصوتي إذا وجد
      if (recordedUri) {
        await sendTelegramVoice(recordedUri);
      }
      
      // عرض رسالة النجاح
      if (Platform.OS === 'android') {
        ToastAndroid.show('تم استلام طلبك! جاري التجهيز.', ToastAndroid.LONG);
      } else {
        Alert.alert('تم', 'تم استلام طلبك! جاري التجهيز.');
      }
      
      // إعادة تعيين النموذج
      setOrderText('');
      setOrderItems([]);
      setRecordedUri(null);
      
      // إغلاق المودال بعد 2 ثانية
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال الطلب. حاول مرة أخرى.');
    }
    
    setSending(false);
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
              {/* ===== حقل رقم التليفون ===== */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>📞 رقم التليفون</Text>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: 01012345678"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={savePhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
              
              {/* ===== حقل العنوان ===== */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>📍 العنوان بالتفصيل</Text>
                <TextInput
                  style={styles.input}
                  placeholder="المنطقة، الشارع، رقم المبني، رقم الشقة"
                  placeholderTextColor="#9CA3AF"
                  value={address}
                  onChangeText={saveAddress}
                  multiline
                />
              </View>
              
              {/* ===== حقل الطلب ===== */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>🛒 اكتب طلبك</Text>
                <TextInput
                  style={styles.orderInput}
                  placeholder="مثال: 2 كيلو رز الضحى، علبة تونة، زيت ذهبي"
                  placeholderTextColor="#9CA3AF"
                  value={orderText}
                  onChangeText={handleOrderTextChange}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              {/* ===== عناصر الطلب (Badges) ===== */}
              {orderItems.length > 0 && (
                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsTitle}>📋 عناصر الطلب:</Text>
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
                </View>
              )}
              
              {/* ===== تسجيل صوتي ===== */}
              <View style={styles.voiceSection}>
                <Text style={styles.label}>🎤 تسجيل صوتي (اختياري)</Text>
                
                {!recordedUri ? (
                  <TouchableOpacity
                    style={[
                      styles.voiceButton,
                      isRecording && styles.recordingActive
                    ]}
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
                    <TouchableOpacity onPress={deleteRecording}>
                      <Ionicons name="close-circle" size={32} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {/* ===== زر الإرسال ===== */}
              <TouchableOpacity
                style={[styles.submitButton, sending && styles.submitButtonDisabled]}
                onPress={submitOrder}
                disabled={sending || orderItems.length === 0}
              >
                {sending ? (
                  <ActivityIndicator size="large" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={24} color="#FFF" />
                    <Text style={styles.submitButtonText}>تأكيد الطلب</Text>
                  </>
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
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
  },
  orderInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  itemsContainer: {
    marginBottom: 20,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 10,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: 13,
    color: '#1F2937',
  },
  voiceSection: {
    marginBottom: 20,
  },
  voiceButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  recordingActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  voiceButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  recordedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  recordedText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
