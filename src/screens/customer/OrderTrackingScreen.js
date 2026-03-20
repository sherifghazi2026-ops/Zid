import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { ORDER_STATUS, cancelOrder } from '../../services/orderService';
import { fontFamily } from '../../utils/fonts';

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [sound, setSound] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      const formattedOrder = {
        $id: data.id, id: data.id, customer_name: data.customer_name,
        customer_phone: data.customer_phone, customer_address: data.customer_address,
        service_type: data.service_type, service_name: data.service_name,
        items: data.items || [], description: data.description || '',
        raw_text: data.raw_text, status: data.status,
        total_price: data.total_price, subtotal: data.subtotal,
        delivery_fee: data.delivery_fee, final_total: data.final_total,
        notes: data.notes, voice_url: data.voice_url, image_urls: data.image_urls || [],
        merchant_id: data.merchant_id, merchant_name: data.merchant_name,
        merchant_place: data.merchant_place, merchant_phone: data.merchant_phone,
        driver_id: data.driver_id, driver_name: data.driver_name,
        driver_phone: data.driver_phone, payment_method: data.payment_method,
        created_at: data.created_at, accepted_at: data.accepted_at,
        delivered_at: data.delivered_at, cancelled_at: data.cancelled_at,
        cancellation_reason: data.cancellation_reason,
      };
      if (isMounted.current) setOrder(formattedOrder);
      if (formattedOrder.service_type) {
        const { data: svc } = await supabase
          .from(TABLES.SERVICES)
          .select('tracking_image')
          .eq('id', formattedOrder.service_type)
          .single();
        if (svc) setServiceData(svc);
      }
    } catch (error) { console.error('خطأ في جلب الطلب:', error); }
    finally { if (isMounted.current) setLoading(false); }
  };

  const makePhoneCall = (phone) => { if (phone) Linking.openURL(`tel:${phone}`); };
  
  const playVoice = async (voiceUrl) => {
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: voiceUrl }, { shouldPlay: true });
      setSound(newSound);
      setPlayingVoice(voiceUrl);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPlayingVoice(null); });
    } catch (error) { Alert.alert('خطأ', 'فشل تشغيل التسجيل الصوتي'); }
  };

  const handleCancelOrder = () => {
    if (!order || order.status !== ORDER_STATUS.PENDING) {
      Alert.alert('تنبيه', 'لا يمكن إلغاء هذا الطلب الآن');
      return;
    }

    Alert.alert(
      'إلغاء الطلب',
      'هل أنت متأكد من إلغاء هذا الطلب؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم، إلغاء',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await cancelOrder(order.id, 'تم الإلغاء بواسطة العميل');
              if (result.success) {
                Alert.alert('✅ تم', 'تم إلغاء الطلب بنجاح');
                loadOrder();
              } else {
                Alert.alert('خطأ', result.error || 'فشل في إلغاء الطلب');
              }
            } catch (error) {
              Alert.alert('خطأ', 'حدث خطأ أثناء إلغاء الطلب');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return 'time-outline';
      case ORDER_STATUS.ACCEPTED: return 'checkmark-circle-outline';
      case ORDER_STATUS.PREPARING: return 'restaurant-outline';
      case ORDER_STATUS.ON_THE_WAY: return 'bicycle-outline';
      case ORDER_STATUS.DELIVERED: return 'checkmark-done-circle-outline';
      case ORDER_STATUS.CANCELLED: return 'close-circle-outline';
      default: return 'help-outline';
    }
  };
  const getStatusColor = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return '#F59E0B';
      case ORDER_STATUS.ACCEPTED: return '#3B82F6';
      case ORDER_STATUS.PREPARING: return '#8B5CF6';
      case ORDER_STATUS.ON_THE_WAY: return '#3B82F6';
      case ORDER_STATUS.DELIVERED: return '#10B981';
      case ORDER_STATUS.CANCELLED: return '#EF4444';
      default: return '#6B7280';
    }
  };
  const getStatusText = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return 'في انتظار القبول';
      case ORDER_STATUS.ACCEPTED: return 'تم قبول الطلب';
      case ORDER_STATUS.PREPARING: return 'جاري التجهيز';
      case ORDER_STATUS.ON_THE_WAY: return 'في الطريق إليك';
      case ORDER_STATUS.DELIVERED: return 'تم التوصيل';
      case ORDER_STATUS.CANCELLED: return 'تم الإلغاء';
      default: return status;
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  if (!order) return <View style={styles.center}><Text>الطلب غير موجود</Text></View>;

  const displayOrderId = order.id || order.$id || orderId;
  const orderDisplay = displayOrderId ? String(displayOrderId).slice(-6) : '000000';
  const isPending = order.status === ORDER_STATUS.PENDING;
  const trackingImage = serviceData?.tracking_image;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={28} color="#1F2937" /></TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع الطلب #{orderDisplay}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isPending && trackingImage ? (
          <View style={styles.trackingContainer}>
            <Image source={{ uri: trackingImage }} style={styles.trackingImage} resizeMode="cover" />
            <View style={styles.statusTextOverlay}><Text style={[styles.statusTextOverlayContent, { fontFamily: fontFamily.arabic }]}>{getStatusText(order.status)}</Text></View>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Ionicons name={getStatusIcon(order.status)} size={40} color={getStatusColor(order.status)} />
            </View>
            <Text style={[styles.statusText, { color: getStatusColor(order.status), fontFamily: fontFamily.arabic }]}>{getStatusText(order.status)}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>📋 تفاصيل الطلب</Text>
          <View style={styles.infoCard}>
            <Text style={[styles.serviceName, { fontFamily: fontFamily.arabic }]}>{order.merchant_place || order.merchant_name || order.service_name}</Text>
            <View style={styles.infoRow}><Ionicons name="call-outline" size={18} /><Text style={styles.infoLabel}>رقم العميل:</Text><TouchableOpacity onPress={() => makePhoneCall(order.customer_phone)}><Text style={[styles.infoValue, styles.phoneLink]}>{order.customer_phone}</Text></TouchableOpacity></View>
            <View style={styles.infoRow}><Ionicons name="location-outline" size={18} /><Text style={styles.infoLabel}>العنوان:</Text><Text style={styles.infoValue}>{order.customer_address}</Text></View>
            {order.items?.length > 0 && (<View style={styles.itemsContainer}><Text style={styles.itemsTitle}>المنتجات:</Text>{order.items.map((item, i) => <Text key={i} style={styles.itemText}>• {item}</Text>)}</View>)}
            {order.voice_url && (<TouchableOpacity style={styles.voiceButton} onPress={() => playVoice(order.voice_url)}><Ionicons name={playingVoice === order.voice_url ? "pause" : "play"} size={20} color="#FFF" /><Text style={styles.voiceButtonText}>{playingVoice === order.voice_url ? 'جاري التشغيل' : 'استمع للتسجيل'}</Text></TouchableOpacity>)}
          </View>
        </View>
        
        {order.total_price > 0 && (<View style={styles.section}><Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>💰 الفاتورة</Text><View style={styles.invoiceCard}><View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>قيمة الطلب:</Text><Text style={styles.invoiceValue}>{order.total_price} ج</Text></View>{order.delivery_fee > 0 && (<View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>تكلفة التوصيل:</Text><Text style={styles.invoiceValue}>{order.delivery_fee} ج</Text></View>)}<View style={styles.invoiceTotal}><Text style={styles.totalLabel}>الإجمالي:</Text><Text style={styles.totalValue}>{order.final_total || order.total_price} ج</Text></View></View></View>)}
        
        {order.merchant_name && (<View style={styles.section}><Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>🏪 معلومات التاجر</Text><View style={styles.contactCard}><View style={styles.contactRow}><Ionicons name="business-outline" size={20} color="#F59E0B" /><Text style={styles.contactName}>{order.merchant_place || order.merchant_name}</Text></View>{order.merchant_phone && (<TouchableOpacity style={styles.contactButton} onPress={() => makePhoneCall(order.merchant_phone)}><Ionicons name="call" size={18} color="#FFF" /><Text style={styles.contactButtonText}>اتصل بالتاجر</Text></TouchableOpacity>)}</View></View>)}
        
        {order.driver_name && (<View style={styles.section}><Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>🚚 معلومات المندوب</Text><View style={[styles.contactCard, { borderColor: '#3B82F6' }]}><View style={styles.contactRow}><Ionicons name="bicycle-outline" size={20} color="#3B82F6" /><Text style={styles.contactName}>{order.driver_name}</Text></View>{order.driver_phone && (<TouchableOpacity style={[styles.contactButton, { backgroundColor: '#3B82F6' }]} onPress={() => makePhoneCall(order.driver_phone)}><Ionicons name="call" size={18} color="#FFF" /><Text style={styles.contactButtonText}>اتصل بالمندوب</Text></TouchableOpacity>)}</View></View>)}

        {/* زر إلغاء الطلب في آخر الشاشة */}
        {isPending && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.disabled]}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {/* مسافة في نهاية الشاشة */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  content: { padding: 20 },
  statusCard: { alignItems: 'center', padding: 20, borderRadius: 12, marginBottom: 20 },
  statusIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusText: { fontSize: 18, fontWeight: '600' },
  trackingContainer: { width: '100%', height: 120, borderRadius: 12, marginBottom: 20, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6' },
  trackingImage: { width: '100%', height: '100%' },
  statusTextOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, alignItems: 'center' },
  statusTextOverlayContent: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    gap: 8,
  },
  cancelButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  infoValue: { fontSize: 14, color: '#1F2937', flex: 1 },
  phoneLink: { color: '#3B82F6', textDecorationLine: 'underline' },
  itemsContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  itemsTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  voiceButton: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 6, marginTop: 8, gap: 4 },
  voiceButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  invoiceCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceLabel: { fontSize: 14, color: '#92400E' },
  invoiceValue: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  invoiceTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#92400E' },
  contactCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  contactButton: { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  contactButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
