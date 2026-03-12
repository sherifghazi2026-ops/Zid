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
import { databases, DATABASE_ID } from '../../appwrite/config';
import { COLLECTIONS } from '../../constants/collections';
import { Query } from 'appwrite';
import { getAllServices } from '../../services/servicesService';

export default function AdminHomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    todayOrders: 0,
    services: 0,
    pendingProducts: 0,
    pendingAssistants: 0,
    restaurants: 0,
    homeChefs: 0,
    pendingVerifications: 0, // ✅ عدد طلبات التوثيق
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // جلب عدد المستخدمين
      const usersRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [Query.limit(1)]
      );

      // جلب عدد طلبات اليوم
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ordersRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.ORDERS,
        [
          Query.greaterThan('createdAt', today.toISOString()),
          Query.limit(1)
        ]
      );

      // جلب عدد الخدمات
      const servicesRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SERVICES,
        [Query.limit(1)]
      );

      // جلب عدد المطاعم
      const restaurantsRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.RESTAURANTS,
        [Query.limit(1)]
      );

      // جلب عدد شيفات المنزل
      const chefsRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.HOME_CHEFS,
        [Query.limit(1)]
      );

      // جلب المنتجات المعلقة
      let pendingProducts = 0;
      try {
        const productsRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PRODUCTS,
          [Query.equal('status', 'pending'), Query.limit(1)]
        );
        pendingProducts = productsRes.total || 0;
      } catch (e) {
        console.log('لا يوجد collection للمنتجات');
      }

      // ✅ جلب عدد طلبات التوثيق
      let pendingVerifications = 0;
      try {
        const verificationsRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USERS,
          [
            Query.equal('role', 'merchant'),
            Query.equal('isVerified', false),
            Query.or([
              Query.notEqual('verificationImage', null),
              Query.notEqual('verificationImage', '')
            ]),
            Query.limit(1)
          ]
        );
        pendingVerifications = verificationsRes.total || 0;
      } catch (e) {
        console.log('خطأ في جلب طلبات التوثيق:', e);
      }

      setStats({
        users: usersRes.total || 0,
        todayOrders: ordersRes.total || 0,
        services: servicesRes.total || 0,
        pendingProducts: pendingProducts,
        pendingAssistants: 0,
        restaurants: restaurantsRes.total || 0,
        homeChefs: chefsRes.total || 0,
        pendingVerifications: pendingVerifications,
      });
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
      Alert.alert('خطأ', 'فشل في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          onPress: async () => {
            await AsyncStorage.removeItem('userData');
            await AsyncStorage.removeItem('userRole');
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      icon: 'people',
      color: '#4F46E5',
      title: 'إدارة المستخدمين',
      screen: 'UserManagement',
      count: stats.users
    },
    {
      icon: 'cart',
      color: '#F59E0B',
      title: 'الطلبات',
      screen: 'AdminOrders',
      count: stats.todayOrders
    },
    {
      icon: 'apps',
      color: '#10B981',
      title: 'إدارة الخدمات',
      screen: 'ServicesManagement',
      count: stats.services
    },
    {
      icon: 'checkmark-done-circle',
      color: '#10B981',
      title: 'مراجعة المنتجات',
      screen: 'AdminProductsReview',
      count: stats.pendingProducts
    },
    {
      icon: 'restaurant',
      color: '#EF4444',
      title: 'إدارة المطاعم',
      screen: 'ManageRestaurants',
      count: stats.restaurants
    },
    {
      icon: 'home',
      color: '#8B5CF6',
      title: 'إدارة الشيفات',
      screen: 'ManageHomeChefs',
      count: stats.homeChefs
    },
    {
      icon: 'pricetag',
      color: '#EC4899',
      title: 'العروض',
      screen: 'ManageOffers',
      count: 0
    },
    {
      icon: 'cube',
      color: '#6366F1',
      title: 'المنتجات',
      screen: 'ManageProducts',
      count: 0
    },
    {
      icon: 'chatbubbles',
      color: '#8B5CF6',
      title: 'المساعدين',
      screen: 'AdminAssistants',
      count: stats.pendingAssistants
    },
    {
      icon: 'location',
      color: '#14B8A6',
      title: 'الأماكن',
      screen: 'ManagePlacesScreen',
      count: 0
    },
    {
      icon: 'shirt',
      color: '#F97316',
      title: 'أصناف المكوجي',
      screen: 'ManageLaundryItems',
      count: 0
    },
    {
      icon: 'image',
      color: '#6B7280',
      title: 'مراجعة الصور',
      screen: 'ReviewDishes',
      count: 0
    },
    // ✅ زر طلبات التوثيق
    {
      icon: 'shield-checkmark-outline',
      color: '#10B981',
      title: 'طلبات التوثيق',
      screen: 'VerificationRequestsScreen',
      count: stats.pendingVerifications
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>لوحة التحكم</Text>
          <Text style={styles.subtitle}>مرحباً بك في لوحة إدارة النظام</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={loadStats} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.statNumber}>{stats.users}</Text>
            <Text style={styles.statLabel}>المستخدمين</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.statNumber}>{stats.todayOrders}</Text>
            <Text style={styles.statLabel}>طلبات اليوم</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.statNumber}>{stats.services}</Text>
            <Text style={styles.statLabel}>الخدمات</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>القائمة الرئيسية</Text>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
              {item.count > 0 && (
                <View style={[styles.badge, { backgroundColor: item.color }]}>
                  <Text style={styles.badgeText}>{item.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
