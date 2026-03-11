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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, startDelivery, completeDelivery, ORDER_STATUS } from '../../services/orderService';

export default function DriverDashboard({ navigation }) {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    loadDriverData();
  }, []);

  useEffect(() => {
    if (driverData) {
      loadOrders();
    }
  }, [driverData, activeTab]);

  const loadDriverData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const parsed = JSON.parse(data);
      setDriverData(parsed);
    }
  };

  const loadOrders = async () => {
    try {
      if (activeTab === 'available') {
        // الطلبات الجاهزة (READY) والتي ليس لها مندوب
        const result = await getOrders({ 
          status: ORDER_STATUS.READY,
        });
        if (result.success) {
          // فلترة الطلبات التي ليس لها مندوب
          const available = result.data.filter(order => !order.driverId);
          setAvailableOrders(available);
        }
      } else if (activeTab === 'my') {
        // طلباتي الحالية
        const result = await getOrders({ 
          driverId: driverData?.$id,
          status: [ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.ON_THE_WAY]
        });
        if (result.success) {
          setMyOrders(result.data);
        }
      } else {
        // الطلبات المكتملة
        const result = await getOrders({ 
          driverId: driverData?.$id,
          status: ORDER_STATUS.DELIVERED
        });
        if (result.success) {
          setCompletedOrders(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptOrder = (order) => {
    Alert.alert(
      'قبول التوصيل',
      'هل تريد توصيل هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول',
          onPress: async () => {
            try {
              // تعيين المندوب للطلب
              const result = await databases.updateDocument(
                DATABASE_ID,
                'orders',
                order.$id,
                {
                  status: ORDER_STATUS.DRIVER_ASSIGNED,
                  driverId: driverData.$id,
                  driverName: driverData.name,
                  driverPhone: driverData.phone,
                  driverAssignedAt: new Date().toISOString(),
                }
              );
              if (result) {
                Alert.alert('✅ تم', 'تم قبول التوصيل');
                loadOrders();
              }
            } catch (error) {
              Alert.alert('خطأ', error.message);
            }
          }
        }
      ]
    );
  };

  const handleStartDelivery = async (orderId) => {
    Alert.alert(
      'بدء التوصيل',
      'هل أنت في طريقك لتوصيل الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'بدء',
          onPress: async () => {
            const result = await startDelivery(orderId);
            if (result.success) {
              loadOrders();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleCompleteDelivery = async (orderId) => {
    Alert.alert(
      'تأكيد التسليم',
      'هل تم تسليم الطلب للعميل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، تم',
          onPress: async () => {
            const result = await completeDelivery(orderId);
            if (result.success) {
              Alert.alert('✅ تم', 'تم تسليم الطلب');
              loadOrders();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const makePhoneCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const formatAddress = (address) => {
    return address.length > 30 ? address.substring(0, 30) + '...' : address;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderOrderCard = (order, type) => {
    const isAvailable = type === 'available';
    const isMyOrder = type === 'my';
    const isCompleted = type === 'completed';

    return (
      <View key={order.$id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: order.serviceType === 'restaurant' ? '#EF444420' : '#F59E0B20' }]}>
            <Text style={[styles.statusText, { color: order.serviceType === 'restaurant' ? '#EF4444' : '#F59E0B' }]}>
              {order.serviceName}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <TouchableOpacity 
            style={styles.detailRow}
            onPress={() => makePhoneCall(order.customerPhone)}
          >
            <Ionicons name="call-outline" size={16} color="#3B82F6" />
            <Text style={styles.detailText}>العميل: {order.customerPhone}</Text>
          </TouchableOpacity>

          {order.merchantName && (
            <TouchableOpacity 
              style={styles.detailRow}
              onPress={() => makePhoneCall(order.merchantPhone)}
            >
              <Ionicons name="business-outline" size={16} color="#F59E0B" />
              <Text style={styles.detailText}>تاجر: {order.merchantName}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{formatAddress(order.customerAddress)}</Text>
          </View>

          {order.totalPrice > 0 && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>قيمة الطلب:</Text>
              <Text style={styles.priceValue}>{order.totalPrice} ج</Text>
              {order.deliveryFee > 0 && (
                <Text style={styles.deliveryFee}>+ {order.deliveryFee} ج</Text>
              )}
            </View>
          )}
        </View>

        {isAvailable && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleAcceptOrder(order)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>قبول التوصيل</Text>
          </TouchableOpacity>
        )}

        {isMyOrder && order.status === ORDER_STATUS.DRIVER_ASSIGNED && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleStartDelivery(order.$id)}
          >
            <Ionicons name="bicycle" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>بدء التوصيل</Text>
          </TouchableOpacity>
        )}

        {isMyOrder && order.status === ORDER_STATUS.ON_THE_WAY && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleCompleteDelivery(order.$id)}
          >
            <Ionicons name="checkmark-done" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>تم التوصيل</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>مرحباً، {driverData?.name || 'مندوب'}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle" size={40} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* التبويبات */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            متاحة ({availableOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            طلباتي ({myOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            منتهية ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.ordersContainer}
      >
        {activeTab === 'available' && (
          availableOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bicycle-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات متاحة</Text>
            </View>
          ) : (
            availableOrders.map(order => renderOrderCard(order, 'available'))
          )
        )}

        {activeTab === 'my' && (
          myOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات حالية</Text>
            </View>
          ) : (
            myOrders.map(order => renderOrderCard(order, 'my'))
          )
        )}

        {activeTab === 'completed' && (
          completedOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات سابقة</Text>
            </View>
          ) : (
            completedOrders.map(order => renderOrderCard(order, 'completed'))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcome: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

  // التبويبات
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
  activeTab: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 12, color: '#6B7280' },
  activeTabText: { color: '#FFFFFF', fontWeight: '600' },

  ordersContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  orderCard: {
    backgroundColor: '#FFFFFF',
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  priceLabel: { fontSize: 14, color: '#4B5563' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  deliveryFee: { fontSize: 12, color: '#9CA3AF' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
