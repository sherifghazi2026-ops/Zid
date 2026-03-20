import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabaseClient';
import { getOrders, startDelivery, completeDelivery, assignDriver, ORDER_STATUS } from '../../services/orderService';
import { playNotificationSound, stopNotificationSound } from '../../utils/SoundHelper';
import useInterval from '../../hooks/useInterval';

export default function DriverDashboard({ navigation }) {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [playingVoice, setPlayingVoice] = useState(null);
  const [sound, setSound] = useState(null);
  const lastAvailableOrderIds = useRef(new Set());

  useEffect(() => {
    loadDriverData();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (driverData) loadOrders();
  }, [driverData, activeTab]);

  useInterval(() => {
    if (driverData && activeTab === 'available') checkForNewAvailableOrders();
  }, 7000);

  const playVoice = async (voiceUrl) => {
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: voiceUrl }, { shouldPlay: true });
      setSound(newSound);
      setPlayingVoice(voiceUrl);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPlayingVoice(null); });
    } catch (error) { console.error('خطأ في تشغيل الصوت:', error); }
  };

  const loadDriverData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) setDriverData(JSON.parse(data));
  };

  const checkForNewAvailableOrders = async () => {
    try {
      const result = await getOrders({ status: ORDER_STATUS.READY, notDriverId: driverData?.$id || driverData?.id });
      if (result.success) {
        const available = result.data.filter(order => !order.driver_id);
        const newOrderIds = new Set(available.map(o => o.id || o.$id).filter(id => id));
        const hasNewOrder = [...newOrderIds].some(id => !lastAvailableOrderIds.current.has(id));
        if (hasNewOrder && available.length > 0) playNotificationSound();
        lastAvailableOrderIds.current = newOrderIds;
        if (activeTab === 'available') setAvailableOrders(available);
      }
    } catch (error) { console.error('خطأ في التحقق من الطلبات:', error); }
  };

  const loadOrders = async () => {
    try {
      if (activeTab === 'available') {
        const result = await getOrders({ status: ORDER_STATUS.READY, notDriverId: driverData?.$id || driverData?.id });
        if (result.success) {
          const available = result.data.filter(order => !order.driver_id);
          setAvailableOrders(available);
          lastAvailableOrderIds.current = new Set(available.map(o => o.id || o.$id).filter(id => id));
        }
      } else if (activeTab === 'my') {
        const result = await getOrders({ driverId: driverData?.$id || driverData?.id, status: [ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.ON_THE_WAY] });
        if (result.success) setMyOrders(result.data);
      } else {
        const result = await getOrders({ driverId: driverData?.$id || driverData?.id, status: ORDER_STATUS.DELIVERED });
        if (result.success) setCompletedOrders(result.data);
      }
    } catch (error) { console.error('Error loading orders:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleAcceptOrder = (order) => {
    Alert.alert('قبول التوصيل', 'هل تريد توصيل هذا الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'قبول',
        onPress: async () => {
          const result = await assignDriver(order.id || order.$id, driverData.$id || driverData.id, driverData.name || driverData.full_name, driverData.phone);
          if (result.success) {
            stopNotificationSound();
            Alert.alert('✅ تم', 'تم قبول التوصيل');
            loadOrders();
          } else Alert.alert('خطأ', result.error);
        }
      }
    ]);
  };

  const handleStartDelivery = async (orderId) => {
    Alert.alert('بدء التوصيل', 'هل أنت في طريقك لتوصيل الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'بدء', onPress: async () => { const result = await startDelivery(orderId); if (result.success) loadOrders(); else Alert.alert('خطأ', result.error); } }
    ]);
  };

  const handleCompleteDelivery = async (orderId) => {
    Alert.alert('تأكيد التسليم', 'هل تم تسليم الطلب للعميل؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم، تم', onPress: async () => { const result = await completeDelivery(orderId); if (result.success) { Alert.alert('✅ تم', 'تم تسليم الطلب'); loadOrders(); } else Alert.alert('خطأ', result.error); } }
    ]);
  };

  const makePhoneCall = (phone) => Linking.openURL(`tel:${phone}`);

  const formatAddress = (address) => address?.length > 30 ? address.substring(0, 30) + '...' : address || '';

  const onRefresh = () => { setRefreshing(true); loadOrders(); };

  const renderOrderCard = (order, type) => {
    const isAvailable = type === 'available';
    const isMyOrder = type === 'my';
    const orderId = order.id || order.$id;
    const displayId = orderId ? String(orderId).slice(-6) : '000000';
    return (
      <View key={orderId} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>طلب #{displayId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}><Text style={[styles.statusText, { color: '#10B981' }]}>{order.service_name}</Text></View>
        </View>
        <View style={styles.orderDetails}>
          <TouchableOpacity style={styles.detailRow} onPress={() => makePhoneCall(order.customer_phone)}><Ionicons name="call-outline" size={16} color="#3B82F6" /><Text style={styles.detailText}>العميل: {order.customer_phone}</Text></TouchableOpacity>
          {order.merchant_name && (<TouchableOpacity style={styles.detailRow} onPress={() => makePhoneCall(order.merchant_phone)}><Ionicons name="business-outline" size={16} color="#F59E0B" /><Text style={styles.detailText}>تاجر: {order.merchant_place || order.merchant_name}</Text></TouchableOpacity>)}
          <View style={styles.detailRow}><Ionicons name="location-outline" size={16} color="#6B7280" /><Text style={styles.detailText}>{formatAddress(order.customer_address)}</Text></View>
          {order.description && (<View style={styles.detailRow}><Ionicons name="document-text-outline" size={16} color="#6B7280" /><Text style={styles.detailText} numberOfLines={2}>{order.description}</Text></View>)}
          {order.voice_url && (<TouchableOpacity style={styles.voiceButton} onPress={() => playVoice(order.voice_url)}><Ionicons name={playingVoice === order.voice_url ? "pause" : "play"} size={20} color="#FFF" /><Text style={styles.voiceButtonText}>{playingVoice === order.voice_url ? 'جاري التشغيل' : 'استمع للتسجيل'}</Text></TouchableOpacity>)}
          {order.image_urls?.length > 0 && (<View style={styles.imageIndicator}><Ionicons name="images-outline" size={16} color="#4F46E5" /><Text style={styles.imageText}>{order.image_urls.length} صورة مرفقة</Text></View>)}
          {order.final_total > 0 && (<View style={styles.priceContainer}><Text style={styles.priceLabel}>الإجمالي:</Text><Text style={styles.priceValue}>{order.final_total} ج</Text><Text style={styles.paymentMethod}>نقداً</Text></View>)}
        </View>
        {isAvailable && (<TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={() => handleAcceptOrder(order)}><Ionicons name="checkmark-circle" size={18} color="#FFF" /><Text style={styles.actionButtonText}>قبول التوصيل</Text></TouchableOpacity>)}
        {isMyOrder && order.status === ORDER_STATUS.DRIVER_ASSIGNED && (<TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3B82F6' }]} onPress={() => handleStartDelivery(orderId)}><Ionicons name="bicycle" size={18} color="#FFF" /><Text style={styles.actionButtonText}>بدء التوصيل</Text></TouchableOpacity>)}
        {isMyOrder && order.status === ORDER_STATUS.ON_THE_WAY && (<TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={() => handleCompleteDelivery(orderId)}><Ionicons name="checkmark-done" size={18} color="#FFF" /><Text style={styles.actionButtonText}>تم التوصيل</Text></TouchableOpacity>)}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>مرحباً، {driverData?.name || driverData?.full_name || 'مندوب'}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}><Ionicons name="person-circle" size={40} color="#4F46E5" /></TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.activeTab]} onPress={() => setActiveTab('available')}><Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>متاحة ({availableOrders.length})</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'my' && styles.activeTab]} onPress={() => setActiveTab('my')}><Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>طلباتي ({myOrders.length})</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.activeTab]} onPress={() => setActiveTab('completed')}><Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>منتهية ({completedOrders.length})</Text></TouchableOpacity>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.ordersContainer}>
        {activeTab === 'available' && (availableOrders.length === 0 ? <View style={styles.emptyContainer}><Ionicons name="bicycle-outline" size={80} color="#E5E7EB" /><Text style={styles.emptyText}>لا توجد طلبات متاحة</Text></View> : availableOrders.map(order => renderOrderCard(order, 'available')))}
        {activeTab === 'my' && (myOrders.length === 0 ? <View style={styles.emptyContainer}><Ionicons name="time-outline" size={80} color="#E5E7EB" /><Text style={styles.emptyText}>لا توجد طلبات حالية</Text></View> : myOrders.map(order => renderOrderCard(order, 'my')))}
        {activeTab === 'completed' && (completedOrders.length === 0 ? <View style={styles.emptyContainer}><Ionicons name="checkmark-done-circle" size={80} color="#E5E7EB" /><Text style={styles.emptyText}>لا توجد طلبات سابقة</Text></View> : completedOrders.map(order => renderOrderCard(order, 'completed')))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  welcome: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20, marginHorizontal: 2 },
  activeTab: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 12, color: '#6B7280' },
  activeTabText: { color: '#FFF', fontWeight: '600' },
  ordersContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  orderCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  detailText: { fontSize: 14, color: '#4B5563', flex: 1 },
  voiceButton: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 6, marginTop: 8, gap: 4 },
  voiceButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  imageIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  imageText: { fontSize: 12, color: '#4F46E5' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 4 },
  priceLabel: { fontSize: 14, color: '#4B5563' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  paymentMethod: { fontSize: 12, color: '#10B981' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
