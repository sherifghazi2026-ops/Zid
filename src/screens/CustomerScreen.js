import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrderTracking from '../components/OrderTracking';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

const RAILWAY_API_URL = 'https://zayedid-production.up.railway.app';

const images = {
  supermarket: require('../../assets/icons/supermarket-8k.png'),
  restaurant: require('../../assets/icons/restaurant-8k.png'),
  pharmacy: require('../../assets/icons/pharmacy-8k.png'),
  plumbing: require('../../assets/icons/plumbing-8k.png'),
  carpentry: require('../../assets/icons/carpentry-8k.png'),
  marble: require('../../assets/icons/marble-8k.png'),
};

const SERVICES = [
  { id: 'supermarket', name: 'سوبر ماركت', image: images.supermarket, screen: 'Grocery' },
  { id: 'restaurant', name: 'مطاعم', image: images.restaurant, screen: 'Restaurant' },
  { id: 'pharmacy', name: 'صيدليات', image: images.pharmacy, screen: 'Grocery' },
  { id: 'plumbing', name: 'سباكة', image: images.plumbing, screen: 'Grocery' },
  { id: 'carpentry', name: 'نجارة', image: images.carpentry, screen: 'Grocery' },
  { id: 'marble', name: 'رخام', image: images.marble, screen: 'Grocery' },
];

export default function CustomerScreen({ navigation }) {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const loadActiveOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${RAILWAY_API_URL}/active-orders`);
      const data = await response.json();
      
      if (data.success && data.orders) {
        setActiveOrders(data.orders);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveOrders();
    
    // تحديث كل 10 ثواني
    const interval = setInterval(loadActiveOrders, 10000);
    
    const unsubscribe = navigation.addListener('focus', loadActiveOrders);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'جديد': return '#F59E0B';
      case 'جاري التوصيل': return '#3B82F6';
      case 'تم التوصيل': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'جديد': return 'time-outline';
      case 'جاري التوصيل': return 'bicycle-outline';
      case 'تم التوصيل': return 'checkmark-circle-outline';
      default: return 'help-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ZAYED ID</Text>
        <Text style={styles.subtitle}>دوس على الخدمة اللي عايزها</Text>
      </View>

      <View style={styles.ordersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🕒 طلباتك الحالية</Text>
          <TouchableOpacity onPress={loadActiveOrders}>
            <Ionicons name="refresh" size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color="#4F46E5" style={{ padding: 20 }} />
          ) : activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => { 
                  setCurrentOrderId(order.id); 
                  setShowTracking(true); 
                }}
              >
                <View style={[styles.statusIcon, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Ionicons name={getStatusIcon(order.status)} size={24} color={getStatusColor(order.status)} />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderIdText}>طلب #{order.id.slice(-6)}</Text>
                  <Text style={styles.orderServiceText}>{order.serviceName || 'طلب'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusBadgeText}>{order.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>لا توجد طلبات حالية</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[styles.card, { width: CARD_SIZE }]}
            onPress={() => navigation.navigate(service.screen)}
          >
            <Image source={service.image} style={styles.cardImage} />
            <View style={styles.overlay}>
              <Text style={styles.cardTitle}>{service.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <OrderTracking 
        visible={showTracking} 
        onClose={() => setShowTracking(false)} 
        orderId={currentOrderId} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    padding: 25, 
    paddingTop: 60, 
    backgroundColor: '#4F46E5', 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30 
  },
  title: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  ordersSection: { padding: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  orderCard: { 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 15, 
    marginRight: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    minWidth: 220,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  orderInfo: { flex: 1 },
  orderIdText: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  orderServiceText: { fontSize: 12, color: '#6B7280' },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 10, 
    marginLeft: 5 
  },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    minWidth: width - 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 15
  },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16 },
  card: { height: 180, marginBottom: 16, borderRadius: 25, overflow: 'hidden', elevation: 5 },
  cardImage: { width: '100%', height: '100%' },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
});
