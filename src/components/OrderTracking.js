import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = "https://zayedid-production.up.railway.app";

const fetchOrderStatusFromServer = async (orderId) => {
  try {
    const response = await fetch(`${SERVER_URL}/active-orders`);
    const data = await response.json();
    
    if (data.success && data.orders) {
      const order = data.orders.find(o => o.id === orderId);
      if (order) {
        return order;
      }
    }
    return null;
  } catch (error) {
    console.error('خطأ في جلب الحالة:', error);
    return null;
  }
};

const makePhoneCall = (phoneNumber) => {
  if (!phoneNumber) {
    Alert.alert('تنبيه', 'رقم المندوب غير متوفر');
    return;
  }
  
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  
  if (cleanNumber.length < 10) {
    Alert.alert('خطأ', 'رقم المندوب غير صحيح');
    return;
  }
  
  Linking.openURL(`tel:${cleanNumber}`).catch(() => {
    Alert.alert('خطأ', 'لا يمكن إجراء المكالمة');
  });
};

export default function OrderTracking({ visible, onClose, orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    if (visible && orderId) {
      loadOrderStatus();
      // تغيير وقت التحديث من 5 ثواني إلى 20 ثانية
      const interval = setInterval(loadOrderStatus, 20000);
      return () => clearInterval(interval);
    }
  }, [visible, orderId]);

  useEffect(() => {
    if (order?.status === 'تم التوصيل' && visible) {
      setShowThankYou(true);
      const timer = setTimeout(() => {
        setShowThankYou(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [order?.status, visible]);

  const loadOrderStatus = async () => {
    setLoading(true);
    setError(null);

    const orderData = await fetchOrderStatusFromServer(orderId);
    
    if (orderData) {
      setOrder(orderData);
    } else {
      setError('لا يمكن جلب الحالة');
    }

    setLoading(false);
  };

  const getStatusIcon = () => {
    if (!order) return 'help-outline';
    
    switch(order.status) {
      case 'تم استلام طلبك': return 'time-outline';
      case 'طلبك تحت التنفيذ': return 'construct-outline';
      case 'جاري التوصيل': return 'bicycle-outline';
      case 'تم التوصيل': return 'checkmark-done-circle-outline';
      default: return 'help-outline';
    }
  };

  const getStatusColor = () => {
    if (!order) return '#6B7280';
    
    switch(order.status) {
      case 'تم استلام طلبك': return '#F59E0B';
      case 'طلبك تحت التنفيذ': return '#3B82F6';
      case 'جاري التوصيل': return '#8B5CF6';
      case 'تم التوصيل': return '#10B981';
      default: return '#6B7280';
    }
  };

  if (showThankYou) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.thankYouOverlay}>
          <View style={styles.thankYouCard}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            <Text style={styles.thankYouTitle}>شكراً لاستخدامك</Text>
            <Text style={styles.thankYouSubtitle}>ZAYED ID</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={{ uri: 'https://img.icons8.com/color/96/000000/delivery--v1.png' }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.headerTitle}>تتبع الطلب</Text>
                <Text style={styles.headerSub}>طلب #{orderId?.slice(-6) || '---'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>جاري تحميل الحالة...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadOrderStatus}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          ) : order && (
            <ScrollView style={styles.body}>
              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, { backgroundColor: getStatusColor() + '20' }]}>
                  <Ionicons name={getStatusIcon()} size={48} color={getStatusColor()} />
                </View>
                <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
                  {order.status}
                </Text>
              </View>

              {/* عرض تفاصيل الفاتورة كاملة */}
              {(order.itemsPrice !== null || order.deliveryPrice !== null) && (
                <View style={styles.billCard}>
                  <Text style={styles.billTitle}>🧾 الفاتورة</Text>
                  {order.itemsPrice !== null && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>سعر الطلبات:</Text>
                      <Text style={styles.billValue}>{order.itemsPrice} ج</Text>
                    </View>
                  )}
                  {order.deliveryPrice !== null && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>خدمة التوصيل:</Text>
                      <Text style={styles.billValue}>{order.deliveryPrice} ج</Text>
                    </View>
                  )}
                  {order.totalPrice !== null && (
                    <View style={[styles.billRow, styles.billTotal]}>
                      <Text style={styles.billTotalLabel}>الإجمالي:</Text>
                      <Text style={styles.billTotalValue}>{order.totalPrice} ج</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>📍 العنوان</Text>
                <Text style={styles.detailText}>{order.address}</Text>
                
                {order.items && order.items.length > 0 && (
                  <>
                    <Text style={[styles.detailsTitle, { marginTop: 12 }]}>📝 التفاصيل</Text>
{order.items && Array.isArray(order.items) 
  ? order.items.map((item, index) => (
      <Text key={index} style={styles.detailText}>• {item}</Text>
    ))
  : order.items && typeof order.items === 'string'
    ? <Text style={styles.detailText}>• {order.items}</Text>
    : null
}
                  </>
                )}
              </View>

              {order.driverPhone && (
                <TouchableOpacity style={styles.contactButton} onPress={() => makePhoneCall(order.driverPhone)}>
                  <Ionicons name="call" size={24} color="#FFF" />
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactButtonText}>اتصل بالمندوب</Text>
                    <Text style={styles.contactButtonSubText}>{order.driverPhone}</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.refreshButton} onPress={loadOrderStatus}>
                <Ionicons name="refresh" size={18} color="#F59E0B" />
                <Text style={styles.refreshButtonText}>تحديث</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  headerSub: { fontSize: 12, color: '#6B7280' },
  closeBtn: { padding: 8, borderRadius: 20, backgroundColor: '#FEE2E2' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { marginTop: 12, fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  body: { flex: 1, padding: 20 },
  statusCard: { alignItems: 'center', padding: 20, backgroundColor: '#F9FAFB', borderRadius: 16, marginBottom: 16 },
  statusIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusTitle: { fontSize: 20, fontWeight: 'bold' },
  billCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B' },
  billTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400E', marginBottom: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 14, color: '#4B5563' },
  billValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  billTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  billTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  billTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  detailsCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 },
  detailsTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  contactButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
    elevation: 3,
  },
  contactTextContainer: { alignItems: 'flex-start' },
  contactButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  contactButtonSubText: { color: '#FFF', fontSize: 12, opacity: 0.9 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6, marginBottom: 20 },
  refreshButtonText: { color: '#F59E0B', fontSize: 14, fontWeight: '600' },
  thankYouOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  thankYouCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 40, alignItems: 'center', elevation: 10 },
  thankYouTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 16 },
  thankYouSubtitle: { fontSize: 18, color: '#F59E0B', marginTop: 4 },
});
