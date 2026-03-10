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

          if (userData && userRole) {
            const parsed = JSON.parse(userData);

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
            navigation.replace('MainTabs');
          }
        }, 2000);
      } catch (error) {
        navigation.replace('MainTabs');
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
    lineHeight: 28,
  },
});
