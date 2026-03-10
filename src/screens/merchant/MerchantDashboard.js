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
import { getMerchantOrders } from '../../services/orderService';
import { getAllServices } from '../../services/servicesService';

export default function MerchantDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [acceptedOrders, setAcceptedOrders] = useState(0);
  const [availableServices, setAvailableServices] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const user = JSON.parse(data);
      setUserData(user);
      await loadOrdersCount(user.$id);
      await loadAvailableServices(user);
    } else {
      setLoading(false);
    }
  };

  const loadOrdersCount = async (merchantId) => {
    const result = await getMerchantOrders(merchantId);
    if (result.success) {
      const pending = result.data.filter(o => o.status === 'pending').length;
      const accepted = result.data.filter(o => 
        ['accepted', 'preparing', 'on_the_way'].includes(o.status)
      ).length;
      setPendingOrders(pending);
      setAcceptedOrders(accepted);
    }
  };

  const loadAvailableServices = async (user) => {
    const result = await getAllServices();
    if (result.success) {
      // فلترة الخدمات اللي:
      // 1. ليها منتجات (hasItems = true)
      // 2. ليها itemsCollection حقيقي
      // 3. مستبعدين الخدمة العامة
      const services = result.data.filter(s => 
        s.hasItems && 
        s.itemsCollection && 
        s.id !== 'general' &&
        s.merchantType === user.merchantType
      );
      setAvailableServices(services);
    }
    setLoading(false);
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

  const getMerchantTypeName = (type) => {
    const types = {
      'restaurant': 'مطعم',
      'home_chef': 'شيف منزلي',
      'bakery': 'مخبز',
      'drinks': 'مشروبات',
      'milk': 'منتجات ألبان',
      'merchant': 'تاجر',
    };
    return types[type] || type;
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
      <ScrollView contentContainerStyle={styles.content}>
        {/* رأس الصفحة */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>مرحباً، {userData?.name}</Text>
            <View style={styles.merchantTypeBadge}>
              <Text style={styles.merchantTypeText}>
                {getMerchantTypeName(userData?.merchantType)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* بطاقات الإحصائيات */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.statNumber}>{pendingOrders}</Text>
            <Text style={styles.statLabel}>طلبات معلقة</Text>
            <Ionicons name="time-outline" size={24} color="#92400E" />
          </View>

          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.statNumber}>{acceptedOrders}</Text>
            <Text style={styles.statLabel}>طلبات نشطة</Text>
            <Ionicons name="checkmark-circle-outline" size={24} color="#1E40AF" />
          </View>
        </View>

        {/* القائمة الرئيسية */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>القائمة الرئيسية</Text>

          {/* زر الطلبات */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MerchantOrdersScreen')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#4F46E520' }]}>
              <Ionicons name="cart-outline" size={24} color="#4F46E5" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>الطلبات</Text>
              <Text style={styles.menuSubtitle}>عرض وإدارة الطلبات</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* زر المنتجات */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyProductsScreen')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="cube-outline" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>منتجاتي</Text>
              <Text style={styles.menuSubtitle}>إضافة وتعديل المنتجات</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* عرض الخدمات المتاحة للإضافة السريعة */}
          {availableServices.length > 0 && (
            <View style={styles.quickAddSection}>
              <Text style={styles.quickAddTitle}>إضافة منتج لـ:</Text>
              <View style={styles.servicesList}>
                {availableServices.map(service => (
                  <TouchableOpacity
                    key={service.$id}
                    style={[styles.serviceButton, { backgroundColor: service.color + '20' }]}
                    onPress={() => navigation.navigate('AddProductScreen', {
                      service,
                      providerId: userData.$id,
                      providerName: userData.name,
                      providerType: userData.merchantType
                    })}
                  >
                    <Text style={[styles.serviceButtonText, { color: service.color }]}>
                      {service.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* زر الملف الشخصي */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#6B728020' }]}>
              <Ionicons name="person-outline" size={24} color="#4B5563" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>الملف الشخصي</Text>
              <Text style={styles.menuSubtitle}>عرض وتعديل بياناتك</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* معلومات التاجر */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>معلومات التاجر</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>رقم الهاتف:</Text>
            <Text style={styles.infoValue}>{userData?.phone}</Text>
          </View>
          {userData?.deliveryFee !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>رسوم التوصيل:</Text>
              <Text style={styles.infoValue}>{userData.deliveryFee} ج</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  merchantTypeBadge: {
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  merchantTypeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 8,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickAddSection: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
});
