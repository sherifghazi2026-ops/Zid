import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

const appIcon = require('../../assets/icon.png');

export default function CustomerAuthScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const savedName = await AsyncStorage.getItem('userName');
    const savedPhone = await AsyncStorage.getItem('userPhone');
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('تنبيه', 'أدخل رقم الهاتف وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const users = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.equal('phone', phone),
          Query.equal('password', password),
          Query.limit(1)
        ]
      );

      if (users.documents.length === 0) {
        Alert.alert('خطأ', 'رقم الهاتف أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      const user = users.documents[0];

      if (!user.active) {
        Alert.alert('خطأ', 'هذا الحساب غير نشط. تواصل مع الإدارة');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('userData', JSON.stringify(user));
      await AsyncStorage.setItem('userRole', user.role);
      await AsyncStorage.setItem('userPhone', phone);
      if (user.name) await AsyncStorage.setItem('userName', user.name);

      Alert.alert('مرحباً', `تم تسجيل الدخول بنجاح`);

      if (user.role === 'admin') {
        navigation.replace('AdminHome');
      } else if (user.role === 'merchant') {
        navigation.replace('MerchantDashboard');
      } else if (user.role === 'home_chef') {
        navigation.replace('HomeChefDashboard');
      } else if (user.role === 'driver') {
        navigation.replace('DriverDashboard');
      } else {
        navigation.replace('MainTabs');
      }

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('خطأ', 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password) {
      Alert.alert('تنبيه', 'الرجاء إدخال جميع البيانات');
      return;
    }

    setLoading(true);
    try {
      const existing = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('phone', phone)]
      );

      if (existing.documents.length > 0) {
        Alert.alert('خطأ', 'رقم الهاتف مسجل مسبقاً');
        setLoading(false);
        return;
      }

      const userData = {
        name,
        phone,
        password,
        role: 'customer',
        active: true,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        userData
      );

      await AsyncStorage.setItem('userData', JSON.stringify(response));
      await AsyncStorage.setItem('userRole', 'customer');
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('userPhone', phone);

      Alert.alert('مرحباً بك', `تم إنشاء حسابك بنجاح`);
      navigation.replace('MainTabs');

    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('خطأ', 'فشل في إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitor = () => {
    AsyncStorage.setItem('userRole', 'visitor');
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={28} color="#4F46E5" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={appIcon} style={styles.logo} />
          </View>

          <Text style={styles.title}>
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </Text>

          <Text style={styles.subtitle}>
            {isLogin ? 'أدخل بياناتك للدخول' : 'أدخل بياناتك للتسجيل'}
          </Text>

          <View style={styles.form}>

            {!isLogin && (
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="الاسم الكامل"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            )}

            <TextInput
              style={[styles.input, { color: "#1F2937" }]}
              placeholder="رقم الهاتف"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={[styles.input, { color: "#1F2937" }]}
              placeholder="كلمة المرور"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'دخول' : 'تسجيل'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
              <Text style={styles.switchText}>
                {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب؟ سجل دخول'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.visitorButton} onPress={handleVisitor}>
              <Text style={styles.visitorButtonText}>الدخول كزائر</Text>
            </TouchableOpacity>

            <View style={styles.providerSection}>
              <Text style={styles.providerTitle}>للتجار والشيفات والمناديب</Text>
              <TouchableOpacity 
                style={styles.providerButton}
                onPress={() => navigation.navigate('ServiceProvider')}
              >
                <Ionicons name="arrow-back" size={20} color="#4F46E5" />
                <Text style={styles.providerButtonText}>دخول مقدمي الخدمة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingTop: 40 },
  backButton: { marginBottom: 20, alignSelf: 'flex-start' },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  form: { width: '100%' },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    marginVertical: 10,
  },
  switchText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  visitorButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  visitorButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  providerSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  providerTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  providerButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
});
