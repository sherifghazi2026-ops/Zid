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
import * as DocumentPicker from 'expo-document-picker';

// ==================== إعدادات تليجرام ====================
const TELEGRAM_BOT_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_CHAT_ID = "1814331589";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ==================== دالة تحميل المنتجات ====================
const loadProducts = async () => {
  try {
    // في بيئة React Native، لازم نستخدم require للملفات المحلية
    const productsData = require('../data/products.json');
    return productsData;
  } catch (error) {
    console.error('خطأ في تحميل المنتجات:', error);
    return { categories: [] };
  }
};

// ==================== دالة تحليل النص واستخراج المنتجات ====================
const parseOrderText = (text, productsData) => {
  if (!text || !productsData) return [];
  
  const foundItems = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // البحث في كل أقسام المنتجات
  productsData.categories.forEach(category => {
    category.products.forEach(product => {
      // البحث عن اسم المنتج في النص
      const productName = product.name.toLowerCase();
      const brandName = product.brand.toLowerCase();
      
      if (text.toLowerCase().includes(productName) || text.toLowerCase().includes(brandName)) {
        // محاولة استخراج الكمية
        let quantity = 1;
        const quantityMatch = text.match(/(\d+)\s*(كيلو|لتر|جرام|علبة|قطعة|كجم)/i);
        if (quantityMatch) {
          quantity = parseInt(quantityMatch[1]);
        }
        
        foundItems.push({
          ...product,
          quantity,
          totalPrice: product.price * quantity
        });
      }
    });
  });
  
  // إزالة التكرارات (لو نفس المنتج ظهر أكتر من مرة)
  const uniqueItems = foundItems.filter((item, index, self) =>
    index === self.findIndex((t) => t.name === item.name && t.brand === item.brand)
  );
  
  return uniqueItems;
};

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
    // قراءة الملف الصوتي
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    
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
const formatReceipt = (customerInfo, orderItems, totalAmount) => {
  const date = new Date();
  const formattedDate = date.toLocaleDateString('ar-EG');
  const formattedTime = date.toLocaleTimeString('ar-EG');
  
  let receipt = `🧾 <b>فاتورة طلب Zayed-ID</b>\n`;
  receipt += `📅 ${formattedDate} - ${formattedTime}\n`;
  receipt += `──────────────────\n\n`;
  
  receipt += `👤 <b>معلومات العميل:</b>\n`;
  receipt += `📞 ${customerInfo.phone}\n`;
  receipt += `📍 ${customerInfo.address}\n\n`;
  
  receipt += `🛒 <b>المنتجات المطلوبة:</b>\n`;
  receipt += `──────────────────\n`;
  
  let total = 0;
  orderItems.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    receipt += `${index + 1}. ${item.brand} ${item.name}\n`;
    receipt += `   ${item.quantity} × ${item.size} = ${itemTotal.toFixed(2)} ج\n`;
  });
  
  receipt += `──────────────────\n`;
  receipt += `<b>الإجمالي: ${total.toFixed(2)} جنيه</b>\n\n`;
  
  receipt += `✅ تم استلام الطلب وجاري التجهيز\n`;
  receipt += `📢 سنقوم بالتواصل معك قريباً`;
  
  return receipt;
};

// ==================== المكون الرئيسي ====================
export default function OrderModule({ visible, onClose, userName = 'عميل' }) {
  // حالات الإدخال
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // حالات التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);
  
  // حالات التحميل
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [productsData, setProductsData] = useState(null);
  
  // تحميل بيانات المنتجات عند بدء التشغيل
  useEffect(() => {
    const loadData = async () => {
      const data = await loadProducts();
      setProductsData(data);
      
      // تحميل البيانات المحفوظة
      try {
        const savedPhone = await AsyncStorage.getItem('userPhone');
        const savedAddress = await AsyncStorage.getItem('userAddress');
        if (savedPhone) setPhoneNumber(savedPhone);
        if (savedAddress) setAddress(savedAddress);
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
      }
    };
    
    if (visible) {
      loadData();
    }
  }, [visible]);
  
  // حفظ البيانات عند التغيير
  const savePhoneNumber = async (value) => {
    setPhoneNumber(value);
    try {
      await AsyncStorage.setItem('userPhone', value);
    } catch (error) {
      console.error('خطأ في حفظ رقم الهاتف:', error);
    }
  };
  
  const saveAddress = async (value) => {
    setAddress(value);
    try {
      await AsyncStorage.setItem('userAddress', value);
    } catch (error) {
      console.error('خطأ في حفظ العنوان:', error);
    }
  };
  
  // تحليل النص عند الكتابة
  const handleOrderTextChange = (text) => {
    setOrderText(text);
    
    if (productsData && text.length > 3) {
      const items = parseOrderText(text, productsData);
      setOrderItems(items);
      
      const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
      setTotalAmount(total);
    }
  };
  
  // ========== دوال التسجيل الصوتي ==========
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
      
      // مؤقت لحساب مدة التسجيل (حد أقصى 60 ثانية)
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };
  
  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!recordingInstance) return;
    
    setIsRecording(false);
    setLoading(true);
    
    try {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setRecordingInstance(null);
      setRecordedUri(uri);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إيقاف التسجيل');
    }
    
    setLoading(false);
  };
  
  const deleteRecording = () => {
    setRecordedUri(null);
    setRecordingDuration(0);
  };
  
  // ========== إرسال الطلب ==========
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
      Alert.alert('تنبيه', 'لم يتم التعرف على أي منتجات. حاول كتابة الطلب بشكل أوضح');
      return;
    }
    
    setSending(true);
    
    try {
      // تنسيق الفاتورة
      const customerInfo = { phone: phoneNumber, address };
      const receipt = formatReceipt(customerInfo, orderItems, totalAmount);
      
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
        ToastAndroid.show(`تم استلام طلبك يا ${userName}! جاري التجهيز.`, ToastAndroid.LONG);
      } else {
        Alert.alert('تم', `تم استلام طلبك يا ${userName}! جاري التجهيز.`);
      }
      
      // إعادة تعيين النموذج
      setOrderText('');
      setOrderItems([]);
      setRecordedUri(null);
      setRecordingDuration(0);
      
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
                  <Text style={styles.headerTitle}>طلب جديد - Zayed-ID</Text>
                  <Text style={styles.headerSub}>املأ البيانات أدناه</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              {/* رقم التليفون */}
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
              
              {/* العنوان */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>📍 العنوان</Text>
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
                  placeholder="مثال: 2 كيلو رز الضحى، علبة تونة دولفين، زيت ذهبي"
                  placeholderTextColor="#9CA3AF"
                  value={orderText}
                  onChangeText={handleOrderTextChange}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              {/* منطقة التسجيل الصوتي */}
              <View style={styles.voiceSection}>
                <Text style={styles.label}>🎤 تسجيل صوتي (اختياري)</Text>
                
                {!recordedUri ? (
                  <TouchableOpacity
                    style={[
                      styles.voiceButton,
                      isRecording && styles.recordingActive
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                  >
                    <Ionicons
                      name={isRecording ? "stop-circle" : "mic-circle"}
                      size={48}
                      color={isRecording ? "#EF4444" : "#F59E0B"}
                    />
                    <Text style={styles.voiceButtonText}>
                      {isRecording ? `تسجيل... ${recordingDuration}s` : 'اضغط للتسجيل'}
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
                <Text style={styles.voiceHint}>أقصى مدة: 60 ثانية</Text>
              </View>
              
              {/* ملخص الطلب (المنتجات المعترف بها) */}
              {orderItems.length > 0 && (
                <View style={styles.orderSummary}>
                  <Text style={styles.summaryTitle}>📋 المنتجات المعترف بها:</Text>
                  
                  {orderItems.map((item, index) => (
                    <View key={index} style={styles.summaryItem}>
                      <Text style={styles.summaryItemName}>
                        {item.brand} {item.name}
                      </Text>
                      <Text style={styles.summaryItemDetails}>
                        {item.quantity} × {item.size} = {item.totalPrice.toFixed(2)} ج
                      </Text>
                    </View>
                  ))}
                  
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalText}>الإجمالي:</Text>
                    <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} جنيه</Text>
                  </View>
                </View>
              )}
              
              {/* زر الإرسال */}
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
                    <Text style={styles.submitButtonText}>إرسال الطلب</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  orderInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  voiceSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  voiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: '100%',
  },
  recordingActive: {
    backgroundColor: '#FEE2E2',
  },
  voiceButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  voiceHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  recordedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: '100%',
  },
  recordedText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  orderSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItemName: {
    fontSize: 14,
    color: '#1F2937',
    flex: 2,
  },
  summaryItemDetails: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 18,
  },
});
