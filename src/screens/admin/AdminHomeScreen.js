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
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { getOrders } from '../../services/orderService';

export default function AdminHomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    merchants: 0,
    drivers: 0,
    customers: 0,
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
      const { count: merchantsCount } = await supabase
        .from(TABLES.PROFILES)
        .select('*', { count: 'exact', head: true })
        .eq('role', 'merchant');

      const { count: driversCount } = await supabase
        .from(TABLES.PROFILES)
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver');

      const { count: customersCount } = await supabase
        .from(TABLES.PROFILES)
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      const ordersResult = await getOrders();
      const ordersCount = ordersResult.success ? ordersResult.data.length : 0;

      const { count: pendingProducts } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingVerifications } = await supabase
        .from(TABLES.PROFILES)
        .select('*', { count: 'exact', head: true })
        .eq('role', 'merchant')
        .eq('is_verified', false)
        .not('verification_image', 'is', null);

      setStats({
        merchants: merchantsCount || 0,
        drivers: driversCount || 0,
        customers: customersCount || 0,
        orders: ordersCount,
        pendingProducts: pendingProducts || 0,
        pendingVerifications: pendingVerifications || 0,
      });
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
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
          await supabase.auth.signOut();
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
        <Text style={styles.title}>لوحة تحكم الأدمن</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people-outline" size={24} color="#4F46E5" />
            <Text style={styles.statNumber}>{stats.merchants}</Text>
            <Text style={styles.statLabel}>التجار</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="bicycle-outline" size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{stats.drivers}</Text>
            <Text style={styles.statLabel}>المندوبين</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cart-outline" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.orders}</Text>
            <Text style={styles.statLabel}>الطلبات</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="cube-outline" size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.pendingProducts}</Text>
            <Text style={styles.statLabel}>منتجات معلقة</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 إدارة المستخدمين</Text>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('UserManagement')}>
              <Ionicons name="people" size={32} color="#4F46E5" /><Text style={styles.menuText}>جميع المستخدمين</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AddUser')}>
              <Ionicons name="person-add" size={32} color="#10B981" /><Text style={styles.menuText}>إضافة مستخدم</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('VerificationRequestsScreen')}>
              <Ionicons name="shield-checkmark" size={32} color="#F59E0B" /><Text style={styles.menuText}>طلبات التوثيق</Text>
              {stats.pendingVerifications > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingVerifications}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ إدارة الخدمات</Text>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('ServicesManagement')}>
              <Ionicons name="apps" size={32} color="#4F46E5" /><Text style={styles.menuText}>الخدمات</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AdminAssistants')}>
              <Ionicons name="chatbubbles" size={32} color="#8B5CF6" /><Text style={styles.menuText}>المساعدين</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('ManagePlacesScreen')}>
              <Ionicons name="location" size={32} color="#14B8A6" /><Text style={styles.menuText}>الأماكن</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 المنتجات والطلبات</Text>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('AdminOrders')}>
              <Ionicons name="cart" size={32} color="#F59E0B" /><Text style={styles.menuText}>الطلبات</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('ReviewProductsScreen')}>
              <Ionicons name="checkmark-done-circle" size={32} color="#EF4444" /><Text style={styles.menuText}>مراجعة المنتجات</Text>
              {stats.pendingProducts > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingProducts}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('ManageAllProductsScreen')}>
              <Ionicons name="cube" size={32} color="#6B7280" /><Text style={styles.menuText}>جميع المنتجات</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', borderRadius: 12, padding: 16, marginBottom: 8, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' },
  menuText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
});
