import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const SERVER_URL = 'https://zayedid-production.up.railway.app';

const ITEM_TYPES = [
  { id: 'shirt', name: 'قميص', ironPrice: 10, cleanPrice: 15, icon: 'shirt-outline', color: '#3B82F6' },
  { id: 'pants', name: 'بنطلون', ironPrice: 10, cleanPrice: 15, icon: 'layers-outline', color: '#10B981' },
  { id: 'suit', name: 'بدلة', ironPrice: 70, cleanPrice: 90, icon: 'tie', isMCI: true, color: '#8B5CF6' },
  { id: 'dress', name: 'فستان', ironPrice: 25, cleanPrice: 35, icon: 'woman-outline', color: '#EC4899' },
  { id: 'jacket', name: 'جاكت', ironPrice: 30, cleanPrice: 40, icon: 'business-outline', color: '#F59E0B' },
  { id: 'blouse', name: 'بلوزة', ironPrice: 15, cleanPrice: 20, icon: 'shirt', color: '#EF4444' },
];

export default function IroningScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('جنة 2');
  const [ironCart, setIronCart] = useState({});
  const [cleanCart, setCleanCart] = useState({});
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    if (savedPhone) setPhoneNumber(savedPhone);
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedAddress) setAddress(savedAddress);
  };

  const updateIronCart = (id, delta) => {
    setIronCart(prev => {
      const currentQty = prev[id] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const updateCleanCart = (id, delta) => {
    setCleanCart(prev => {
      const currentQty = prev[id] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    ITEM_TYPES.forEach(item => {
      const ironQty = ironCart[item.id] || 0;
      const cleanQty = cleanCart[item.id] || 0;
      total += ironQty * item.ironPrice;
      total += cleanQty * item.cleanPrice;
    });
    return total;
  };

  const totalItems = () => {
    let total = 0;
    ITEM_TYPES.forEach(item => {
      total += (ironCart[item.id] || 0) + (cleanCart[item.id] || 0);
    });
    return total;
  };

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

  const sendOrder = async () => {
    if (!phoneNumber) return Alert.alert('تنبيه', 'أدخل رقم الموبايل');
    if (totalItems() === 0) return Alert.alert('تنبيه', 'أضف أصنافاً أولاً');

    setLoading(true);
    try {
      let voiceUrl = null;
      if (recordedUri) {
        voiceUrl = await uploadVoice(recordedUri);
      }

      let itemsDetail = [];
      ITEM_TYPES.forEach(item => {
        const ironQty = ironCart[item.id] || 0;
        const cleanQty = cleanCart[item.id] || 0;
        if (ironQty > 0) itemsDetail.push(`${item.name} (كوي فقط) x${ironQty}`);
        if (cleanQty > 0) itemsDetail.push(`${item.name} (غسيل وكوي) x${cleanQty}`);
      });

      const orderData = {
        phone: phoneNumber,
        address: address,
        items: itemsDetail,
        rawText: notes,
        voiceUrl: voiceUrl,
        serviceName: 'مكوجي',
        totalPrice: calculateTotal()
      };

      console.log('📤 إرسال طلب مكوجي:', orderData);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>خدمة المكوجي</Text>
          <Text style={styles.headerSub}>اختر قطع الملابس والخدمة</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <View style={styles.inputRow}>
            <Ionicons name="call" size={20} color="#F59E0B" />
            <TextInput
              style={styles.textInput}
              placeholder="رقم الموبايل"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.inputRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
            <Ionicons name="location" size={20} color="#F59E0B" />
            <TextInput
              style={styles.textInput}
              placeholder="عنوان التوصيل"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        <View style={styles.grid}>
          {ITEM_TYPES.map((item) => {
            const ironQty = ironCart[item.id] || 0;
            const cleanQty = cleanCart[item.id] || 0;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                  {item.isMCI ? (
                    <MaterialCommunityIcons name={item.icon} size={30} color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={30} color={item.color} />
                  )}
                </View>
                <Text style={styles.itemName}>{item.name}</Text>

                <View style={styles.serviceRow}>
                  <Text style={styles.serviceLabel}>كوي فقط</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity onPress={() => updateIronCart(item.id, 1)} style={styles.countBtn}>
                      <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{ironQty}</Text>
                    <TouchableOpacity onPress={() => updateIronCart(item.id, -1)} style={[styles.countBtn, { backgroundColor: '#E5E7EB' }]}>
                      <Ionicons name="remove" size={16} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>{item.ironPrice}ج</Text>
                </View>

                <View style={[styles.serviceRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }]}>
                  <Text style={styles.serviceLabel}>غسيل وكوي</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity onPress={() => updateCleanCart(item.id, 1)} style={styles.countBtn}>
                      <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{cleanQty}</Text>
                    <TouchableOpacity onPress={() => updateCleanCart(item.id, -1)} style={[styles.countBtn, { backgroundColor: '#E5E7EB' }]}>
                      <Ionicons name="remove" size={16} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>{item.cleanPrice}ج</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.voiceSection}>
          <Text style={styles.voiceTitle}>🎤 مذكرة صوتية (اختياري)</Text>

          {!recordedUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={uploadingVoice}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={24}
                color={isRecording ? "#FFF" : "#F59E0B"}
              />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? 'جاري التسجيل... اضغط للإيقاف' : 'اضغط للتسجيل'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity style={styles.recordAction} onPress={() => {}} disabled={uploadingVoice}>
                <Ionicons name="play" size={24} color="#3B82F6" />
                <Text style={styles.recordActionText}>استماع</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recordAction, styles.deleteAction]} onPress={() => setRecordedUri(null)} disabled={uploadingVoice}>
                <Ionicons name="trash" size={24} color="#EF4444" />
                <Text style={[styles.recordActionText, styles.deleteText]}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingVoice && <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>}
        </View>

        <TextInput
          style={styles.notesInput}
          placeholder="ملاحظات إضافية (اختياري)"
          multiline
          value={notes}
          onChangeText={setNotes}
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      {totalItems() > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>إجمالي الطلب</Text>
            <Text style={styles.totalAmount}>{calculateTotal()} ج</Text>
            <Text style={styles.totalItems}>عدد القطع: {totalItems()}</Text>
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={sendOrder} disabled={loading || uploadingVoice}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={styles.sendBtnText}>إرسال الطلب</Text>
                <Ionicons name="paper-plane" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 3
  },
  backBtn: { marginLeft: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', textAlign: 'right' },
  headerSub: { fontSize: 13, color: '#6B7280', textAlign: 'right' },
  scrollContent: { padding: 15 },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12 },
  textInput: { flex: 1, textAlign: 'right', marginRight: 10, fontSize: 15 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  itemCard: {
    width: (width - 45) / 2,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2
  },
  iconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  serviceRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2
  },
  serviceLabel: { fontSize: 10, color: '#6B7280', width: 50 },
  counter: { flexDirection: 'row', alignItems: 'center' },
  countBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' },
  countText: { marginHorizontal: 6, fontWeight: 'bold', fontSize: 12, minWidth: 15, textAlign: 'center' },
  itemPrice: { fontSize: 12, fontWeight: '600', color: '#F59E0B', width: 35, textAlign: 'left' },
  voiceSection: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  voiceTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 10, textAlign: 'right' },
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
  voiceButtonText: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  recordingText: { color: '#FFF' },
  recordedControls: { flexDirection: 'row', justifyContent: 'space-around', gap: 10 },
  recordAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, gap: 6 },
  deleteAction: { backgroundColor: '#FEE2E2' },
  recordActionText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  deleteText: { color: '#EF4444' },
  uploadingText: { textAlign: 'center', color: '#F59E0B', marginTop: 5, fontSize: 12 },
  notesInput: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 35
  },
  totalInfo: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, color: '#6B7280' },
  totalAmount: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  totalItems: { fontSize: 12, color: '#9CA3AF' },
  sendBtn: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignItems: 'center',
    gap: 10
  },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
