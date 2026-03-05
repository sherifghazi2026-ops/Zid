import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID, USERS_COLLECTION_ID, ORDERS_COLLECTION_ID } from '../../appwrite/config';
import { Query } from 'appwrite';

export default function AdminHomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    users: 0,
    orders: 0,
    drivers: 0,
    merchants: 0,
    restaurants: 0,
    chefs: 0,
    pendingDishes: 0,
    pendingChefs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      setUserData(JSON.parse(data));
    }
  };

  const loadStats = async () => {
    try {
      // جلب عدد المستخدمين
      const usersRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.limit(1)]);
      const usersTotal = usersRes.total || 0;

      // جلب عدد الطلبات
      const ordersRes = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.limit(1)]);
      const ordersTotal = ordersRes.total || 0;

      // جلب عدد المطاعم
      let restaurantsTotal = 0;
      try {
        const restaurantsRes = await databases.listDocuments(DATABASE_ID, 'restaurants', [Query.limit(1)]);
        restaurantsTotal = restaurantsRes.total || 0;
      } catch (e) {
        console.log('⚠️ Collection restaurants غير موجودة');
      }

      // حساب الأدوار من المستخدمين
      let drivers = 0, merchants = 0, chefs = 0, pendingChefs = 0;
      try {
        const driversRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal('role', 'driver'),
          Query.limit(1)
        ]);
        drivers = driversRes.total || 0;

        const merchantsRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal('role', 'merchant'),
          Query.limit(1)
        ]);
        merchants = merchantsRes.total || 0;

        // الشيفات (تجار من نوع home_chef)
        const chefsRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal('role', 'merchant'),
          Query.equal('merchantType', 'home_chef'),
          Query.limit(1)
        ]);
        chefs = chefsRes.total || 0;

        // الشيفات الغير موثقة (بانتظار المراجعة)
        const pendingChefsRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal('role', 'merchant'),
          Query.equal('merchantType', 'home_chef'),
          Query.equal('isVerified', false),
          Query.limit(1)
        ]);
        pendingChefs = pendingChefsRes.total || 0;

      } catch (e) {
        console.log('⚠️ خطأ في جلب الأدوار');
      }

      // جلب عدد الأطباق قيد المراجعة
      let pendingDishes = 0;
      try {
        const dishesRes = await databases.listDocuments(DATABASE_ID, 'dishes', [
          Query.equal('status', 'pending'),
          Query.limit(1)
        ]);
        pendingDishes = dishesRes.total || 0;
      } catch (e) {
        console.log('⚠️ Collection dishes غير موجودة');
      }

      setStats({
        users: usersTotal,
        orders: ordersTotal,
        drivers,
        merchants,
        restaurants: restaurantsTotal,
        chefs,
        pendingDishes,
        pendingChefs,
      });
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userRole');
    navigation.replace('ServiceProvider');
  };

  const menuItems = [
    {
      title: 'إدارة المستخدمين',
      icon: 'people-outline',
      color: '#4F46E5',
      screen: 'UserManagement',
      count: stats.users,
    },
    {
      title: 'إدارة الطلبات',
      icon: 'cart-outline',
      color: '#F59E0B',
      screen: 'AdminOrders',
      count: stats.orders,
    },
    {
      title: 'إدارة الخدمات',
      icon: 'construct-outline',
      color: '#10B981',
      screen: 'ServicesManagement',
    },
    {
      title: 'إدارة المطاعم',
      icon: 'restaurant-outline',
      color: '#10B981',
      screen: 'ManageRestaurants',
      count: stats.restaurants,
    },
    {
      title: 'إدارة الشيفات المنزلية',
      icon: 'home',
      color: '#EF4444',
      screen: 'ManageHomeChefs',
      count: stats.chefs,
      badge: stats.pendingChefs > 0 ? stats.pendingChefs : null,
    },
    {
      title: 'إدارة المنتجات',
      icon: 'cube-outline',
      color: '#8B5CF6',
      screen: 'ManageProducts',
    },
    {
      title: 'أقسام المنتجات',
      icon: 'grid-outline',
      color: '#EC4899',
      screen: 'ManageProductCategories',
    },
    {
      title: 'إدارة العروض',
      icon: 'pricetag-outline',
      color: '#EF4444',
      screen: 'ManageOffers',
    },
    {
      title: 'إضافة مستخدم',
      icon: 'person-add-outline',
      color: '#3B82F6',
      screen: 'AddUser',
    },
    {
      title: 'مراجعة الأطباق',
      icon: 'restaurant-outline',
      color: '#8B5CF6',
      screen: 'ReviewDishes',
      count: stats.pendingDishes,
    },
    // ✅ زر إدارة أصناف المكوجي - جديد
    {
      title: 'إدارة أصناف المكوجي',
      icon: 'shirt-outline',
      color: '#F59E0B',
      screen: 'ManageLaundryItems',
      iconBg: '#FEF3C7',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>مرحباً،</Text>
          <Text style={styles.name}>{userData?.name || 'مدير النظام'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>إحصائيات سريعة</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={32} color="#4F46E5" />
              <Text style={styles.statNumber}>{stats.users}</Text>
              <Text style={styles.statLabel}>مستخدمين</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cart-outline" size={32} color="#F59E0B" />
              <Text style={styles.statNumber}>{stats.orders}</Text>
              <Text style={styles.statLabel}>طلبات</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bicycle-outline" size={32} color="#10B981" />
              <Text style={styles.statNumber}>{stats.drivers}</Text>
              <Text style={styles.statLabel}>مندوبين</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="business-outline" size={32} color="#8B5CF6" />
              <Text style={styles.statNumber}>{stats.merchants}</Text>
              <Text style={styles.statLabel}>تجار</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="restaurant-outline" size={32} color="#10B981" />
              <Text style={styles.statNumber}>{stats.restaurants}</Text>
              <Text style={styles.statLabel}>مطاعم</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="home" size={32} color="#EF4444" />
              <Text style={styles.statNumber}>{stats.chefs}</Text>
              <Text style={styles.statLabel}>شيفات</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إدارة النظام</Text>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
              {item.count !== undefined && item.count > 0 && (
                <View style={[styles.menuBadge, { backgroundColor: item.color }]}>
                  <Text style={styles.menuBadgeText}>{item.count}</Text>
                </View>
              )}
              {item.badge !== undefined && item.badge > 0 && (
                <View style={[styles.menuBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  welcome: { fontSize: 14, color: '#6B7280' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  logoutBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FEE2E2' },
  content: { padding: 16 },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: { flex: 1, fontSize: 16, color: '#1F2937' },
  menuBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  menuBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
