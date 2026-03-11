import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { ORDER_STATUS } from '../../services/orderService';

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 5000); // تحديث كل 5 ثواني
    return () => clearInterval(interval);
  }, []);

  const loadOrder = async () => {
    try {
      const doc = await databases.getDocument(
        DATABASE_ID,
        'orders',
        orderId
      );
      setOrder(doc);
    } catch (error) {
      console.error('خطأ في جلب الطلب:', error);
    } finally {
      setLoading(false);
    }
  };

  const makePhoneCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusIcon = (status) => {
    const icons = {
      [ORDER_STATUS.PENDING]: 'time-outline',
      [ORDER_STATUS.ACCEPTED]: 'checkmark-circle-outline',
      [ORDER_STATUS.PREPARING]: 'restaurant-outline',
      [ORDER_STATUS.PRICE_SET]: 'pricetag-outline',
      [ORDER_STATUS.READY]: 'checkmark-done-circle-outline',
      [ORDER_STATUS.DRIVER_ASSIGNED]: 'person-outline',
      [ORDER_STATUS.ON_THE_WAY]: 'bicycle-outline',
      [ORDER_STATUS.DELIVERED]: 'checkmark-done-circle-outline',
      [ORDER_STATUS.CANCELLED]: 'close-circle-outline',
    };
    return icons[status] || 'help-outline';
  };

  const getStatusColor = (status) => {
    const colors = {
      [ORDER_STATUS.PENDING]: '#F59E0B',
      [ORDER_STATUS.ACCEPTED]: '#3B82F6',
      [ORDER_STATUS.PREPARING]: '#8B5CF6',
      [ORDER_STATUS.PRICE_SET]: '#10B981',
      [ORDER_STATUS.READY]: '#10B981',
      [ORDER_STATUS.DRIVER_ASSIGNED]: '#3B82F6',
      [ORDER_STATUS.ON_THE_WAY]: '#3B82F6',
      [ORDER_STATUS.DELIVERED]: '#10B981',
      [ORDER_STATUS.CANCELLED]: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusText = (status) => {
    const texts = {
      [ORDER_STATUS.PENDING]: 'في انتظار تاجر',
      [ORDER_STATUS.ACCEPTED]: 'تم قبول الطلب',
      [ORDER_STATUS.PREPARING]: 'جاري التجهيز',
      [ORDER_STATUS.PRICE_SET]: 'تم تحديد السعر',
      [ORDER_STATUS.READY]: 'الطلب جاهز',
      [ORDER_STATUS.DRIVER_ASSIGNED]: 'تم تعيين مندوب',
      [ORDER_STATUS.ON_THE_WAY]: 'المندوب في الطريق',
      [ORDER_STATUS.DELIVERED]: 'تم التوصيل',
      [ORDER_STATUS.CANCELLED]: 'تم الإلغاء',
    };
    return texts[status] || status;
  };

  const getStepNumber = (status) => {
    const steps = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.ON_THE_WAY,
      ORDER_STATUS.DELIVERED,
    ];
    const index = steps.indexOf(status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>الطلب غير موجود</Text>
      </View>
    );
  }

  const currentStep = getStepNumber(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع الطلب</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* حالة الطلب الحالية */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Ionicons name={getStatusIcon(order.status)} size={50} color={getStatusColor(order.status)} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
            <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
          </View>
        </View>

        {/* شريط التقدم */}
        <View style={styles.timeline}>
          {[
            { status: ORDER_STATUS.ACCEPTED, label: 'قبول' },
            { status: ORDER_STATUS.PREPARING, label: 'تجهيز' },
            { status: ORDER_STATUS.READY, label: 'جاهز' },
            { status: ORDER_STATUS.ON_THE_WAY, label: 'توصيل' },
            { status: ORDER_STATUS.DELIVERED, label: 'تم' },
          ].map((step, index) => {
            const isCompleted = currentStep > index + 1;
            const isCurrent = currentStep === index + 1;
            
            return (
              <View key={step.status} style={styles.timelineItem}>
                <View style={[
                  styles.timelineDot,
                  isCompleted && styles.timelineDotCompleted,
                  isCurrent && styles.timelineDotCurrent,
                ]}>
                  {isCompleted && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                <Text style={[
                  styles.timelineLabel,
                  (isCompleted || isCurrent) && styles.timelineLabelActive
                ]}>
                  {step.label}
                </Text>
                {index < 4 && (
                  <View style={[
                    styles.timelineLine,
                    index < currentStep && styles.timelineLineActive,
                  ]} />
                )}
              </View>
            );
          })}
        </View>

        {/* معلومات الطلب */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#4F46E5" />
              <Text style={styles.infoLabel}>رقم الهاتف:</Text>
              <Text style={styles.infoValue}>{order.customerPhone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#EF4444" />
              <Text style={styles.infoLabel}>العنوان:</Text>
              <Text style={styles.infoValue}>{order.customerAddress}</Text>
            </View>
          </View>
        </View>

        {/* المنتجات */}
        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المنتجات</Text>
            <View style={styles.itemsCard}>
              {order.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>• {item}</Text>
              ))}
            </View>
          </View>
        )}

        {/* معلومات التاجر */}
        {order.merchantName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التاجر</Text>
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
            <Text style={styles.sectionTitle}>المندوب</Text>
            <View style={[styles.contactCard, { borderColor: '#3B82F6' }]}>
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

        {/* السعر */}
        {order.totalPrice > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>السعر</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>قيمة الطلب:</Text>
                <Text style={styles.priceValue}>{order.totalPrice} ج</Text>
              </View>
              {order.deliveryFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>توصيل:</Text>
                  <Text style={styles.priceValue}>{order.deliveryFee} ج</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>الإجمالي:</Text>
                <Text style={styles.totalValue}>{order.finalTotal || order.totalPrice} ج</Text>
              </View>
            </View>
          </View>
        )}

        {/* تاريخ الطلب */}
        <View style={styles.section}>
          <Text style={styles.dateText}>
            تاريخ الطلب: {new Date(order.createdAt).toLocaleString('ar-EG')}
          </Text>
          {order.deliveredAt && (
            <Text style={styles.dateText}>
              تم التوصيل: {new Date(order.deliveredAt).toLocaleString('ar-EG')}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  errorText: { fontSize: 16, color: '#EF4444' },
  content: { padding: 16 },

  // حالة الطلب
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusInfo: { marginLeft: 16, flex: 1 },
  statusText: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  orderId: { fontSize: 14, color: '#6B7280' },

  // شريط التقدم
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  timelineItem: { alignItems: 'center', flex: 1, position: 'relative' },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineDotCompleted: { backgroundColor: '#10B981' },
  timelineDotCurrent: { 
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  timelineLabel: { fontSize: 10, color: '#9CA3AF' },
  timelineLabelActive: { color: '#1F2937', fontWeight: '600' },
  timelineLine: {
    position: 'absolute',
    top: 11,
    right: -50,
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  timelineLineActive: { backgroundColor: '#10B981' },

  // الأقسام
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },

  // البطاقات
  infoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  infoValue: { fontSize: 14, color: '#1F2937', flex: 1 },

  itemsCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  itemText: { fontSize: 14, color: '#4B5563', marginBottom: 6 },

  contactCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  contactButton: { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  contactButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  priceCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#92400E' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#92400E' },

  dateText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
});
