import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const appIcon = require('../../assets/icons/Zidicon.png');

export default function CustomDrawer({ isLoggedIn, userData, onClose, navigation, onOpenAdminModal, pendingDishesCount = 0 }) {

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
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userPhone');
            await AsyncStorage.removeItem('userRole');
            onClose();
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }
      ]
    );
  };

  const handleVisitorLogin = async () => {
    await AsyncStorage.setItem('userRole', 'visitor');
    onClose();
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleAdminPress = () => {
    onClose();
    if (onOpenAdminModal) {
      setTimeout(() => {
        onOpenAdminModal();
      }, 300);
    }
  };

  const handleContact = () => {
    Linking.openURL('https://wa.me/201223369908');
  };

  // ✅ التنقل لإضافة طبق للشيف المنزلي
  const navigateToAddHomeChefDish = () => {
    onClose();
    navigation.navigate('AddHomeChefDishScreen', {
      chefId: userData.$id,
      chefName: userData.name
    });
  };

  // ✅ التنقل لإضافة طبق للمطعم
  const navigateToAddRestaurantDish = () => {
    onClose();
    navigation.navigate('AddDishScreen', {
      providerId: userData.$id,
      providerType: 'restaurant',
      providerName: userData.name
    });
  };

  // ✅ التنقل لأطباق الشيف المنزلي
  const navigateToMyChefDishes = () => {
    onClose();
    navigation.navigate('MyChefDishesScreen', {
      chefId: userData.$id,
      chefName: userData.name
    });
  };

  // ✅ التنقل لأطباق المطعم
  const navigateToMyRestaurantDishes = () => {
    onClose();
    navigation.navigate('MyDishesScreen', {
      providerId: userData.$id,
      providerType: 'restaurant',
      providerName: userData.name
    });
  };

  const navigateToAddDish = () => {
    onClose();
    if (userData?.merchantType === 'restaurant') {
      navigateToAddRestaurantDish();
    } else if (userData?.merchantType === 'home_chef') {
      navigateToAddHomeChefDish();
    }
  };

  const navigateToMyDishes = () => {
    onClose();
    if (userData?.merchantType === 'restaurant') {
      navigateToMyRestaurantDishes();
    } else if (userData?.merchantType === 'home_chef') {
      navigateToMyChefDishes();
    }
  };

  // الخدمات اللي ليها أطباق (مطاعم وشيفات)
  const SERVICES_WITH_ITEMS = ['restaurant', 'home_chef'];
  const isRestaurantOrChef = userData && SERVICES_WITH_ITEMS.includes(userData?.merchantType);

  // عناصر القائمة للزوار (مع دخول الأدمن)
  const guestMenuItems = [
    { icon: 'log-in-outline', title: 'تسجيل الدخول', screen: 'CustomerAuth', color: '#4F46E5' },
    { icon: 'people-outline', title: 'مقدمو الخدمة', screen: 'ServiceProvider', color: '#10B981' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'person-outline', title: 'الدخول كزائر', action: handleVisitorLogin, color: '#9CA3AF' },
    { icon: 'shield-outline', title: 'دخول الأدمن', action: handleAdminPress, color: '#EF4444' },
  ];

  // عناصر القائمة للعملاء (مع دخول الأدمن)
  const customerMenuItems = [
    { icon: 'person-outline', title: 'الملف الشخصي', screen: 'Profile', color: '#4F46E5' },
    { icon: 'cart-outline', title: 'طلباتي السابقة', screen: 'MyOrders', color: '#F59E0B' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
    { icon: 'shield-outline', title: 'دخول الأدمن', action: handleAdminPress, color: '#EF4444' },
  ];

  // ✅ عناصر القائمة للتجار (بدون دخول الأدمن)
  const merchantMenuItems = [
    { icon: 'home-outline', title: 'الرئيسية', screen: 'MerchantDashboard', color: '#4F46E5' },
    { icon: 'person-outline', title: 'الملف الشخصي', screen: 'Profile', color: '#4F46E5' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
    // ❌ تم إزالة adminAccessItem
  ];

  // ✅ عناصر القائمة للمناديب (بدون دخول الأدمن)
  const driverMenuItems = [
    { icon: 'home-outline', title: 'الرئيسية', screen: 'DriverDashboard', color: '#4F46E5' },
    { icon: 'bicycle-outline', title: 'التوصيلات', screen: 'DriverDeliveries', color: '#10B981' },
    { icon: 'person-outline', title: 'الملف الشخصي', screen: 'Profile', color: '#4F46E5' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
    // ❌ تم إزالة adminAccessItem
  ];

  // عناصر القائمة للأدمن (بدون زر دخول الأدمن)
  const adminMenuItems = [
    { icon: 'home-outline', title: 'الرئيسية', screen: 'AdminHome', color: '#4F46E5' },
    { icon: 'people-outline', title: 'المستخدمين', screen: 'UserManagement', color: '#F59E0B' },
    { icon: 'cart-outline', title: 'الطلبات', screen: 'AdminOrders', color: '#10B981' },
    { icon: 'business-outline', title: 'الأماكن', screen: 'ManagePlacesScreen', color: '#8B5CF6' },
    { icon: 'restaurant-outline', title: 'المطاعم', screen: 'ManageRestaurants', color: '#EC4899' },
    { icon: 'person-add-outline', title: 'إضافة مستخدم', screen: 'AddUser', color: '#3B82F6' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
  ];

  let menuItems = guestMenuItems;
  if (isLoggedIn) {
    if (userData?.role === 'customer') {
      menuItems = customerMenuItems;
    } else if (userData?.role === 'merchant') {
      menuItems = merchantMenuItems;
    } else if (userData?.role === 'driver') {
      menuItems = driverMenuItems;
    } else if (userData?.role === 'admin') {
      menuItems = adminMenuItems;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={appIcon} style={styles.logo} />
        <View style={styles.userInfo}>
          {isLoggedIn ? (
            <>
              <Text style={styles.userName}>{userData?.name || 'مستخدم'}</Text>
              <Text style={styles.userRole}>
                {userData?.role === 'merchant' ? 'تاجر' :
                 userData?.role === 'driver' ? 'مندوب' :
                 userData?.role === 'admin' ? 'مدير النظام' : 'عميل'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.userName}>زائر</Text>
              <Text style={styles.userRole}>مرحباً بك</Text>
            </>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.menuList}>
        {/* أقسام خاصة للمطاعم والشيفات */}
        {isRestaurantOrChef && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>إدارة الأطباق</Text>
            </View>

            {/* إضافة طبق جديد */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={navigateToAddDish}
            >
              <Ionicons name="add-circle" size={24} color="#10B981" />
              <Text style={[styles.menuText, { color: '#10B981' }]}>إضافة طبق جديد</Text>
            </TouchableOpacity>

            {/* أطباقي مع عداد المراجعة */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={navigateToMyDishes}
            >
              <Ionicons name="restaurant-outline" size={24} color="#F59E0B" />
              <Text style={[styles.menuText, { color: '#F59E0B' }]}>أطباقي</Text>
              {pendingDishesCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingDishesCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />
          </>
        )}

        {/* عناصر القائمة العادية */}
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => {
              if (item.action) {
                item.action();
              } else if (item.screen) {
                onClose();
                navigation.navigate(item.screen);
              }
            }}
          >
            <Ionicons name={item.icon} size={24} color={item.color} />
            <Text style={[styles.menuText, { color: item.color }]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Zid © 2026</Text>
        <Text style={styles.footerVersion}>الإصدار 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#4F46E5',
    padding: 20,
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userRole: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
  },
  menuList: {
    flex: 1,
    paddingTop: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 8,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footerVersion: {
    fontSize: 10,
    color: '#D1D5DB',
    marginTop: 4,
  },
});
