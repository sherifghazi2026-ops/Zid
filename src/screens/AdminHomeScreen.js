import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, USERS_COLLECTION_ID, ORDERS_COLLECTION_ID } from '../appwrite/config';
import CustomDrawer from '../components/CustomDrawer';
import { initializeCoreServices } from '../services/servicesService';

export default function AdminHomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    totalMerchants: 0,
    totalDrivers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadStats();
    initializeCoreServices();
  }, []);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      setUserData(JSON.parse(data));
    }
  };

  const loadStats = async () => {
    try {
      const [users, merchants, drivers, orders, pendingOrders] = await Promise.all([
        databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.equal('role', 'merchant'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.equal('role', 'driver'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.equal('status', 'pending'), Query.limit(1)]),
      ]);

      setStats({
        totalUsers: users.total,
        totalMerchants: merchants.total,
        totalDrivers: drivers.total,
        totalOrders: orders.total,
        pendingOrders: pendingOrders.total,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#1F2937" />
        </TouchableOpacity>
        <View>
          <Text style={styles.welcome}>مرحباً،</Text>
          <Text style={styles.name}>{userData?.name || 'مدير النظام'}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddUser')}>
          <Ionicons name="add-circle" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>إحصائيات سريعة</Text>
          {loading ? (
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={32} color="#4F46E5" />
                <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>إجمالي المستخدمين</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="business-outline" size={32} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.totalMerchants}</Text>
                <Text style={styles.statLabel}>التجار</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="bicycle-outline" size={32} color="#3B82F6" />
                <Text style={styles.statNumber}>{stats.totalDrivers}</Text>
                <Text style={styles.statLabel}>المناديب</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cart-outline" size={32} color="#8B5CF6" />
                <Text style={styles.statNumber}>{stats.totalOrders}</Text>
                <Text style={styles.statLabel}>إجمالي الطلبات</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={32} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
                <Text style={styles.statLabel}>طلبات معلقة</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إدارة المتجر</Text>

          {/* إدارة المنتجات */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageProducts')}
          >
            <Ionicons name="cube-outline" size={24} color="#10B981" />
            <Text style={styles.menuText}>إدارة المنتجات</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* ✅ إدارة أقسام المنتجات (الجديد) */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageProductCategories')}
          >
            <Ionicons name="grid-outline" size={24} color="#8B5CF6" />
            <Text style={styles.menuText}>إدارة أقسام المنتجات</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>إدارة النظام</Text>

          {/* إدارة المستخدمين */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Ionicons name="people-outline" size={24} color="#4F46E5" />
            <Text style={styles.menuText}>إدارة المستخدمين</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* إدارة الطلبات */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminOrders')}
          >
            <Ionicons name="cart-outline" size={24} color="#F59E0B" />
            <Text style={styles.menuText}>إدارة الطلبات</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* إدارة الخدمات */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ServicesManagement')}
          >
            <Ionicons name="apps-outline" size={24} color="#10B981" />
            <Text style={styles.menuText}>إدارة الخدمات</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* إدارة العروض */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageOffers')}
          >
            <Ionicons name="pricetag-outline" size={24} color="#F59E0B" />
            <Text style={styles.menuText}>إدارة العروض</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* إضافة مستخدم جديد */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AddUser')}
          >
            <Ionicons name="person-add-outline" size={24} color="#8B5CF6" />
            <Text style={styles.menuText}>إضافة مستخدم جديد</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomDrawer
              userData={userData}
              onClose={() => setDrawerVisible(false)}
              navigation={navigation}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: { padding: 4 },
  welcome: { fontSize: 14, color: '#6B7280' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  addButton: { padding: 8 },
  content: { padding: 16 },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  loadingText: { textAlign: 'center', color: '#6B7280' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  section: { backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: { flex: 1, fontSize: 16, color: '#1F2937', marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '80%',
    overflow: 'hidden',
  },
});
