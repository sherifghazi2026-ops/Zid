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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../../appwrite/userService';

const appIcon = require('../../../assets/icons/Zidicon.png');

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
      if (result.success) {
        const user = result.data;
        if (user.role !== 'driver') {
          Alert.alert('خطأ', 'هذا الحساب ليس لمندوب');
          setLoading(false);
          return;
        }
        await AsyncStorage.setItem('userToken', user.userId);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        await AsyncStorage.setItem('userRole', 'driver');
        navigation.replace('DriverDashboard');
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={28} color="#3B82F6" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={appIcon} style={styles.logo} />
          </View>

          <Text style={styles.title}>دخول المندوبين</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="رقم التليفون"
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
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 100, height: 100, borderRadius: 50 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', marginBottom: 32 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1F2937' },
  loginButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, height: 56, justifyContent: 'center' },
  loginText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
