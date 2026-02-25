import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, ORDER_STATUS } from '../services/orderService';

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    loadUserAndOrders();
  }, []);

  const loadUserAndOrders = async () => {
    const phone = await AsyncStorage.getItem('userPhone');
    const userData = await AsyncStorage.getItem('userData');
    
    if (phone) {
      setUserPhone(phone);
      await fetchOrders(phone);
    } else if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed.phone) {
        setUserPhone(parsed.phone);
        await fetchOrders(parsed.phone);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const fetchOrders = async (phone) => {
    try {
      console.log('🔍 جلب طلبات العميل:', phone);
      const result = await getOrders({ customerPhone: phone });
      
      if (result.success) {
        // ترتيب الطلبات من الأحدث إلى الأقدم
        const sortedOrders = result.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sortedOrders);
        console.log(`✅ تم جلب ${sortedOrders.length} طلب`);
      } else {
        console.error('❌ فشل جلب الطلبات:', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الطلبات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userPhone) {
      fetchOrders(userPhone);
    } else {
      loadUserAndOrders();
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
      case ORDER_STATUS.PENDING: return 'معلق';
      case ORDER_STATUS.ACCEPTED: return 'تم القبول';
      case ORDER_STATUS.PREPARING: return 'قيد التجهيز';
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
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلباتي السابقة</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد طلبات سابقة</Text>
            <Text style={styles.emptySubText}>عندما تقوم بطلب جديد، سيظهر هنا</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.$id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderTracking', { orderId: order.$id })}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.serviceName}>{order.serviceName}</Text>
              
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{order.customerPhone}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {order.customerAddress}
                </Text>
              </View>

              {order.items && order.items.length > 0 && (
                <View style={styles.itemsPreview}>
                  <Text style={styles.itemsText} numberOfLines={2}>
                    {order.items.slice(0, 2).join(' • ')}
                    {order.items.length > 2 && ` +${order.items.length - 2}`}
                  </Text>
                </View>
              )}

              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>

              {order.totalPrice > 0 && (
                <Text style={styles.totalPrice}>الإجمالي: {order.totalPrice} ج</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  refreshButton: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  detailText: { fontSize: 14, color: '#4B5563', flex: 1 },
  itemsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsText: { fontSize: 13, color: '#6B7280' },
  orderDate: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },
  totalPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginTop: 4 },
});
