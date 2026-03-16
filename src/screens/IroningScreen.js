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

const IMAGE_CONFIG = { CONTAINER_SIZE: 42, ICON_SIZE: 20, BORDER_RADIUS: 6, MARGIN_BOTTOM: 6, PLACEHOLDER_BG: '#EFF6FF', ICON_COLOR: '#3B82F6' };

export default function IroningScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [deliveryFee, setDeliveryFee] = useState('20');
  const [notes, setNotes] = useState('');
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
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_NAME,
        [Query.equal('isActive', true), Query.orderAsc('name')]
      );
      setItems(response.documents);
      const initial = {};
      response.documents.forEach(item => { initial[item.$id] = { iron: 0, clean: 0 }; });
      setQuantities(initial);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
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

  const updateQuantity = (itemId, type, delta) => {
    setQuantities(prev => {
      const current = prev[itemId]?.[type] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [itemId]: { ...prev[itemId], [type]: newQty } };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      const qty = quantities[item.$id] || { iron: 0, clean: 0 };
      total += (qty.iron * (item.ironPrice || 0)) + (qty.clean * (item.cleanPrice || 0));
    });
    return total;
  };

  const getTotalPieces = () => {
    let pieces = 0;
    items.forEach(item => {
      const qty = quantities[item.$id] || { iron: 0, clean: 0 };
      pieces += qty.iron + qty.clean;
    });
    return pieces;
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('خطأ', 'يجب السماح بالتسجيل'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync();
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (error) { Alert.alert('خطأ', 'فشل بدء التسجيل'); }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      setRecordedUri(recording.getURI());
      setRecording(null);
      Alert.alert('✅ تم', 'تم التسجيل');
    } catch (error) { Alert.alert('خطأ', 'فشل حفظ التسجيل'); }
  };

  const playRecording = async () => {
    if (!recordedUri) return;
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setIsPlaying(false); });
    } catch (error) { Alert.alert('خطأ', 'فشل تشغيل التسجيل'); }
  };

  const deleteRecording = () => {
    setRecordedUri(null);
    setRecordingDuration(0);
    if (sound) { sound.unloadAsync(); setSound(null); setIsPlaying(false); }
  };

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const sendOrder = async () => {
    if (!phoneNumber.trim()) { Alert.alert('تنبيه', 'رقم الموبايل مطلوب'); return; }
    if (!address.trim()) { Alert.alert('تنبيه', 'العنوان مطلوب'); return; }
    if (getTotalPieces() === 0) { Alert.alert('تنبيه', 'اختر قطعة واحدة على الأقل'); return; }

    setSending(true);
    try {
      let voiceUrl = null;
      if (recordedUri) {
        setUploadingVoice(true);
        const uploadResult = await uploadVoiceFile(recordedUri);
        setUploadingVoice(false);
        if (uploadResult.success) voiceUrl = uploadResult.fileUrl;
      }

      const itemsList = [];
      items.forEach(item => {
        const qty = quantities[item.$id] || { iron: 0, clean: 0 };
        if (qty.iron > 0) itemsList.push(`${item.name} (كي فقط) x${qty.iron} = ${qty.iron * item.ironPrice} ج`);
        if (qty.clean > 0) itemsList.push(`${item.name} (غسيل وكوي) x${qty.clean} = ${qty.clean * item.cleanPrice} ج`);
      });

      const totalPrice = calculateTotal();
      const finalTotal = totalPrice + parseFloat(deliveryFee || 0);

      const orderData = {
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: 'laundry',
        serviceName: 'مكوجي',
        items: itemsList,
        totalPrice,
        deliveryFee: parseFloat(deliveryFee || 0),
        finalTotal,
        notes,
        voiceUrl,
      };

      const result = await createOrder(orderData);
      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);
        Alert.alert('✅ تم إرسال الطلب', `الإجمالي: ${finalTotal} ج`, [
          { text: 'متابعة التسوق', onPress: () => {
            const reset = {};
            items.forEach(item => { reset[item.$id] = { iron: 0, clean: 0 }; });
            setQuantities(reset);
            setNotes('');
            setRecordedUri(null);
            navigation.popToTop();
          }},
          { text: 'طلباتي', onPress: () => navigation.navigate('MyOrders') }
        ]);
      } else { Alert.alert('خطأ', result.error); }
    } catch (error) { Alert.alert('خطأ', 'حدث خطأ'); } finally { setSending(false); }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مكوجي</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بيانات العميل</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={18} color="#3B82F6" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="رقم الموبايل" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" editable={!sending} />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={18} color="#EF4444" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="العنوان" value={address} onChangeText={setAddress} editable={!sending} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧺 اختر الملابس</Text>
          {items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="shirt-outline" size={50} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد أصناف</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {items.map((item) => (
                <View key={item.$id} style={styles.itemCard}>
                  <View style={styles.imageContainer}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.itemImage, styles.placeholderImage]}>
                        <Ionicons name="shirt-outline" size={IMAGE_CONFIG.ICON_SIZE} color={IMAGE_CONFIG.ICON_COLOR} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceLabel}>كي فقط</Text>
                    <Text style={styles.servicePrice}>{item.ironPrice} ج</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity style={[styles.counterBtn, styles.minusBtn]} onPress={() => updateQuantity(item.$id, 'iron', -1)} disabled={sending}>
                        <Ionicons name="remove" size={12} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{quantities[item.$id]?.iron || 0}</Text>
                      <TouchableOpacity style={[styles.counterBtn, styles.plusBtn]} onPress={() => updateQuantity(item.$id, 'iron', 1)} disabled={sending}>
                        <Ionicons name="add" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.serviceRow, styles.serviceRowLast]}>
                    <Text style={styles.serviceLabel}>غسيل وكوي</Text>
                    <Text style={styles.servicePrice}>{item.cleanPrice} ج</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity style={[styles.counterBtn, styles.minusBtn]} onPress={() => updateQuantity(item.$id, 'clean', -1)} disabled={sending}>
                        <Ionicons name="remove" size={12} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{quantities[item.$id]?.clean || 0}</Text>
                      <TouchableOpacity style={[styles.counterBtn, styles.plusBtn]} onPress={() => updateQuantity(item.$id, 'clean', 1)} disabled={sending}>
                        <Ionicons name="add" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 التوصيل</Text>
          <View style={styles.deliveryContainer}>
            <Text style={styles.deliveryLabel}>تكلفة التوصيل:</Text>
            <TextInput style={styles.deliveryInput} value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="numeric" editable={!sending} />
            <Text style={styles.deliveryCurrency}>ج</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 تسجيل صوتي</Text>
          {!recordedUri ? (
            <TouchableOpacity style={[styles.voiceButton, isRecording && styles.recordingButton]} onPress={isRecording ? stopRecording : startRecording} disabled={sending}>
              <Ionicons name={isRecording ? "stop" : "mic"} size={18} color={isRecording ? "#FFF" : "#3B82F6"} />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>{isRecording ? `تسجيل... ${formatTime(recordingDuration)}` : 'تسجيل'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity style={[styles.recordAction, styles.playButton]} onPress={playRecording} disabled={sending}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#FFF" />
                <Text style={styles.recordActionText}>{isPlaying ? 'إيقاف' : 'استماع'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recordAction, styles.deleteButton]} onPress={deleteRecording} disabled={sending}>
                <Ionicons name="trash" size={16} color="#FFF" />
                <Text style={styles.recordActionText}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 ملاحظات</Text>
          <TextInput style={styles.notesInput} placeholder="أي ملاحظات..." value={notes} onChangeText={setNotes} multiline editable={!sending} />
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>إجمالي الأصناف:</Text><Text style={styles.totalValue}>{calculateTotal()} ج</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>التوصيل:</Text><Text style={styles.totalValue}>{parseFloat(deliveryFee)} ج</Text></View>
          <View style={[styles.totalRow, styles.finalTotal]}><Text style={styles.finalTotalLabel}>الإجمالي:</Text><Text style={styles.finalTotalValue}>{calculateTotal() + parseFloat(deliveryFee)} ج</Text></View>
        </View>

        <TouchableOpacity style={[styles.sendButton, (sending || getTotalPieces() === 0) && styles.disabled]} onPress={sendOrder} disabled={sending || getTotalPieces() === 0}>
          {sending ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.sendButtonText}>إرسال الطلب</Text><Ionicons name="paper-plane" size={14} color="#FFF" /></>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 12, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  scrollContent: { padding: 12, paddingBottom: 24 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 8, paddingHorizontal: 8 },
  inputIcon: { marginRight: 6 },
  input: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#1F2937' },
  emptyItems: { alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1 },
  emptyText: { marginTop: 6, fontSize: 13, color: '#1F2937', fontWeight: '600' },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  itemCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  imageContainer: { width: IMAGE_CONFIG.CONTAINER_SIZE, height: IMAGE_CONFIG.CONTAINER_SIZE, borderRadius: IMAGE_CONFIG.BORDER_RADIUS, alignSelf: 'center', marginBottom: IMAGE_CONFIG.MARGIN_BOTTOM, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  itemImage: { width: '100%', height: '100%' },
  placeholderImage: { backgroundColor: IMAGE_CONFIG.PLACEHOLDER_BG, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 6, textAlign: 'center' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 1, paddingVertical: 2 },
  serviceRowLast: { marginBottom: 0 },
  serviceLabel: { fontSize: 9, color: '#6B7280', width: 55 },
  servicePrice: { fontSize: 9, fontWeight: '600', color: '#3B82F6', width: 30, textAlign: 'right' },
  counter: { flexDirection: 'row', alignItems: 'center' },
  counterBtn: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  minusBtn: { backgroundColor: '#EF4444' },
  plusBtn: { backgroundColor: '#3B82F6' },
  counterValue: { fontSize: 11, fontWeight: '600', color: '#1F2937', marginHorizontal: 2, minWidth: 15, textAlign: 'center' },
  deliveryContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  deliveryLabel: { fontSize: 12, color: '#1F2937', flex: 1 },
  deliveryInput: { fontSize: 12, color: '#1F2937', textAlign: 'right', minWidth: 45 },
  deliveryCurrency: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  voiceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, gap: 6 },
  recordingButton: { backgroundColor: '#EF4444' },
  voiceButtonText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  recordingText: { color: '#FFF' },
  recordedControls: { flexDirection: 'row', gap: 8 },
  recordAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, gap: 4 },
  playButton: { backgroundColor: '#3B82F6' },
  deleteButton: { backgroundColor: '#EF4444' },
  recordActionText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  notesInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 12, minHeight: 60, textAlignVertical: 'top' },
  totalSection: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 12, color: '#4B5563' },
  totalValue: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  finalTotal: { borderTopWidth: 1, borderTopColor: '#3B82F6', paddingTop: 6, marginTop: 2 },
  finalTotalLabel: { fontSize: 13, fontWeight: 'bold', color: '#1F2937' },
  finalTotalValue: { fontSize: 14, fontWeight: 'bold', color: '#3B82F6' },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, gap: 6, marginTop: 4 },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});
