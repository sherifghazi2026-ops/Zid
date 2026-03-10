import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllServices } from '../../services/servicesService';
import { getAllAssistants } from '../../services/assistantService';

export default function AdminHomeScreen({ navigation }) {
  const [pendingProductsCount, setPendingProductsCount] = useState(0);
  const [pendingAssistantsCount, setPendingAssistantsCount] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    // هنا هتجيب عدد المنتجات المعلقة من كل خدمة
    // حالياً هنخليها 0 مؤقتاً
    setPendingProductsCount(0);
    setPendingAssistantsCount(0);
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
      count: 0
    },
    {
      icon: 'cart',
      color: '#F59E0B',
      title: 'الطلبات',
      screen: 'AdminOrders',
      count: 0
    },
    {
      icon: 'apps',
      color: '#10B981',
      title: 'إدارة الخدمات',
      screen: 'ServicesManagement',
      count: 0
    },
    {
      icon: 'checkmark-done-circle',
      color: '#10B981',
      title: 'مراجعة المنتجات',
      screen: 'AdminProductsReview',
      count: pendingProductsCount
    },
    {
      icon: 'restaurant',
      color: '#EF4444',
      title: 'إدارة المطاعم',
      screen: 'ManageRestaurants',
      count: 0
    },
    {
      icon: 'home',
      color: '#8B5CF6',
      title: 'إدارة الشيفات',
      screen: 'ManageHomeChefs',
      count: 0
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
      count: pendingAssistantsCount
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
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>لوحة التحكم</Text>
          <Text style={styles.subtitle}>مرحباً بك في لوحة إدارة النظام</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>المستخدمين</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>الطلبات اليوم</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.statNumber}>8</Text>
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
