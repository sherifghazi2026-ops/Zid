import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../appwrite/userService';

const appIcon = require('../../assets/icon.png');

export default function ServiceProviderScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    setLoading(true);
    console.log('🔍 محاولة دخول برقم:', phone);

    const result = await loginUser(phone, password);

    if (result.success) {
      const user = result.data;
      console.log('✅ تم العثور على المستخدم:', user.name, '- الدور:', user.role);

      await AsyncStorage.setItem('userData', JSON.stringify(user));
      await AsyncStorage.setItem('userRole', user.role);
      await AsyncStorage.setItem('userPhone', phone);

      if (user.role === 'merchant') {
        console.log('🚀 توجيه إلى MerchantDashboard');
        navigation.replace('MerchantDashboard');
      } else if (user.role === 'home_chef') {
        console.log('🚀 توجيه إلى HomeChefDashboard');
        navigation.replace('HomeChefDashboard');
      } else if (user.role === 'driver') {
        console.log('🚀 توجيه إلى DriverDashboard');
        navigation.replace('DriverDashboard');
      } else if (user.role === 'admin') {
        console.log('🚀 توجيه إلى AdminHome');
        navigation.replace('AdminHome');
      } else {
        Alert.alert('خطأ', 'دخول غير مصرح به');
      }
    } else {
      Alert.alert('خطأ', result.error);
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={28} color="#4F46E5" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={appIcon} style={styles.logo} />
            <Text style={styles.title}>مقدمو الخدمة</Text>
            <Text style={styles.subtitle}>للتجار والشيفات والمناديب</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="رقم الهاتف"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginText}>دخول</Text>}
            </TouchableOpacity>

            <Text style={styles.hint}>
              يتم إنشاء الحسابات بواسطة الإدارة فقط. للاستفسار تواصل مع مدير النظام.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 40 },
  backButton: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 150, height: 150, borderRadius: 75, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { width: '100%' },
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
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1F2937' },
  loginButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  loginText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  hint: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 10 },
});
