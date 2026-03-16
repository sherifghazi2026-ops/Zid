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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUsersByRole } from '../../appwrite/userService';
import { getOrders } from '../../services/orderService';
import { getPendingProducts } from '../../services/productService';

export default function AdminHomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    merchants: 0,
    drivers: 0,
    orders: 0,
    pendingProducts: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const merchants = await getUsersByRole('merchant');
      const drivers = await getUsersByRole('driver');
      const orders = await getOrders();
      const pending = await getPendingProducts();

      setStats({
        merchants: merchants.success ? merchants.data.length : 0,
        drivers: drivers.success ? drivers.data.length : 0,
        orders: orders.success ? orders.data.length : 0,
        pendingProducts: pending.success ? pending.data.length : 0,
        pendingVerifications: 0, // سيتم تحديثها لاحقاً
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء' },
      {
        text: 'خروج',
        onPress: async () => {
          await AsyncStorage.removeItem('userData');
          await AsyncStorage.removeItem('userRole');
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }
      }
    ]);
  };

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
        <Text style={styles.title}>لوحة التحكم</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.statNumber}>{stats.merchants}</Text>
            <Text style={styles.statLabel}>التجار</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.statNumber}>{stats.drivers}</Text>
            <Text style={styles.statLabel}>المندوبين</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.statNumber}>{stats.orders}</Text>
            <Text style={styles.statLabel}>الطلبات</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.statNumber}>{stats.pendingProducts}</Text>
            <Text style={styles.statLabel}>منتجات معلقة</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>الإدارة</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('UserManagement')}>
            <Ionicons name="people" size={28} color="#4F46E5" />
            <Text style={styles.cardText}>المستخدمين</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminOrders')}>
            <Ionicons name="cart" size={28} color="#F59E0B" />
            <Text style={styles.cardText}>الطلبات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ServicesManagement')}>
            <Ionicons name="apps" size={28} color="#10B981" />
            <Text style={styles.cardText}>الخدمات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReviewProductsScreen')}>
            <Ionicons name="checkmark-done-circle" size={28} color="#EF4444" />
            <Text style={styles.cardText}>مراجعة المنتجات</Text>
            {stats.pendingProducts > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingProducts}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminAssistants')}>
            <Ionicons name="chatbubbles" size={28} color="#8B5CF6" />
            <Text style={styles.cardText}>المساعدين</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ManageLaundryItemsScreen')}>
            <Ionicons name="shirt" size={28} color="#3B82F6" />
            <Text style={styles.cardText}>أصناف المكوجي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ManagePlacesScreen')}>
            <Ionicons name="location" size={28} color="#14B8A6" />
            <Text style={styles.cardText}>الأماكن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('VerificationRequestsScreen')}>
            <Ionicons name="shield-checkmark" size={28} color="#10B981" />
            <Text style={styles.cardText}>طلبات التوثيق</Text>
          </TouchableOpacity>
        </View>
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  cardText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#1F2937' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});
