import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== إعدادات تليجرام ====================
const TELEGRAM_BOT_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_CHAT_ID = "1814331589";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ==================== دالة جلب الطلبات من التليجرام ====================
const fetchTelegramMessages = async () => {
  try {
    const url = `${TELEGRAM_API_URL}/getUpdates`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result) {
      // فلترة الرسائل اللي فيها طلبات (تحتوي على 🧾)
      const orders = data.result
        .filter(item => item.message && item.message.text && item.message.text.includes('🧾'))
        .map(item => {
          // استخراج رقم التليفون والعنوان من النص
          const text = item.message.text;
          const phoneMatch = text.match(/📞 (.+)/);
          const addressMatch = text.match(/📍 (.+)/);
          const itemsMatch = text.match(/🛒 (.+?)(?=\n|$)/);
          
          // استخراج رقم الطلب من النص
          const orderIdMatch = text.match(/طلب #(\d+)/);
          const orderId = orderIdMatch ? orderIdMatch[1] : item.message.message_id;
          
          return {
            id: orderId,
            messageId: item.message.message_id,
            date: new Date(item.message.date * 1000).toLocaleString('ar-EG'),
            phone: phoneMatch ? phoneMatch[1] : 'غير معروف',
            address: addressMatch ? addressMatch[1] : 'غير معروف',
            items: itemsMatch ? itemsMatch[1] : 'غير معروف',
            status: 'جديد', // الحالة الافتراضية
            fullText: text,
          };
        });
      
      return orders;
    }
    return [];
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    return [];
  }
};

// ==================== دالة إرسال الحالة للعميل عبر تليجرام ====================
const sendStatusToCustomer = async (order, newStatus) => {
  try {
    // البحث عن معرف المحادثة مع العميل (ممكن يكون محفوظ)
    let customerChatId = TELEGRAM_CHAT_ID; // افتراضي
    
    // محاولة العثور على معرف العميل من الرسائل السابقة
    try {
      const savedChatIds = await AsyncStorage.getItem('customer_chat_ids');
      if (savedChatIds) {
        const chatIds = JSON.parse(savedChatIds);
        if (chatIds[order.phone]) {
          customerChatId = chatIds[order.phone];
        }
      }
    } catch (e) {
      console.log('خطأ في قراءة معرفات المحادثات');
    }
    
    let statusIcon = '';
    let statusMessage = '';
    let color = '';
    
    switch(newStatus) {
      case 'جاري التوصيل':
        statusIcon = '🚚';
        statusMessage = 'المندوب في الطريق إليك!';
        color = '#3B82F6';
        break;
      case 'تم التوصيل':
        statusIcon = '✅';
        statusMessage = 'تم توصيل الطلب بنجاح';
        color = '#10B981';
        break;
      default:
        statusIcon = '🟢';
        statusMessage = 'جاري تجهيز الطلب';
        color = '#F59E0B';
    }
    
    const message = `${statusIcon} <b>تحديث حالة الطلب #${order.id}</b>\n\n` +
                    `الحالة: <b>${newStatus}</b>\n` +
                    `${statusMessage}\n\n` +
                    `📞 ${order.phone}\n` +
                    `📍 ${order.address}\n\n` +
                    `شكراً لتسوقك مع <b>Zayed-ID</b> ❤️`;
    
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: customerChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    const data = await response.json();
    
    // إذا فشل الإرسال للعميل، نرسل للقناة الرئيسية
    if (!data.ok) {
      await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `⚠️ فشل إرسال تحديث للعميل\n${message}`,
          parse_mode: 'HTML',
        }),
      });
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('خطأ في إرسال الحالة للعميل:', error);
    return false;
  }
};

// ==================== دالة إرسال تحديث للقناة الرئيسية ====================
const sendStatusToMainChannel = async (order, newStatus) => {
  try {
    let statusIcon = '';
    let statusColor = '';
    
    switch(newStatus) {
      case 'جاري التوصيل':
        statusIcon = '🚚';
        statusColor = '🔵';
        break;
      case 'تم التوصيل':
        statusIcon = '✅';
        statusColor = '🟢';
        break;
      default:
        statusIcon = '🟢';
        statusColor = '🟢';
    }
    
    const message = `${statusIcon} <b>تحديث حالة الطلب #${order.id}</b>\n\n` +
                    `الحالة: <b>${newStatus}</b> ${statusColor}\n` +
                    `📞 ${order.phone}\n` +
                    `📍 ${order.address}\n\n` +
                    `تم التحديث بواسطة المندوب`;
    
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    return true;
    
  } catch (error) {
    console.error('خطأ في إرسال التحديث للقناة:', error);
    return false;
  }
};

export default function DeliveryTracking({ visible, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // تحميل الطلبات عند فتح الشاشة
  useEffect(() => {
    if (visible) {
      loadOrders();
      
      // تحديث تلقائي كل 30 ثانية
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const loadOrders = async () => {
    setLoading(true);
    const fetchedOrders = await fetchTelegramMessages();
    
    // تحميل الحالات المحفوظة
    try {
      const savedStatuses = await AsyncStorage.getItem('order_statuses');
      if (savedStatuses) {
        const statusMap = JSON.parse(savedStatuses);
        fetchedOrders.forEach(order => {
          if (statusMap[order.id]) {
            order.status = statusMap[order.id];
          }
        });
      }
    } catch (error) {
      console.error('خطأ في تحميل الحالات:', error);
    }
    
    // ترتيب الطلبات من الأحدث للأقدم
    fetchedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setOrders(fetchedOrders);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    
    // تحديث الحالة في الذاكرة
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    
    // حفظ الحالة في AsyncStorage
    try {
      const statusMap = {};
      updatedOrders.forEach(order => {
        statusMap[order.id] = order.status;
      });
      await AsyncStorage.setItem('order_statuses', JSON.stringify(statusMap));
      
      // إرسال الحالة للعميل عبر تليجرام
      const order = updatedOrders.find(o => o.id === orderId);
      
      // إرسال للعميل
      const sentToCustomer = await sendStatusToCustomer(order, newStatus);
      
      // إرسال للقناة الرئيسية
      await sendStatusToMainChannel(order, newStatus);
      
      if (sentToCustomer) {
        Alert.alert('تم', 'تم تحديث الحالة وإرسال إشعار للعميل');
      } else {
        Alert.alert('تنبيه', 'تم تحديث الحالة لكن فشل إرسال الإشعار للعميل');
      }
      
    } catch (error) {
      console.error('خطأ في حفظ الحالة:', error);
      Alert.alert('خطأ', 'فشل في تحديث الحالة');
    }
    
    setUpdatingOrder(null);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'جديد': return '#F59E0B'; // برتقالي
      case 'جاري التوصيل': return '#3B82F6'; // أزرق
      case 'تم التوصيل': return '#10B981'; // أخضر
      default: return '#6B7280'; // رمادي
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'جديد': return 'time-outline';
      case 'جاري التوصيل': return 'bicycle-outline';
      case 'تم التوصيل': return 'checkmark-done-circle-outline';
      default: return 'help-outline';
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
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
                <Text style={styles.headerTitle}>تتبع الطلبات</Text>
                <Text style={styles.headerSub}>للمندوبين</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* إحصائيات سريعة */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{orders.filter(o => o.status === 'جديد').length}</Text>
              <Text style={styles.statLabel}>جديد</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{orders.filter(o => o.status === 'جاري التوصيل').length}</Text>
              <Text style={styles.statLabel}>جاري التوصيل</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{orders.filter(o => o.status === 'تم التوصيل').length}</Text>
              <Text style={styles.statLabel}>تم التوصيل</Text>
            </View>
          </View>

          {/* زر التحديث */}
          <TouchableOpacity style={styles.refreshButton} onPress={loadOrders}>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.refreshButtonText}>تحديث</Text>
          </TouchableOpacity>

          {/* قائمة الطلبات */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
            </View>
          ) : (
            <ScrollView style={styles.ordersList}>
              {orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>لا توجد طلبات حالياً</Text>
                </View>
              ) : (
                orders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <TouchableOpacity
                      style={styles.orderContent}
                      onPress={() => viewOrderDetails(order)}
                    >
                      <View style={styles.orderHeader}>
                        <Ionicons name="receipt" size={24} color="#F59E0B" />
                        <Text style={styles.orderId}>طلب #{order.id}</Text>
                      </View>
                      
                      <View style={styles.orderInfo}>
                        <View style={styles.infoRow}>
                          <Ionicons name="calendar" size={16} color="#6B7280" />
                          <Text style={styles.infoText}>{order.date}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="call" size={16} color="#6B7280" />
                          <Text style={styles.infoText}>{order.phone}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="location" size={16} color="#6B7280" />
                          <Text style={styles.infoText} numberOfLines={1}>
                            {order.address}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="cart" size={16} color="#6B7280" />
                          <Text style={styles.infoText} numberOfLines={1}>
                            {order.items}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.statusSection}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                        <Ionicons name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status)} />
                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                          {order.status}
                        </Text>
                      </View>

                      <View style={styles.statusActions}>
                        {order.status === 'جديد' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                            onPress={() => updateOrderStatus(order.id, 'جاري التوصيل')}
                            disabled={updatingOrder === order.id}
                          >
                            {updatingOrder === order.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="bicycle" size={16} color="#FFF" />
                                <Text style={styles.actionButtonText}>توصيل</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        
                        {order.status === 'جاري التوصيل' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                            onPress={() => updateOrderStatus(order.id, 'تم التوصيل')}
                            disabled={updatingOrder === order.id}
                          >
                            {updatingOrder === order.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                                <Text style={styles.actionButtonText}>تم</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* نافذة تفاصيل الطلب */}
          <Modal visible={showOrderDetails} transparent animationType="fade">
            <View style={styles.detailsOverlay}>
              <View style={styles.detailsContent}>
                {selectedOrder && (
                  <>
                    <View style={styles.detailsHeader}>
                      <Text style={styles.detailsTitle}>تفاصيل الطلب #{selectedOrder.id}</Text>
                      <TouchableOpacity onPress={() => setShowOrderDetails(false)}>
                        <Ionicons name="close" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.detailsBody}>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📞 رقم التليفون:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.phone}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📍 العنوان:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.address}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📅 التاريخ:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.date}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📝 المنتجات:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.items}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📋 نص الطلب الكامل:</Text>
                        <Text style={styles.detailValueFull}>{selectedOrder.fullText}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>🔄 الحالة الحالية:</Text>
                        <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                          <Ionicons name={getStatusIcon(selectedOrder.status)} size={20} color={getStatusColor(selectedOrder.status)} />
                          <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedOrder.status) }]}>
                            {selectedOrder.status}
                          </Text>
                        </View>
                      </View>
                    </ScrollView>
                  </>
                )}
              </View>
            </View>
          </Modal>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: '#F59E0B',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
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
  ordersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  detailsBody: {
    maxHeight: '90%',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  detailValueFull: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 8,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 16,
    fontWeight: '600',
  },
});
