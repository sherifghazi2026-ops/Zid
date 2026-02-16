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

// رابط السيرفر الخاص بك على Railway
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
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  useEffect(() => {
    loadRecentOrders();
    const unsubscribe = navigation.addListener('focus', loadRecentOrders);
    return unsubscribe;
  }, [navigation]);

  const loadRecentOrders = async () => {
    setLoading(true);
    try {
      // محاولة جلب الطلبات الحية من السيرفر أولاً
      const response = await fetch(`${RAILWAY_API_URL}/active-orders`);
      const serverData = await response.json();

      if (serverData && serverData.orders) {
         // تحديث القائمة ببيانات السيرفر (طلبات تليجرام)
         setRecentOrders(serverData.orders.reverse().slice(0, 5));
      } else {
        throw new Error('No server data');
      }
    } catch (error) {
      // في حالة فشل السيرفر نعتمد على الذاكرة المحلية
      const savedOrders = await AsyncStorage.getItem('user_orders');
      if (savedOrders) {
        const orders = JSON.parse(savedOrders);
        setRecentOrders(orders.reverse().slice(0, 5));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ZAYED ID</Text>
        <Text style={styles.subtitle}>دوس على الخدمة اللي عايزها</Text>
      </View>

      <View style={styles.ordersSection}>
        <Text style={styles.sectionTitle}>🕒 طلباتك الحالية</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color="#4F46E5" style={{ padding: 20 }} />
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => { setCurrentOrderId(order.id); setShowTracking(true); }}
              >
                <Ionicons name="star" size={24} color="#F59E0B" />
                <View style={styles.orderInfo}>
                  <Text style={styles.orderIdText}>طلب #{order.id.slice(-6)}</Text>
                  <Text style={styles.orderServiceText}>{order.serviceName || 'طلب نشط'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: order.status === 'تم التوصيل' ? '#10B981' : '#F59E0B' }]}>
                  <Text style={styles.statusBadgeText}>{order.status || 'جديد'}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>لا توجد طلبات حقيقية حالياً</Text>
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
            <View style={styles.overlay}><Text style={styles.cardTitle}>{service.name}</Text></View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <OrderTracking visible={showTracking} onClose={() => setShowTracking(false)} orderId={currentOrderId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#4F46E5', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  ordersSection: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  orderCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginRight: 10, flexDirection: 'row', alignItems: 'center', minWidth: 220, elevation: 3 },
  orderInfo: { flex: 1, marginLeft: 10 },
  orderIdText: { fontSize: 14, fontWeight: 'bold' },
  orderServiceText: { fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 5 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16 },
  card: { height: 180, marginBottom: 16, borderRadius: 25, overflow: 'hidden', elevation: 5 },
  cardImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', width: width - 40, padding: 20 }
});
