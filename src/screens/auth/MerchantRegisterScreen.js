import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, SafeAreaView, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { registerUser } from '../../appwrite/userService';

export default function MerchantRegisterScreen({ navigation, route }) {
  const { role } = route.params; // 'merchant' or 'driver'
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [maxRadius, setMaxRadius] = useState('10');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState(null);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للموقع');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      // الحصول على العنوان من الإحداثيات
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (addressResult) {
        setAddress(`${addressResult.region || ''} - ${addressResult.city || ''} - ${addressResult.street || ''}`);
        setServiceArea(addressResult.region || '');
      }

      Alert.alert('تم', 'تم تحديد موقعك بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في الحصول على الموقع');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password || !address) {
      Alert.alert('تنبيه', 'الرجاء إدخال جميع البيانات');
      return;
    }

    setLoading(true);
    const userData = {
      name,
      phone,
      password,
      role,
      address,
      serviceArea,
      maxDeliveryRadius: parseFloat(maxRadius),
      locationLat: location?.latitude || null,
      locationLng: location?.longitude || null,
      isAvailable: true,
    };

    const result = await registerUser(userData);
    
    if (result.success) {
      Alert.alert('تم التسجيل', `تم تسجيل ${role === 'merchant' ? 'التاجر' : 'المندوب'} بنجاح`);
      navigation.goBack();
    } else {
      Alert.alert('خطأ', result.error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#4F46E5" />
        </TouchableOpacity>

        <Text style={styles.title}>
          {role === 'merchant' ? 'تسجيل تاجر جديد' : 'تسجيل مندوب جديد'}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="الاسم" placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="رقم الهاتف" placeholderTextColor="#9CA3AF"
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

          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#4F46E5" />
                <Text style={styles.locationButtonText}>حدد موقعي الحالي</Text>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="العنوان بالتفصيل" placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="منطقة الخدمة (مثال: الشيخ زايد)" placeholderTextColor="#9CA3AF"
            value={serviceArea}
            onChangeText={setServiceArea}
          />

          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="أقصى مسافة توصيل (كم)" placeholderTextColor="#9CA3AF"
            value={maxRadius}
            onChangeText={setMaxRadius}
            keyboardType="numeric"
          />

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : 
              <Text style={styles.registerText}>تسجيل</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 24, textAlign: 'center' },
  form: { width: '100%' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  locationButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#EEF2FF', 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 16,
    gap: 8,
  },
  locationButtonText: { color: '#4F46E5', fontSize: 16, fontWeight: '500' },
  registerButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  registerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
