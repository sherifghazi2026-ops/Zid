import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID, ORDERS_COLLECTION_ID } from '../../appwrite/config';
import { ORDER_STATUS } from '../../services/orderService';

export default function OrderTracking({ navigation, route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrder = async () => {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        orderId
      );
      setOrder(response);
    } catch (error) {
      console.error('خطأ في جلب الطلب:', error);
    } finally {
      setLoading(false);
    }
  };

  const makePhoneCall = (phone) => {
    if (!phone) {
      Alert.alert('تنبيه', 'رقم الهاتف غير متوفر');
      return;
    }
    Linking.openURL(`tel:${phone}`);
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

  const getStatusStep = (status) => {
    const steps = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.ON_THE_WAY,
      ORDER_STATUS.DELIVERED
    ];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>الطلب غير موجود</Text>
      </View>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع الطلب #{orderId ? String(orderId).slice(-6) : "000000"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* الحالة الحالية */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Ionicons name={getStatusIcon(order.status)} size={40} color={getStatusColor(order.status)} />
          </View>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusText(order.status)}
          </Text>
        </View>

        {/* شريط التقدم */}
        <View style={styles.timeline}>
          {[ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED].map((status, index) => (
            <View key={status} style={styles.timelineItem}>
              <View style={[
                styles.timelineDot,
                index <= currentStep && styles.timelineDotActive,
                { backgroundColor: index <= currentStep ? getStatusColor(status) : '#E5E7EB' }
              ]}>
                {index < currentStep && (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                )}
              </View>
              {index < 4 && (
                <View style={[
                  styles.timelineLine,
                  index < currentStep && styles.timelineLineActive,
                  { backgroundColor: index < currentStep ? getStatusColor(ORDER_STATUS.ACCEPTED) : '#E5E7EB' }
                ]} />
              )}
            </View>
          ))}
        </View>

        {/* معلومات الطلب */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 تفاصيل الطلب</Text>
          <View style={styles.infoCard}>
            <Text style={styles.serviceName}>{order.serviceName}</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.infoLabel}>رقم العميل:</Text>
              <TouchableOpacity onPress={() => makePhoneCall(order.customerPhone)}>
                <Text style={[styles.infoValue, styles.phoneLink]}>{order.customerPhone}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text style={styles.infoLabel}>العنوان:</Text>
              <Text style={styles.infoValue}>{order.customerAddress}</Text>
            </View>

            {order.items && order.items.length > 0 && (
              <View style={styles.itemsContainer}>
                <Text style={styles.itemsTitle}>المنتجات:</Text>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.itemText}>• {item}</Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* الفاتورة */}
        {order.totalPrice > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 الفاتورة</Text>
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>قيمة الطلب:</Text>
                <Text style={styles.invoiceValue}>{order.totalPrice} ج</Text>
              </View>
              
              {order.deliveryFee > 0 && (
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>تكلفة التوصيل:</Text>
                  <Text style={styles.invoiceValue}>{order.deliveryFee} ج</Text>
                </View>
              )}
              
              <View style={styles.invoiceTotal}>
                <Text style={styles.totalLabel}>الإجمالي:</Text>
                <Text style={styles.totalValue}>{order.finalTotal || order.totalPrice} ج</Text>
              </View>
            </View>
          </View>
        )}

        {/* معلومات التاجر */}
        {order.merchantName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏪 معلومات التاجر</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="business-outline" size={20} color="#F59E0B" />
                <Text style={styles.contactName}>{order.merchantName}</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => makePhoneCall(order.merchantPhone)}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={styles.contactButtonText}>اتصل بالتاجر</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* معلومات المندوب */}
        {order.driverName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚚 معلومات المندوب</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="bicycle-outline" size={20} color="#3B82F6" />
                <Text style={styles.contactName}>{order.driverName}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.contactButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => makePhoneCall(order.driverPhone)}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={styles.contactButtonText}>اتصل بالمندوب</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#EF4444' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  content: { padding: 20 },
  
  // الحالة
  statusCard: { alignItems: 'center', marginBottom: 24 },
  statusIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: '600' },
  
  // شريط التقدم
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, paddingHorizontal: 10 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  timelineDotActive: { borderWidth: 2, borderColor: '#FFF' },
  timelineLine: { height: 2, flex: 1, marginHorizontal: 4 },
  timelineLineActive: {},
  
  // الأقسام
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  
  // بطاقة المعلومات
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  infoValue: { fontSize: 14, color: '#1F2937', flex: 1 },
  phoneLink: { color: '#3B82F6', textDecorationLine: 'underline' },
  itemsContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  itemsTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  
  // الفاتورة
  invoiceCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceLabel: { fontSize: 14, color: '#92400E' },
  invoiceValue: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  invoiceTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#92400E' },
  
  // بطاقة التواصل
  contactCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  contactButton: { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  contactButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
