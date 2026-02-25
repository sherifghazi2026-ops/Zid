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

export default function CustomDrawer({ isLoggedIn, userData, onClose, navigation, onOpenAdminModal }) {
  
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

  // عناصر القائمة للزوار
  const guestMenuItems = [
    { icon: 'log-in-outline', title: 'تسجيل الدخول', screen: 'CustomerAuth', color: '#4F46E5' },
    { icon: 'people-outline', title: 'مقدمو الخدمة', screen: 'ServiceProvider', color: '#10B981' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'shield-outline', title: 'دخول الأدمن', action: handleAdminPress, color: '#EF4444' },
  ];

  // عناصر القائمة للعملاء
  const customerMenuItems = [
    { icon: 'person-outline', title: 'الملف الشخصي', screen: 'Profile', color: '#4F46E5' },
    { icon: 'cart-outline', title: 'طلباتي السابقة', screen: 'MyOrders', color: '#F59E0B' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
  ];

  // عناصر القائمة للتجار
  const merchantMenuItems = [
    { icon: 'home-outline', title: 'الرئيسية', screen: 'MerchantDashboard', color: '#4F46E5' },
    { icon: 'person-outline', title: 'الملف الشخصي', screen: 'Profile', color: '#4F46E5' },
    { icon: 'cart-outline', title: 'طلباتي', screen: 'MyOrders', color: '#F59E0B' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
  ];

  // عناصر القائمة للمناديب
  const driverMenuItems = [
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
  ];

  // عناصر القائمة للأدمن
  const adminMenuItems = [
    { icon: 'home-outline', title: 'الرئيسية', screen: 'AdminHome', color: '#4F46E5' },
    { icon: 'people-outline', title: 'المستخدمين', screen: 'UserManagement', color: '#F59E0B' },
    { icon: 'cart-outline', title: 'الطلبات', screen: 'AdminOrders', color: '#10B981' },
    { icon: 'person-add-outline', title: 'إضافة مستخدم', screen: 'AddUser', color: '#8B5CF6' },
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
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => {
              if (item.action) {
                item.action();
              } else if (item.screen) {
                onClose();
                if (navigation && navigation.navigate) {
                  navigation.navigate(item.screen);
                } else {
                  console.error('navigation غير متوفر');
                }
              }
            }}
          >
            <Ionicons name={item.icon} size={24} color={item.color} />
            <Text style={[styles.menuText, { color: item.color }]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>ZAYED ID © 2026</Text>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFF',
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
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
