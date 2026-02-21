import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../../firebase/users';

const appIcon = require('../../../assets/icons/Zidicon.png');

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم التليفون');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('تنبيه', 'أدخل كلمة المرور');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('تنبيه', 'رقم التليفون غير صحيح (11 رقم)');
      return;
    }

    setLoading(true);
    
    try {
      const result = await loginUser(phone, password);
      
      if (result.success) {
        await AsyncStorage.setItem('userToken', 'logged_in');
        await AsyncStorage.setItem('userData', JSON.stringify(result.data));
        await AsyncStorage.setItem('userRole', result.data.role);
        
        if (result.data.role === 'admin') {
          navigation.replace('AdminHome');
        } else {
          // ✅ التوجيه الصحيح للشاشة المتداخلة
          navigation.replace('MainTabs', { screen: 'طلب' });
        }
        
      } else {
        Alert.alert('خطأ', result.error || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الاتصال');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image source={appIcon} style={styles.logo} />
          <Text style={styles.title}>ZAYED ID</Text>
          <Text style={styles.subtitle}>تسجيل الدخول</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>رقم التليفون</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="01xxxxxxxxx"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>كلمة المرور</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="********"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>دخول</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customerButton}
            onPress={() => {
              navigation.replace('MainTabs', { screen: 'طلب' });
            }}
          >
            <Text style={styles.customerButtonText}>الدخول كعميل (للاختبار)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>للتجار والمناديب: تواصل مع الإدارة للحصول على حساب</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginRight: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'right',
  },
  eyeButton: {
    padding: 10,
  },
  loginButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  customerButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});
