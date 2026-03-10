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
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import CustomDrawer from '../components/CustomDrawer';

const appIcon = require('../../assets/icons/Zidicon.png');

export default function CustomerAuthScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* زر الـ Drawer في أعلى اليسار */}
      <TouchableOpacity
        onPress={() => setDrawerVisible(true)}
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={28} color="#1F2937" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* شعار مرفوع لأعلى */}
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
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="الاسم الكامل"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="رقم الهاتف"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="كلمة المرور"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

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

            {/* ✅ تم إزالة visitorButton من هنا - سيكون في الـ Drawer فقط */}

            {/* ❌ تم إزالة providerSection بالكامل */}
            {/* ❌ تم إزالة footer بالكامل */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Drawer Modal */}
      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomDrawer
              isLoggedIn={isLoggedIn}
              userData={userData}
              onClose={() => setDrawerVisible(false)}
              navigation={navigation}
              onOpenAdminModal={() => {}}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // زر القائمة في أعلى اليسار
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 40,
    left: 16,
    zIndex: 1000,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 40, // إضافة مساحة سفلية بسيطة
  },
  // شعار مرفوع لأعلى
  logoContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: -60,
  },
  logo: {
    width: 600,
    height: 300,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
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
    marginBottom: 20, // مسافة بعد الرابط
  },
  switchText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  // ❌ تم إزالة visitorButton, providerSection, footer
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '80%',
    overflow: 'hidden',
  },
});
