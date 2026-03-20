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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';
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

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('providerPhone');
    if (savedPhone) setPhone(savedPhone);
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('تنبيه', 'أدخل رقم الهاتف وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const email = `${phone}@provider.zid.app`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile.active) {
        Alert.alert('خطأ', 'هذا الحساب غير نشط. تواصل مع الإدارة');
        setLoading(false);
        return;
      }

      if (profile.role !== 'merchant') {
        Alert.alert('خطأ', 'هذا الحساب ليس لمقدم خدمة');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('userData', JSON.stringify(profile));
      await AsyncStorage.setItem('userRole', profile.role);
      await AsyncStorage.setItem('userPhone', phone);
      await AsyncStorage.setItem('providerPhone', phone);

      Alert.alert('مرحباً', `تم تسجيل الدخول بنجاح`);
      navigation.replace('MerchantDashboard');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ في الاتصال');
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
      <TouchableOpacity
        onPress={() => setDrawerVisible(true)}
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={28} color="#1F2937" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logoContainer}>
            <Image source={appIcon} style={styles.logo} />
          </View>

          <Text style={styles.title}>دخول مقدمي الخدمة</Text>
          <Text style={styles.subtitle}>أدخل بياناتك للدخول</Text>

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

            <TouchableOpacity onPress={handleVisitor} style={styles.visitorButton}>
              <Text style={styles.visitorText}>دخول كزائر</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomDrawer
              isLoggedIn={isLoggedIn}
              userData={userData}
              onClose={() => setDrawerVisible(false)}
              navigation={navigation}
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
    paddingBottom: 40,
  },
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
  visitorButton: {
    alignItems: 'center',
    marginVertical: 10,
    marginBottom: 20,
  },
  visitorText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
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
