import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, ORDER_STATUS } from '../../services/orderService';

export default function DriverDeliveriesScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed'

  useEffect(() => {
    loadDriverData();
  }, []);

  useEffect(() => {
    if (driverData) {
      loadDeliveries();
    }
  }, [driverData, activeTab]);

  const loadDriverData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      setDriverData(JSON.parse(data));
    }
  };

  const loadDeliveries = async () => {
    try {
      let statusFilter;
      if (activeTab === 'active') {
        statusFilter = [ORDER_STATUS.PREPARING, ORDER_STATUS.ON_THE_WAY];
      } else {
        statusFilter = ORDER_STATUS.DELIVERED;
      }

      const result = await getOrders({ 
        driverId: driverData?.$id,
        status: statusFilter
      });
      
      if (result.success) {
        setDeliveries(result.data);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const makePhoneCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>توصيلاتي</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            الحالية ({deliveries.filter(d => d.status !== ORDER_STATUS.DELIVERED).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            السابقة ({deliveries.filter(d => d.status === ORDER_STATUS.DELIVERED).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
      >
        {deliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={60} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد توصيلات</Text>
          </View>
        ) : (
          deliveries.map((delivery) => (
            <TouchableOpacity
              key={delivery.$id}
              style={styles.deliveryCard}
              onPress={() => navigation.navigate('OrderTracking', { orderId: delivery.$id })}
            >
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>طلب #{delivery.$id.slice(-6)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: 
                  delivery.status === ORDER_STATUS.DELIVERED ? '#10B98120' : '#3B82F620'
                }]}>
                  <Text style={[styles.statusText, { color: 
                    delivery.status === ORDER_STATUS.DELIVERED ? '#10B981' : '#3B82F6'
                  }]}>
                    {delivery.status === ORDER_STATUS.DELIVERED ? 'تم التسليم' : 'جاري'}
                  </Text>
                </View>
              </View>

              <View style={styles.customerInfo}>
                <TouchableOpacity 
                  style={styles.infoRow}
                  onPress={() => makePhoneCall(delivery.customerPhone)}
                >
                  <Ionicons name="call-outline" size={16} color="#3B82F6" />
                  <Text style={styles.infoText}>{delivery.customerPhone}</Text>
                </TouchableOpacity>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>{delivery.customerAddress}</Text>
                </View>
              </View>

              <View style={styles.deliveryFooter}>
                <Text style={styles.deliveryDate}>
                  {formatDate(delivery.createdAt)}
                </Text>
                {delivery.totalPrice > 0 && (
                  <Text style={styles.deliveryPrice}>
                    {delivery.totalPrice + (delivery.deliveryFee || 0)} ج
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  activeTab: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#FFF', fontWeight: '600' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  deliveryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  customerInfo: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1 },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryDate: { fontSize: 12, color: '#9CA3AF' },
  deliveryPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
});
