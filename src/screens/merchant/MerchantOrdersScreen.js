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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMerchantOrders, acceptOrder, updateOrderStatus, ORDER_STATUS } from '../../services/orderService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MerchantOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [merchantId, setMerchantId] = useState(null);

  useEffect(() => {
    getMerchantData();
  }, []);

  const getMerchantData = async () => {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setMerchantId(user.$id);
      loadOrders(user.$id);
    }
  };

  const loadOrders = async (id) => {
    const result = await getMerchantOrders(id || merchantId);
    if (result.success) {
      setOrders(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleAcceptOrder = async (orderId) => {
    Alert.alert(
      'قبول الطلب',
      'هل أنت متأكد من قبول هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول',
          onPress: async () => {
            const result = await acceptOrder(orderId, merchantId);
            if (result.success) {
              loadOrders();
              Alert.alert('✅ تم', 'تم قبول الطلب بنجاح');
            }
          }
        }
      ]
    );
  };

  const updateStatus = async (orderId, newStatus) => {
    const statusMap = {
      'preparing': ORDER_STATUS.PREPARING,
      'on_the_way': ORDER_STATUS.ON_THE_WAY,
      'delivered': ORDER_STATUS.DELIVERED
    };
    
    const result = await updateOrderStatus(orderId, statusMap[newStatus]);
    if (result.success) {
      loadOrders();
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
      case ORDER_STATUS.DELIVERED: return 'تم التوصيل';
      case ORDER_STATUS.CANCELLED: return 'ملغي';
      default: return status;
    }
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>طلب #{item.$id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.customerInfo}>العميل: {item.customerPhone}</Text>
      <Text style={styles.customerInfo}>العنوان: {item.customerAddress}</Text>
      
      <View style={styles.itemsContainer}>
        {item.items && item.items.map((itm, idx) => (
          <Text key={idx} style={styles.itemText}>• {itm}</Text>
        ))}
      </View>

      <Text style={styles.totalPrice}>الإجمالي: {item.totalPrice} ج</Text>

      <View style={styles.actionsContainer}>
        {item.status === ORDER_STATUS.PENDING && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptOrder(item.$id)}
          >
            <Text style={styles.actionButtonText}>قبول الطلب</Text>
          </TouchableOpacity>
        )}

        {item.status === ORDER_STATUS.ACCEPTED && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.preparingButton]}
              onPress={() => updateStatus(item.$id, 'preparing')}
            >
              <Text style={styles.actionButtonText}>قيد التجهيز</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.readyButton]}
              onPress={() => updateStatus(item.$id, 'on_the_way')}
            >
              <Text style={styles.actionButtonText}>تم التجهيز</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === ORDER_STATUS.PREPARING && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.readyButton]}
            onPress={() => updateStatus(item.$id, 'on_the_way')}
          >
            <Text style={styles.actionButtonText}>تم التجهيز</Text>
          </TouchableOpacity>
        )}

        {item.status === ORDER_STATUS.ON_THE_WAY && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deliveredButton]}
            onPress={() => updateStatus(item.$id, 'delivered')}
          >
            <Text style={styles.actionButtonText}>تم التوصيل</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلباتي</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadOrders} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات حالياً</Text>
            </View>
          }
        />
      )}
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
  orderId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  customerInfo: { fontSize: 13, color: '#4B5563', marginBottom: 4 },
  itemsContainer: { marginVertical: 8, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
  itemText: { fontSize: 13, color: '#1F2937', marginBottom: 2 },
  totalPrice: { fontSize: 16, fontWeight: 'bold', color: '#4F46E5', marginTop: 8 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  acceptButton: { backgroundColor: '#10B981' },
  preparingButton: { backgroundColor: '#8B5CF6' },
  readyButton: { backgroundColor: '#3B82F6' },
  deliveredButton: { backgroundColor: '#10B981' },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
