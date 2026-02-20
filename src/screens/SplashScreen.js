import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const appIcon = require('../../assets/icons/Zidicon.png');

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // نتأخر شوية عشان نظهر الشعار
      setTimeout(async () => {
        const userToken = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');
        
        if (userToken) {
          // لو فيه مستخدم مسجل دخول، نوجهه حسب صلاحيته
          switch(userRole) {
            case 'merchant':
              navigation.replace('MerchantHome');
              break;
            case 'driver':
              navigation.replace('DriverHome');
              break;
            case 'admin':
              navigation.replace('AdminHome');
              break;
            default:
              navigation.replace('CustomerHome');
          }
        } else {
          // لو مفيش، نروح لشاشة الدخول
          navigation.replace('Login');
        }
      }, 2000); // 2 ثانية تأخير
      
    } catch (error) {
      console.error('خطأ في التحقق من الجلسة:', error);
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={appIcon} style={styles.logo} />
      <Text style={styles.title}>ZAYED ID</Text>
      <Text style={styles.subtitle}>كل الخدمات في مكان واحد</Text>
      <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFF',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 30,
  },
  loader: {
    marginTop: 20,
  },
});
