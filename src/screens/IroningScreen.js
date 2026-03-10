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
import { Audio } from 'expo-av'; // ✅ تم التحديث من expo-av إلى expo-av
import { createOrder, uploadFile, SERVICE_TYPES } from '../services/orderService';
import { getActiveLaundryItems } from '../services/laundryService';
import { playSendSound } from '../utils/SoundHelper';

const { width } = Dimensions.get('window');

export default function IroningScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ironCart, setIronCart] = useState({});
  const [cleanCart, setCleanCart] = useState({});
  const [sending, setSending] = useState(false);
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

  useEffect(() => {
    loadSavedData();
    loadItems();
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

  const loadItems = async () => {
    const result = await getActiveLaundryItems();
    if (result.success) {
      setItems(result.data);
    }
    setLoading(false);
  };

  const updateIronCart = (itemId, delta) => {
    setIronCart(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const updateCleanCart = (itemId, delta) => {
    setCleanCart(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      total += (ironCart[item.id] || 0) * item.ironPrice;
      total += (cleanCart[item.id] || 0) * item.cleanPrice;
    });
    return total;
  };

  const totalItems = () => {
    let total = 0;
    items.forEach(item => {
      total += (ironCart[item.id] || 0) + (cleanCart[item.id] || 0);
    });
    return total;
  };

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
    if (!phoneNumber) return Alert.alert('تنبيه', 'أدخل رقم الموبايل');
    if (totalItems() === 0) return Alert.alert('تنبيه', 'أضف أصنافاً أولاً');

    setSending(true);
    try {
      let voiceFileId = null;
      if (recordedUri) {
        setUploadingVoice(true);
        const uploadResult = await uploadFile(recordedUri, `voice_${Date.now()}.m4a`);
        if (uploadResult.success) voiceFileId = uploadResult.fileId;
        setUploadingVoice(false);
      }

      const itemsDetail = [];
      items.forEach(item => {
        const ironQty = ironCart[item.id] || 0;
        const cleanQty = cleanCart[item.id] || 0;
        if (ironQty > 0) itemsDetail.push(`${item.name} (كوي فقط) x${ironQty}`);
        if (cleanQty > 0) itemsDetail.push(`${item.name} (غسيل وكوي) x${cleanQty}`);
      });

      if (notes) itemsDetail.push(`ملاحظات: ${notes}`);

      const result = await createOrder({
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: SERVICE_TYPES.IRONING,
        serviceName: 'مكوجي',
        items: itemsDetail,
        totalPrice: calculateTotal(),
        notes,
        voiceFileId,
      });

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);
        await playSendSound(); // ✅ صوت عند الإرسال
        Alert.alert('✅ تم بنجاح', 'تم إرسال طلبك', [{ text: 'ممتاز', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('⚠️', result.error);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

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
              style={[styles.textInput, { color: '#1F2937' }]}
              placeholder="رقم الموبايل"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.inputRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
            <Ionicons name="location" size={20} color="#F59E0B" />
            <TextInput
              style={[styles.textInput, { color: '#1F2937' }]}
              placeholder="عنوان التوصيل"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={60} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أصناف متاحة حالياً</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => {
              const ironQty = ironCart[item.id] || 0;
              const cleanQty = cleanCart[item.id] || 0;
              return (
                <View key={item.$id} style={styles.itemCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: '#F59E0B20' }]}>
                      <Ionicons name="shirt-outline" size={30} color="#F59E0B" />
                    </View>
                  )}
                  <Text style={[styles.itemName, { color: '#1F2937' }]}>{item.name}</Text>

                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceLabel}>كوي فقط</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity onPress={() => updateIronCart(item.id, 1)} style={styles.countBtn}>
                        <Ionicons name="add" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={[styles.countText, { color: '#1F2937' }]}>{ironQty}</Text>
                      <TouchableOpacity onPress={() => updateIronCart(item.id, -1)} style={[styles.countBtn, { backgroundColor: '#E5E7EB' }]}>
                        <Ionicons name="remove" size={16} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.itemPrice, { color: '#F59E0B' }]}>{item.ironPrice}ج</Text>
                  </View>

                  <View style={[styles.serviceRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }]}>
                    <Text style={styles.serviceLabel}>غسيل وكوي</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity onPress={() => updateCleanCart(item.id, 1)} style={styles.countBtn}>
                        <Ionicons name="add" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={[styles.countText, { color: '#1F2937' }]}>{cleanQty}</Text>
                      <TouchableOpacity onPress={() => updateCleanCart(item.id, -1)} style={[styles.countBtn, { backgroundColor: '#E5E7EB' }]}>
                        <Ionicons name="remove" size={16} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.itemPrice, { color: '#F59E0B' }]}>{item.cleanPrice}ج</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.voiceSection}>
          <Text style={[styles.voiceTitle, { color: '#1F2937' }]}>🎤 تسجيل صوتي (اختياري)</Text>

          {!recordedUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={uploadingVoice || sending}
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
                disabled={uploadingVoice || sending}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFF" />
                <Text style={styles.recordActionText}>{isPlaying ? 'جاري التشغيل' : 'استماع'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordAction, styles.deleteAction]}
                onPress={deleteRecording}
                disabled={uploadingVoice || sending}
              >
                <Ionicons name="trash" size={24} color="#FFF" />
                <Text style={styles.recordActionText}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingVoice && <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>}
        </View>

        <TextInput
          style={[styles.notesInput, { color: '#1F2937' }]}
          placeholder="ملاحظات إضافية (اختياري)"
          placeholderTextColor="#9CA3AF"
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
            <Text style={[styles.totalAmount, { color: '#1F2937' }]}>{calculateTotal()} ج</Text>
            <Text style={styles.totalItems}>عدد القطع: {totalItems()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (sending || uploadingVoice) && styles.disabled]}
            onPress={sendOrder}
            disabled={sending || uploadingVoice}
          >
            {sending ? <ActivityIndicator color="#FFF" /> : (
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 3,
  },
  backBtn: { marginLeft: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', textAlign: 'right' },
  headerSub: { fontSize: 13, color: '#6B7280', textAlign: 'right' },
  scrollContent: { padding: 15 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 5, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12 },
  textInput: { flex: 1, textAlign: 'right', marginRight: 10, fontSize: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
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
    elevation: 2,
  },
  itemImage: { width: 60, height: 60, borderRadius: 30, marginBottom: 10 },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  serviceRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 2 },
  serviceLabel: { fontSize: 10, color: '#6B7280', width: 50 },
  counter: { flexDirection: 'row', alignItems: 'center' },
  countBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' },
  countText: { marginHorizontal: 6, fontWeight: 'bold', fontSize: 12, minWidth: 15, textAlign: 'center' },
  itemPrice: { fontSize: 12, fontWeight: '600', width: 35, textAlign: 'left' },
  voiceSection: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  voiceTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10, textAlign: 'right' },
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
  notesInput: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80 },
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
    paddingBottom: 35,
  },
  totalInfo: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, color: '#6B7280' },
  totalAmount: { fontSize: 22, fontWeight: 'bold' },
  totalItems: { fontSize: 12, color: '#9CA3AF' },
  sendBtn: { backgroundColor: '#F59E0B', flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 25, borderRadius: 15, alignItems: 'center', gap: 10 },
  disabled: { opacity: 0.6 },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
