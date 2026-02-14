import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToNewOrders, acceptOrder } from '../services/orderService';

export default function DriverScreen() {
  const [orders, setOrders] = useState([]);
  const [driverId] = useState('driver-' + Date.now());
  const [driverName] = useState('محمود');

  useEffect(() => {
    const unsubscribe = subscribeToNewOrders((newOrders) => {
      setOrders(newOrders);
    });
    return unsubscribe;
  }, []);

  const handleAccept = async (order) => {
    Alert.alert(
      'قبول الطلب',
      'هل أنت متأكد من قبول هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول',
          onPress: async () => {
            const result = await acceptOrder(order.id, driverId, driverName);
            if (result.success) {
              Alert.alert('✅ تم', 'تم قبول الطلب');
            } else {
              Alert.alert('خطأ', result.error);
            }
          },
        },
      ]
    );
  };

  const getServiceIcon = (serviceId) => {
    switch (serviceId) {
      case 'supermarket': return 'cart-outline';
      case 'restaurant': return 'restaurant-outline';
      case 'pharmacy': return 'medical-outline';
      case 'plumbing': return 'water-outline';
      case 'carpentry': return 'hammer-outline';
      case 'marble': return 'square-outline';
      default: return 'help-outline';
    }
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={[styles.iconBadge, { backgroundColor: '#4F46E520' }]}>
          <Ionicons name={getServiceIcon(item.service)} size={24} color="#4F46E5" />
        </View>
        <Text style={styles.serviceName}>{item.serviceName}</Text>
      </View>

      <View style={styles.orderBody}>
        {item.text && (
          <View style={styles.infoRow}>
            <Ionicons name="mic-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{item.text}</Text>
          </View>
        )}
        {item.image && (
          <View style={styles.infoRow}>
            <Ionicons name="camera-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>📸 صورة مرفقة</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color="#6B7280" />
          <Text style={styles.infoText}>الشيخ زايد</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item)}>
        <Text style={styles.acceptText}>قبول الطلب</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>مندوب ZAYED</Text>
        <Text style={styles.subtitle}>الطلبات الجديدة</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bicycle-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyText}>لا توجد طلبات حالياً</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});
