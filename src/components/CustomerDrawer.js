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

const appIcon = require('../../assets/icon.png');

export default function CustomerDrawer({ isLoggedIn, userData, onClose, navigation, onOpenAdminModal }) {

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
              routes: [{ name: 'HomeScreen' }],
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

  const guestMenuItems = [
    { icon: 'log-in-outline', title: 'تسجيل الدخول', screen: 'CustomerAuth', color: '#4F46E5' },
    { icon: 'people-outline', title: 'مقدمو الخدمة', screen: 'ServiceProvider', color: '#10B981' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'shield-outline', title: 'دخول الأدمن', action: handleAdminPress, color: '#EF4444' },
  ];

  const customerMenuItems = [
    { icon: 'person-outline', title: 'الملف الشخصي', screen: 'Profile', color: '#4F46E5' },
    { icon: 'cart-outline', title: 'طلباتي السابقة', screen: 'MyOrders', color: '#F59E0B' },
    { icon: 'logo-whatsapp', title: 'تواصل معنا', action: handleContact, color: '#25D366' },
    { icon: 'log-out-outline', title: 'تسجيل الخروج', action: handleLogout, color: '#EF4444' },
  ];

  const menuItems = isLoggedIn ? customerMenuItems : guestMenuItems;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={appIcon} style={styles.logo} />
        </View>
        <View style={styles.userInfo}>
          {isLoggedIn ? (
            <>
              <Text style={styles.userName}>{userData?.name || 'عميل'}</Text>
              <Text style={styles.userPhone}>{userData?.phone || ''}</Text>
            </>
          ) : (
            <>
              <Text style={styles.userName}>زائر</Text>
              <Text style={styles.userPhone}>مرحباً بك</Text>
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
  userPhone: {
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
