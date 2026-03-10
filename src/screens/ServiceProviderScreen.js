import React, { useState } from 'react';
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
import { loginUser } from '../appwrite/userService';
import CustomDrawer from '../components/CustomDrawer';

const appIcon = require('../../assets/icons/Zidicon.png');

export default function ServiceProviderScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('تنبيه', 'أدخل رقم الهاتف وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(phone, password);

      if (result.success) {
        const user = result.data;

        if (!user.active) {
          Alert.alert('خطأ', 'هذا الحساب غير نشط. تواصل مع الإدارة');
          setLoading(false);
          return;
        }

        await AsyncStorage.setItem('userData', JSON.stringify(user));
        await AsyncStorage.setItem('userRole', user.role);
        await AsyncStorage.setItem('userPhone', phone);
        if (user.name) await AsyncStorage.setItem('userName', user.name);

        if (user.role === 'admin') {
          navigation.replace('AdminHome');
        } else if (user.role === 'merchant') {
          navigation.replace('MerchantDashboard');
        } else if (user.role === 'driver') {
          navigation.replace('DriverDashboard');
        } else {
          Alert.alert('خطأ', 'غير مصرح بالدخول');
        }
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* ✅ زر الـ Drawer في أعلى اليسار - مسافة أكبر */}
      <TouchableOpacity
        onPress={() => setDrawerVisible(true)}
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={28} color="#1F2937" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          {/* ✅ شعار مرفوع لأعلى مع مسافة أقل من زر القائمة */}
          <View style={styles.logoContainer}>
            <Image source={appIcon} style={styles.logo} />
          </View>

          <Text style={styles.title}>
            مقدمو الخدمة
          </Text>

          <Text style={styles.subtitle}>
            للتجار والمناديب
          </Text>

          <View style={styles.form}>
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
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>دخول</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                يتم إنشاء الحسابات بواسطة الإدارة فقط. للاستفسار تواصل مع مدير النظام.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ Drawer Modal */}
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
  // ✅ زر القائمة في أعلى اليسار - مسافة أكبر للسهولة
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 40, // ✅ زيادة المسافة العلوية
    left: 16,
    zIndex: 1000,
    padding: 10, // ✅ زيادة حجم الزر
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 20, // ✅ زيادة المسافة العلوية للمحتوى
  },
  // ✅ شعار مرفوع لأعلى
  logoContainer: {
    alignItems: 'center',
    marginTop: 0, // ✅ الشعار قريب من زر القائمة
    marginBottom: -60, // ✅ تعديل المسافة السالبة لسحب الشعار لأعلى
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
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
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
