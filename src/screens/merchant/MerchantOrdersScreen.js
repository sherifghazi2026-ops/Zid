import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOrders, ORDER_STATUS } from '../../services/orderService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MerchantOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData) {
      loadOrders();
    }
  }, [userData, activeTab]);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const user = JSON.parse(data);
      setUserData(user);
    }
  };

  const loadOrders = async () => {
    try {
      let statusFilter;
      switch(activeTab) {
        case 'pending':
          statusFilter = ORDER_STATUS.PENDING;
          break;
        case 'active':
          statusFilter = [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.PRICE_SET, ORDER_STATUS.READY];
          break;
        case 'delivered':
          statusFilter = ORDER_STATUS.DELIVERED;
          break;
        default:
          statusFilter = ORDER_STATUS.PENDING;
      }

      const result = await getOrders({ status: statusFilter });
      if (result.success) {
        // فلترة حسب نوع خدمة التاجر
        const merchantOrders = result.data.filter(order => 
          order.serviceType === userData?.merchantType || 
          order.serviceType === userData?.serviceType
        );
        setOrders(merchantOrders);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      [ORDER_STATUS.PENDING]: 'معلق',
      [ORDER_STATUS.ACCEPTED]: 'تم القبول',
      [ORDER_STATUS.PREPARING]: 'جاري التجهيز',
      [ORDER_STATUS.PRICE_SET]: 'تم تحديد السعر',
      [ORDER_STATUS.READY]: 'جاهز للتسليم',
      [ORDER_STATUS.DRIVER_ASSIGNED]: 'تم تعيين مندوب',
      [ORDER_STATUS.ON_THE_WAY]: 'في الطريق',
      [ORDER_STATUS.DELIVERED]: 'تم التوصيل',
      [ORDER_STATUS.CANCELLED]: 'ملغي',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetailsScreen', { orderId: item.$id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>طلب #{item.$id.slice(-6)}</Text>
          <Text style={styles.orderTime}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color="#4F46E5" />
          <Text style={styles.infoText}>{item.customerPhone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#EF4444" />
          <Text style={styles.infoText} numberOfLines={1}>{item.customerAddress}</Text>
        </View>
      </View>

      {item.totalPrice > 0 && (
        <Text style={styles.totalPrice}>السعر: {item.totalPrice} ج</Text>
      )}

      {item.driverName && (
        <View style={styles.driverInfo}>
          <Ionicons name="bicycle-outline" size={14} color="#3B82F6" />
          <Text style={styles.driverText}>مندوب: {item.driverName}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
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
        <Text style={styles.headerTitle}>الطلبات</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* التبويبات */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            معلقة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            نشطة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'delivered' && styles.activeTab]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.activeTabText]}>
            منتهية
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد طلبات</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // التبويبات
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeTab: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#FFF', fontWeight: '600' },

  list: { padding: 16 },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  orderTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  customerInfo: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1 },
  totalPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginTop: 4 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  driverText: { fontSize: 12, color: '#3B82F6' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
