import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../../appwrite/userService';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('تنبيه', 'أدخل رقم التليفون وكلمة المرور');
      return;
    }

    setLoading(true);
    const result = await loginUser(phone, password);
    
    if (result.success) {
      const user = result.data;
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      if (user.role === 'merchant') {
        navigation.replace('MerchantDashboard');
      } else if (user.role === 'driver') {
        navigation.replace('DriverDashboard');
      } else if (user.role === 'admin') {
        navigation.replace('AdminHome');
      } else {
        Alert.alert('خطأ', 'غير مصرح بالدخول');
      }
    } else {
      Alert.alert('خطأ', result.error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#4F46E5" />
        </TouchableOpacity>

        <Text style={styles.title}>دخول التجار والمناديب</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="رقم التليفون" placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="كلمة المرور" placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginText}>دخول</Text>}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>ليس لديك حساب؟</Text>
            <View style={styles.registerButtons}>
              <TouchableOpacity 
                style={[styles.registerButton, styles.merchantButton]}
                onPress={() => navigation.navigate('MerchantRegister', { role: 'merchant' })}
              >
                <Text style={styles.registerButtonText}>تسجيل تاجر</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.registerButton, styles.driverButton]}
                onPress={() => navigation.navigate('MerchantRegister', { role: 'driver' })}
              >
                <Text style={styles.registerButtonText}>تسجيل مندوب</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, right: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', marginBottom: 30 },
  form: { width: '100%' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  loginButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  loginText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { marginTop: 20, alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  registerButtons: { flexDirection: 'row', gap: 10 },
  registerButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  merchantButton: { backgroundColor: '#F59E0B' },
  driverButton: { backgroundColor: '#3B82F6' },
  registerButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
