import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../../firebase/users';

export default function DriverLoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('تنبيه', 'أدخل رقم التليفون وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser(phone, password);
      if (result.success && result.data.role === 'driver') {
        await AsyncStorage.setItem('userToken', 'logged_in');
        await AsyncStorage.setItem('userData', JSON.stringify(result.data));
        await AsyncStorage.setItem('userRole', 'driver');
        navigation.replace('MainTabs');
      } else {
        Alert.alert('خطأ', 'بيانات الدخول غير صحيحة للمندوب');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="bicycle-outline" size={60} color="#3B82F6" />
          <Text style={styles.title}>دخول المندوبين</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="رقم التليفون"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="كلمة المرور"
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 40, left: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  input: { flex: 1, paddingVertical: 15, fontSize: 16 },
  loginButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
