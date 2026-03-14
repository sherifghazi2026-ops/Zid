import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';
import { createOrder } from '../services/orderService';
import { uploadVoiceFile } from '../services/uploadService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const COLLECTION_NAME = 'laundry_items';

export default function IroningScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [deliveryFee, setDeliveryFee] = useState('20');
  const [notes, setNotes] = useState('');

  // حالات التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadItems();
    loadSavedData();
    
    return () => {
      if (sound) sound.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadItems = async () => {
    try {
      console.log('🔍 جلب أصناف المكوجي من Appwrite...');
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_NAME,
        [Query.equal('isActive', true), Query.orderAsc('name')]
      );
      
      console.log(`✅ تم جلب ${response.documents.length} صنف`);
      setItems(response.documents);
      
      // تهيئة الكميات
      const initialQuantities = {};
      response.documents.forEach(item => {
        initialQuantities[item.$id] = { iron: 0, clean: 0 };
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('❌ خطأ في جلب الأصناف:', error);
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('zayed_phone');
      const savedAddress = await AsyncStorage.getItem('zayed_address');
      if (savedPhone) setPhoneNumber(savedPhone);
      if (savedAddress) setAddress(savedAddress);
    } catch (error) {
      console.log('خطأ في تحميل البيانات المحفوظة');
    }
  };

  const updateQuantity = (itemId, type, delta) => {
    setQuantities(prev => {
      const currentQty = prev[itemId]?.[type] || 0;
      const newQty = Math.max(0, currentQty + delta);
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [type]: newQty
        }
      };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      const itemQty = quantities[item.$id] || { iron: 0, clean: 0 };
      total += (itemQty.iron * (item.ironPrice || 0)) || 0;
      total += (itemQty.clean * (item.cleanPrice || 0)) || 0;
    });
    return total;
  };

  const getTotalPieces = () => {
    let pieces = 0;
    items.forEach(item => {
      const itemQty = quantities[item.$id] || { iron: 0, clean: 0 };
      pieces += itemQty.iron || 0;
      pieces += itemQty.clean || 0;
    });
    return pieces;
  };

  // دوال التسجيل الصوتي
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بتسجيل الصوت');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync();
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (error) {
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'رقم الموبايل مطلوب');
      return;
    }
    if (!address.trim()) {
      Alert.alert('تنبيه', 'العنوان مطلوب');
      return;
    }
    if (getTotalPieces() === 0) {
      Alert.alert('تنبيه', 'اختر على الأقل قطعة واحدة');
      return;
    }

    setSending(true);

    try {
      let voiceUrl = null;
      if (recordedUri) {
        setUploadingVoice(true);
        const uploadResult = await uploadVoiceFile(recordedUri);
        setUploadingVoice(false);
        if (uploadResult.success) voiceUrl = uploadResult.fileUrl;
      }

      // تجهيز تفاصيل الطلب
      const itemsList = [];
      items.forEach(item => {
        const itemQty = quantities[item.$id] || { iron: 0, clean: 0 };
        if (itemQty.iron > 0) {
          itemsList.push(`${item.name} (كي فقط) x${itemQty.iron} = ${itemQty.iron * item.ironPrice} ج`);
        }
        if (itemQty.clean > 0) {
          itemsList.push(`${item.name} (غسيل وكوي) x${itemQty.clean} = ${itemQty.clean * item.cleanPrice} ج`);
        }
      });

      const totalPrice = calculateTotal();
      const finalTotal = totalPrice + parseFloat(deliveryFee || 0);

      const orderData = {
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: 'laundry',
        serviceName: 'مكوجي',
        items: itemsList,
        totalPrice: totalPrice,
        deliveryFee: parseFloat(deliveryFee || 0),
        finalTotal: finalTotal,
        notes: notes,
        voiceUrl: voiceUrl,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);

        Alert.alert(
          '✅ تم إرسال الطلب',
          `الإجمالي: ${finalTotal} ج`,
          [
            { 
              text: 'متابعة التسوق', 
              onPress: () => {
                // إعادة تعيين الكميات
                const resetQuantities = {};
                items.forEach(item => {
                  resetQuantities[item.$id] = { iron: 0, clean: 0 };
                });
                setQuantities(resetQuantities);
                setNotes('');
                setRecordedUri(null);
                navigation.popToTop();
              }
            },
            { text: 'طلباتي', onPress: () => navigation.navigate('MyOrders') }
          ]
        );
      } else {
        Alert.alert('خطأ', result.error || 'فشل في إرسال الطلب');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>جاري تحميل الأصناف...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مكوجي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* بيانات العميل */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بيانات العميل</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#3B82F6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="رقم الموبايل"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!sending}
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#EF4444" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="العنوان"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              editable={!sending}
            />
          </View>
        </View>

        {/* الأصناف من Appwrite */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧺 اختر الملابس</Text>
          
          {items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="shirt-outline" size={60} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد أصناف متاحة</Text>
              <Text style={styles.emptySubText}>يرجى إضافة أصناف من لوحة التحكم</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {items.map((item) => (
                <View key={item.$id} style={styles.itemCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.placeholderImage]}>
                      <Ionicons name="shirt-outline" size={30} color="#3B82F6" />
                    </View>
                  )}
                  
                  <Text style={styles.itemName}>{item.name}</Text>
                  
                  {/* كوي فقط */}
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceLabel}>كي فقط</Text>
                    <Text style={styles.servicePrice}>{item.ironPrice} ج</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={[styles.counterBtn, styles.minusBtn]}
                        onPress={() => updateQuantity(item.$id, 'iron', -1)}
                        disabled={sending}
                      >
                        <Ionicons name="remove" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>
                        {quantities[item.$id]?.iron || 0}
                      </Text>
                      <TouchableOpacity
                        style={[styles.counterBtn, styles.plusBtn]}
                        onPress={() => updateQuantity(item.$id, 'iron', 1)}
                        disabled={sending}
                      >
                        <Ionicons name="add" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* غسيل وكوي */}
                  <View style={[styles.serviceRow, styles.serviceRowLast]}>
                    <Text style={styles.serviceLabel}>غسيل وكوي</Text>
                    <Text style={styles.servicePrice}>{item.cleanPrice} ج</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={[styles.counterBtn, styles.minusBtn]}
                        onPress={() => updateQuantity(item.$id, 'clean', -1)}
                        disabled={sending}
                      >
                        <Ionicons name="remove" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>
                        {quantities[item.$id]?.clean || 0}
                      </Text>
                      <TouchableOpacity
                        style={[styles.counterBtn, styles.plusBtn]}
                        onPress={() => updateQuantity(item.$id, 'clean', 1)}
                        disabled={sending}
                      >
                        <Ionicons name="add" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* التوصيل */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 التوصيل</Text>
          <View style={styles.deliveryContainer}>
            <Text style={styles.deliveryLabel}>تكلفة التوصيل:</Text>
            <TextInput
              style={styles.deliveryInput}
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              keyboardType="numeric"
              editable={!sending}
            />
            <Text style={styles.deliveryCurrency}>ج</Text>
          </View>
        </View>

        {/* التسجيل الصوتي */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 تسجيل صوتي (اختياري)</Text>
          
          {!recordedUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={sending || uploadingVoice}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={24}
                color={isRecording ? "#FFF" : "#3B82F6"}
              />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? `تسجيل... ${formatTime(recordingDuration)}` : 'اضغط للتسجيل'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity
                style={[styles.recordAction, styles.playButton]}
                onPress={playRecording}
                disabled={sending || uploadingVoice}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFF" />
                <Text style={styles.recordActionText}>
                  {isPlaying ? 'جاري التشغيل' : 'استماع'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordAction, styles.deleteButton]}
                onPress={deleteRecording}
                disabled={sending || uploadingVoice}
              >
                <Ionicons name="trash" size={20} color="#FFF" />
                <Text style={styles.recordActionText}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {uploadingVoice && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>
            </View>
          )}
        </View>

        {/* ملاحظات */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 ملاحظات (اختياري)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="أي ملاحظات إضافية..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!sending}
          />
        </View>

        {/* الإجمالي */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>إجمالي الأصناف:</Text>
            <Text style={styles.totalValue}>{calculateTotal()} ج</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>تكلفة التوصيل:</Text>
            <Text style={styles.totalValue}>{parseFloat(deliveryFee || 0)} ج</Text>
          </View>
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>الإجمالي الكلي:</Text>
            <Text style={styles.finalTotalValue}>
              {calculateTotal() + parseFloat(deliveryFee || 0)} ج
            </Text>
          </View>
        </View>

        {/* زر الإرسال */}
        <TouchableOpacity
          style={[styles.sendButton, (sending || uploadingVoice || getTotalPieces() === 0) && styles.disabled]}
          onPress={sendOrder}
          disabled={sending || uploadingVoice || getTotalPieces() === 0}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.sendButtonText}>إرسال الطلب</Text>
              <Ionicons name="paper-plane" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1F2937' },
  emptyItems: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: { marginTop: 8, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#6B7280' },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
    paddingVertical: 4,
  },
  serviceRowLast: {
    marginBottom: 0,
  },
  serviceLabel: {
    fontSize: 11,
    color: '#6B7280',
    width: 65,
  },
  servicePrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    width: 35,
    textAlign: 'right',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusBtn: {
    backgroundColor: '#EF4444',
  },
  plusBtn: {
    backgroundColor: '#3B82F6',
  },
  counterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 4,
    minWidth: 18,
    textAlign: 'center',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deliveryLabel: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  deliveryInput: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'right',
    minWidth: 60,
  },
  deliveryCurrency: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  voiceButtonText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  recordingText: {
    color: '#FFF',
  },
  recordedControls: {
    flexDirection: 'row',
    gap: 12,
  },
  recordAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  playButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  recordActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totalSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: '#3B82F6',
    paddingTop: 8,
    marginTop: 4,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
