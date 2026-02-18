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

// أيقونة التطبيق فقط (بدون خلفية)
const appIcon = require('../../assets/icons/Zidicon.png');

// جميع أيقونات الخدمات
const images = {
  // الأنظمة الحالية
  supermarket: require('../../assets/icons/supermarket-8k.png'),
  restaurant: require('../../assets/icons/restaurant-8k.png'),
  ironing: require('../../assets/icons/ironing-8k.png'),
  
  // الخدمات الموجودة سابقاً
  pharmacy: require('../../assets/icons/pharmacy-8k.png'),
  plumbing: require('../../assets/icons/plumbing-8k.png'),
  kitchen: require('../../assets/icons/Kitchen.png'),
  carpentry: require('../../assets/icons/carpentry-8k.png'),
  marble: require('../../assets/icons/marble-8k.png'),
  
  // الخدمات الجديدة
  winch: require('../../assets/icons/winch-8k.png'),
  electrician: require('../../assets/icons/electrician-8k.png'),
  moving: require('../../assets/icons/moving-8k.png'),
};

const SERVICES = [
  // الأنظمة الحالية (لا تغيير)
  { id: 'supermarket', name: 'سوبر ماركت', image: images.supermarket, screen: 'Grocery' },
  { id: 'restaurant', name: 'مطاعم', image: images.restaurant, screen: 'Restaurant' },
  { id: 'ironing', name: 'مكوجي', image: images.ironing, screen: 'Ironing' },
  
  // الخدمات الجديدة
  { id: 'pharmacy', name: 'صيدليات', image: images.pharmacy, screen: 'Pharmacy' },
  { id: 'kitchen', name: 'مطابخ', image: images.kitchen, screen: 'Kitchen' },
  { id: 'plumbing', name: 'سباكة', image: images.plumbing, screen: 'Plumbing' },
  { id: 'carpentry', name: 'نجارة', image: images.carpentry, screen: 'Carpentry' },
  { id: 'marble', name: 'رخام', image: images.marble, screen: 'Marble' },
  { id: 'winch', name: 'ونش', image: images.winch, screen: 'Winch' },
  { id: 'electrician', name: 'كهربائي', image: images.electrician, screen: 'Electrician' },
  { id: 'moving', name: 'نقل اثاث', image: images.moving, screen: 'Moving' },
];

const RAILWAY_API_URL = 'https://zayedid-production.up.railway.app';

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
      } else {
        setActiveOrders([]);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
      setActiveOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveOrders();
    const interval = setInterval(loadActiveOrders, 10000);
    const unsubscribe = navigation.addListener('focus', loadActiveOrders);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation]);

  const getStatusColor = (status) => {
    if (status.includes('في الطريق')) return '#3B82F6';
    if (status.includes('تم التنفيذ')) return '#10B981';
    if (status.includes('تم استلام')) return '#F59E0B';
    return '#6B7280';
  };

  const getStatusIcon = (status) => {
    if (status.includes('في الطريق')) return 'bicycle-outline';
    if (status.includes('تم التنفيذ')) return 'checkmark-circle-outline';
    if (status.includes('تم استلام')) return 'time-outline';
    return 'help-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* الهيدر الأصلي بدون صورة خلفية */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={appIcon} style={styles.headerIcon} />
          <View>
            <Text style={styles.title}>ZAYED ID</Text>
            <Text style={styles.subtitle}>دوس على الخدمة اللي عايزها</Text>
          </View>
        </View>
      </View>

      {activeOrders.length > 0 && (
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
            ) : (
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
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.grid}>
        {SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[styles.card, { width: CARD_SIZE }]}
            onPress={() => navigation.navigate(service.screen)}
            activeOpacity={0.8}
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
    backgroundColor: '#4F46E5',
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 15,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
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
