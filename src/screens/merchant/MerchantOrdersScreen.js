import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, updateOrderStatus, ORDER_STATUS } from '../../services/orderService';
import { getRestaurantByMerchantId } from '../../services/restaurantService';

export default function MerchantOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [merchantData, setMerchantData] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, accepted, completed

  useEffect(() => {
    loadMerchantData();
  }, []);

  useEffect(() => {
    if (merchantData && restaurant) {
      loadOrders();
    }
  }, [merchantData, restaurant, activeTab]);

  const loadMerchantData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        setMerchantData(parsed);
        await loadRestaurant(parsed.$id);
      } else {
        navigation.replace('ServiceProvider');
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات التاجر:', error);
    }
  };

  const loadRestaurant = async (merchantId) => {
    try {
      const result = await getRestaurantByMerchantId(merchantId);
      if (result.success && result.data) {
        setRestaurant(result.data);
      } else {
        Alert.alert('تنبيه', 'لم يتم العثور على مطعم مرتبط بحسابك');
      }
    } catch (error) {
      console.error('خطأ في جلب المطعم:', error);
    }
  };

  const loadOrders = async () => {
    if (!restaurant) return;

    try {
      let statusFilter;
      switch (activeTab) {
        case 'pending':
          statusFilter = ORDER_STATUS.PENDING;
          break;
        case 'accepted':
          statusFilter = [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING];
          break;
        case 'completed':
          statusFilter = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];
          break;
        default:
          statusFilter = ORDER_STATUS.PENDING;
      }

      const result = await getOrders({
        serviceType: 'restaurant',
        merchantId: merchantData?.$id,
        status: statusFilter,
      });

      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptOrder = (order) => {
    Alert.alert(
      'قبول الطلب',
      'هل أنت متأكد من قبول هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول',
          onPress: async () => {
            const result = await updateOrderStatus(order.$id, ORDER_STATUS.ACCEPTED, {
              merchantId: merchantData.$id,
              merchantName: merchantData.name,
              merchantPhone: merchantData.phone,
              acceptedAt: new Date().toISOString(),
            });
            if (result.success) {
              Alert.alert('تم', 'تم قبول الطلب');
              loadOrders();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedOrder) return;

    const result = await updateOrderStatus(selectedOrder.$id, status, {
      updatedAt: new Date().toISOString(),
    });

    if (result.success) {
      setStatusModalVisible(false);
      setSelectedOrder(null);
      loadOrders();
      Alert.alert('تم', 'تم تحديث حالة الطلب');
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const makePhoneCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
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
    switch (status) {
      case ORDER_STATUS.PENDING: return 'معلق';
      case ORDER_STATUS.ACCEPTED: return 'تم القبول';
      case ORDER_STATUS.PREPARING: return 'قيد التحضير';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      case ORDER_STATUS.DELIVERED: return 'تم التسليم';
      case ORDER_STATUS.CANCELLED: return 'ملغي';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلبات المطعم</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            جديدة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
            قيد التنفيذ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            سابقة
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.ordersContainer}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد طلبات</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.$id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => makePhoneCall(order.customerPhone)}
                >
                  <Ionicons name="call-outline" size={16} color="#3B82F6" />
                  <Text style={styles.detailText}>{order.customerPhone}</Text>
                </TouchableOpacity>

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{order.customerAddress}</Text>
                </View>

                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsTitle}>الطلبات:</Text>
                  {order.items?.map((item, index) => (
                    <Text key={index} style={styles.itemText}>• {item}</Text>
                  ))}
                </View>

                {order.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>ملاحظات:</Text>
                    <Text style={styles.notesText}>{order.notes}</Text>
                  </View>
                ) : null}

                {order.totalPrice > 0 && (
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>الإجمالي:</Text>
                    <Text style={styles.priceValue}>{order.totalPrice} ج</Text>
                  </View>
                )}

                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
              </View>

              {activeTab === 'pending' && (
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptOrder(order)}
                >
                  <Text style={styles.acceptButtonText}>قبول الطلب</Text>
                </TouchableOpacity>
              )}

              {activeTab === 'accepted' && (
                <TouchableOpacity
                  style={styles.statusButton}
                  onPress={() => {
                    setSelectedOrder(order);
                    setStatusModalVisible(true);
                  }}
                >
                  <Text style={styles.statusButtonText}>تحديث الحالة</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal تحديث الحالة */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تحديث حالة الطلب</Text>

            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => handleUpdateStatus(ORDER_STATUS.PREPARING)}
            >
              <Ionicons name="time-outline" size={24} color="#8B5CF6" />
              <Text style={styles.statusOptionText}>قيد التحضير</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => handleUpdateStatus(ORDER_STATUS.ON_THE_WAY)}
            >
              <Ionicons name="bicycle-outline" size={24} color="#3B82F6" />
              <Text style={styles.statusOptionText}>جاري التوصيل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => handleUpdateStatus(ORDER_STATUS.DELIVERED)}
            >
              <Ionicons name="checkmark-done-outline" size={24} color="#10B981" />
              <Text style={styles.statusOptionText}>تم التسليم</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusOption}
              onPress={() => handleUpdateStatus(ORDER_STATUS.CANCELLED)}
            >
              <Ionicons name="close-outline" size={24} color="#EF4444" />
              <Text style={styles.statusOptionText}>إلغاء الطلب</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 2,
  },
  activeTab: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 12, color: '#6B7280' },
  activeTabText: { color: '#FFF', fontWeight: '600' },

  ordersContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  detailText: { fontSize: 14, color: '#4B5563', flex: 1 },
  itemsContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  itemsTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  notesContainer: { marginTop: 8, padding: 8, backgroundColor: '#FEF3C7', borderRadius: 6 },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#92400E', marginBottom: 2 },
  notesText: { fontSize: 12, color: '#92400E' },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  priceValue: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B' },
  orderDate: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },

  acceptButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  statusButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 20 },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  statusOptionText: { fontSize: 16, color: '#1F2937', flex: 1 },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  closeButtonText: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
});
