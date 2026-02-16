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
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (data.success && data.orders) {
        const order = data.orders.find(o => o.id === orderId);
        if (order) {
          return {
            status: order.status,
            driverPhone: order.driverPhone || null,
            items: order.items || [],
            address: order.address || 'غير محدد',
            // الفاتورة (قيم ثابتة للتجربة - ممكن تجيبها من السيرفر)
            totalBill: 150,
            deliveryCost: 20
          };
        }
      }
    } catch (e) {
      console.log('السيرفر مش شغال حالياً');
    }
    return null;
  } catch (error) {
    console.error('خطأ في جلب الحالة:', error);
    return null;
  }
};

const fetchOrderStatusFromStorage = async (orderId) => {
  try {
    const savedOrders = await AsyncStorage.getItem('user_orders');
    if (savedOrders) {
      const orders = JSON.parse(savedOrders);
      const order = orders.find(o => o.id === orderId);
      return order ? { 
        status: order.status,
        driverPhone: order.driverPhone || null,
        items: order.items || [],
        address: order.address || 'غير محدد',
        totalBill: 150,
        deliveryCost: 20
      } : null;
    }
  } catch (error) {
    console.error('خطأ في التخزين المحلي:', error);
  }
  return null;
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
  const [status, setStatus] = useState('جديد');
  const [driverPhone, setDriverPhone] = useState(null);
  const [items, setItems] = useState([]);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // قيم الفاتورة
  const deliveryCost = 20;
  const totalBill = 150;
  const grandTotal = deliveryCost + totalBill;

  useEffect(() => {
    if (visible && orderId) {
      loadOrderStatus();
      const interval = setInterval(loadOrderStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [visible, orderId]);

  const loadOrderStatus = async () => {
    setLoading(true);
    setError(null);

    const serverData = await fetchOrderStatusFromServer(orderId);
    
    if (serverData) {
      setStatus(serverData.status);
      setDriverPhone(serverData.driverPhone);
      setItems(serverData.items || []);
      setAddress(serverData.address);
    } else {
      const storageData = await fetchOrderStatusFromStorage(orderId);
      if (storageData) {
        setStatus(storageData.status);
        setDriverPhone(storageData.driverPhone);
        setItems(storageData.items || []);
        setAddress(storageData.address);
      } else {
        setError('لا يمكن جلب الحالة');
      }
    }

    setLoading(false);
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'جديد': return 'time-outline';
      case 'جاري تجهيز الطلب': return 'construct-outline';
      case 'جاري التوصيل': return 'bicycle-outline';
      case 'تم التوصيل': return 'checkmark-done-circle-outline';
      default: return 'help-outline';
    }
  };

  const getStatusColor = () => {
    switch(status) {
      case 'جديد': return '#F59E0B';
      case 'جاري تجهيز الطلب': return '#F59E0B';
      case 'جاري التوصيل': return '#3B82F6';
      case 'تم التوصيل': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusMessage = () => {
    switch(status) {
      case 'جديد':
        return 'تم استلام طلبك وجاري تجهيزه';
      case 'جاري تجهيز الطلب':
        return 'جاري تحضير الطلب';
      case 'جاري التوصيل':
        return 'المندوب في الطريق إليك 🚚';
      case 'تم التوصيل':
        return 'تم توصيل الطلب بنجاح ✅';
      default:
        return 'جاري تحديث الحالة';
    }
  };

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
          ) : (
            <ScrollView style={styles.body}>
              {/* حالة الطلب */}
              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, { backgroundColor: getStatusColor() + '20' }]}>
                  <Ionicons name={getStatusIcon()} size={48} color={getStatusColor()} />
                </View>
                <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
                  {status}
                </Text>
                <Text style={styles.statusMessage}>
                  {getStatusMessage()}
                </Text>
              </View>

              {/* الفاتورة - تظهر للعميل هنا */}
              <View style={styles.billCard}>
                <Text style={styles.billTitle}>💰 الفاتورة</Text>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>الأسعار:</Text>
                  <Text style={styles.billValue}>{totalBill} ج</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>خدمة التوصيل:</Text>
                  <Text style={styles.billValue}>{deliveryCost} ج</Text>
                </View>
                <View style={[styles.billRow, styles.billTotal]}>
                  <Text style={styles.billTotalLabel}>الإجمالي:</Text>
                  <Text style={styles.billTotalValue}>{grandTotal} ج</Text>
                </View>
              </View>

              {/* خط زمني للحالة */}
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: status !== 'جديد' ? '#10B981' : '#F59E0B' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>تم استلام الطلب</Text>
                    <Text style={styles.timelineTime}>قيد المعالجة</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot,
                    { backgroundColor: status === 'جاري التوصيل' || status === 'تم التوصيل' ? '#10B981' : '#D1D5DB' }
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>جاري التوصيل</Text>
                    <Text style={styles.timelineTime}>
                      {status === 'جاري التوصيل' ? 'المندوب في الطريق' : 'في انتظار التوصيل'}
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot,
                    { backgroundColor: status === 'تم التوصيل' ? '#10B981' : '#D1D5DB' }
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>تم التوصيل</Text>
                    <Text style={styles.timelineTime}>
                      {status === 'تم التوصيل' ? 'تم التوصيل بنجاح' : 'في انتظار التوصيل'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* تفاصيل الطلب */}
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>تفاصيل الطلب</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={18} color="#6B7280" />
                  <Text style={styles.detailText}>{address}</Text>
                </View>
                {items.length > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="cart" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>{items.join('، ')}</Text>
                  </View>
                )}
              </View>

              {/* زر الاتصال بالمندوب */}
              {driverPhone && (
                <TouchableOpacity style={styles.contactButton} onPress={() => makePhoneCall(driverPhone)}>
                  <Ionicons name="call" size={24} color="#FFF" />
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactButtonText}>اتصل بالمندوب</Text>
                    <Text style={styles.contactButtonSubText}>{driverPhone}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* زر تحديث يدوي */}
              <TouchableOpacity style={styles.refreshButton} onPress={loadOrderStatus}>
                <Ionicons name="refresh" size={18} color="#F59E0B" />
                <Text style={styles.refreshButtonText}>تحديث الحالة</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 16,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // استايلات الفاتورة
  billCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  billTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F59E0B',
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  timeline: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  detailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
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
  contactTextContainer: {
    alignItems: 'flex-start',
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButtonSubText: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
});
