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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== جلب حالة الطلب من تليجرام ====================
const fetchOrderStatus = async (orderId, phoneNumber) => {
  try {
    const TELEGRAM_BOT_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result) {
      // البحث عن رسالة خاصة بهذا الطلب
      const orderMessages = data.result.filter(item => 
        item.message && 
        item.message.text && 
        item.message.text.includes(`طلب #${orderId}`)
      );
      
      if (orderMessages.length > 0) {
        // استخراج آخر حالة
        const lastMessage = orderMessages[orderMessages.length - 1];
        const text = lastMessage.message.text;
        
        if (text.includes('✅ تم التوصيل')) return 'تم التوصيل';
        if (text.includes('🚚 جاري التوصيل')) return 'جاري التوصيل';
        if (text.includes('🟢 جديد')) return 'جديد';
      }
    }
    return null;
  } catch (error) {
    console.error('خطأ في جلب الحالة:', error);
    return null;
  }
};

export default function OrderTracking({ visible, onClose, orderId, phoneNumber }) {
  const [status, setStatus] = useState('جديد');
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (visible && orderId) {
      loadOrderStatus();
      // تحديث تلقائي كل 30 ثانية
      const interval = setInterval(loadOrderStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [visible, orderId]);

  const loadOrderStatus = async () => {
    setLoading(true);
    const currentStatus = await fetchOrderStatus(orderId, phoneNumber);
    if (currentStatus) {
      setStatus(currentStatus);
    }
    
    // تحميل تفاصيل الطلب من التخزين المحلي
    try {
      const savedOrders = await AsyncStorage.getItem('user_orders');
      if (savedOrders) {
        const orders = JSON.parse(savedOrders);
        const order = orders.find(o => o.id === orderId);
        if (order) {
          setOrderDetails(order);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل تفاصيل الطلب:', error);
    }
    
    setLoading(false);
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'جديد': return 'time-outline';
      case 'جاري التوصيل': return 'bicycle-outline';
      case 'تم التوصيل': return 'checkmark-done-circle-outline';
      default: return 'help-outline';
    }
  };

  const getStatusColor = () => {
    switch(status) {
      case 'جديد': return '#F59E0B';
      case 'جاري التوصيل': return '#3B82F6';
      case 'تم التوصيل': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusMessage = () => {
    switch(status) {
      case 'جديد':
        return 'تم استلام طلبك وجاري تجهيزه';
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
          {/* الهيدر */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={{ uri: 'https://img.icons8.com/color/96/000000/delivery--v1.png' }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.headerTitle}>تتبع الطلب</Text>
                <Text style={styles.headerSub}>طلب #{orderId}</Text>
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
              {orderDetails && (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsTitle}>تفاصيل الطلب</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>{orderDetails.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>{orderDetails.address}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cart" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>{orderDetails.items?.length || 0} منتج</Text>
                  </View>
                </View>
              )}

              {/* زر الاتصال بالمندوب (لما يبقى في الطريق) */}
              {status === 'جاري التوصيل' && (
                <TouchableOpacity style={styles.contactButton}>
                  <Ionicons name="call" size={20} color="#FFF" />
                  <Text style={styles.contactButtonText}>الاتصال بالمندوب</Text>
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
  body: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 24,
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
  timeline: {
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
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
    gap: 8,
    marginBottom: 12,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
