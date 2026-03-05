import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setTimeout(async () => {
          const userData = await AsyncStorage.getItem('userData');
          const userRole = await AsyncStorage.getItem('userRole');

          console.log('Splash - userData:', userData ? 'موجود' : 'غير موجود');
          console.log('Splash - userRole:', userRole);

          if (userData && userRole) {
            const parsed = JSON.parse(userData);
            console.log('Splash - user role:', parsed.role);
            
            if (parsed.role === 'merchant') {
              navigation.replace('MerchantDashboard');
            } else if (parsed.role === 'driver') {
              navigation.replace('DriverDashboard');
            } else if (parsed.role === 'admin') {
              navigation.replace('AdminHome');
            } else {
              navigation.replace('MainTabs');
            }
          } else {
            console.log('Splash - لا يوجد مستخدم مسجل، التوجيه إلى HomeScreen');
            navigation.replace('HomeScreen');
          }
        }, 2000);
      } catch (error) {
        console.log('خطأ في التحقق من الجلسة:', error);
        navigation.replace('HomeScreen');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icons/ZidiconSP.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>كل الخدمات في مكان واحد</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 300,
    height: 150,
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 30,
    letterSpacing: 0.5,
    lineHeight: 28,
  },
});
