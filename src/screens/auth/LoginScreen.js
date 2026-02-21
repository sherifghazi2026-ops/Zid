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
    if (!phone.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم التليفون وكلمة المرور');
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
          navigation.replace('MainTabs');
        }
      } else {
        Alert.alert('خطأ', result.error || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
        <Image source={appIcon} style={styles.logo} />
        <Text style={styles.title}>دخول التجار والمناديب</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="رقم التليفون"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginText}>دخول</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  backButton: { position: 'absolute', top: 40, left: 20 },
  backText: { color: '#4F46E5', fontSize: 16 },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  form: { width: '100%' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 15, marginBottom: 15 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15 },
  loginButton: { backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center' },
  loginText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
