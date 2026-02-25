import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeProfile } from '../appwrite/userService';

export default function CompleteProfileScreen({ navigation, route }) {
  const { userId, role } = route.params; // role: 'merchant' or 'driver'

  // حقول مشتركة
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState(null);

  // حقول خاصة بالتاجر
  const [merchantType, setMerchantType] = useState('');

  // حقول خاصة بالمندوب
  const [serviceArea, setServiceArea] = useState('');
  const [maxRadius, setMaxRadius] = useState('10');

  const [loading, setLoading] = useState(false);

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

      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (addressResult) {
        setAddress(`${addressResult.region || ''} - ${addressResult.city || ''} - ${addressResult.street || ''}`);
        if (role === 'driver') {
          setServiceArea(addressResult.region || '');
        }
      }

      Alert.alert('تم', 'تم تحديد موقعك بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في الحصول على الموقع');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    // التحقق من الحقول المطلوبة
    if (!name || !phone || !address) {
      Alert.alert('تنبيه', 'الرجاء إدخال جميع البيانات الأساسية');
      return;
    }

    if (role === 'merchant' && !merchantType) {
      Alert.alert('تنبيه', 'الرجاء إدخال نوع النشاط التجاري');
      return;
    }

    if (role === 'driver' && !serviceArea) {
      Alert.alert('تنبيه', 'الرجاء إدخال منطقة الخدمة');
      return;
    }

    setLoading(true);

    const profileData = {
      name,
      phone,
      address,
      role,
      locationLat: location?.latitude,
      locationLng: location?.longitude,
    };

    if (role === 'merchant') {
      profileData.merchantType = merchantType;
    } else if (role === 'driver') {
      profileData.serviceArea = serviceArea;
      profileData.maxDeliveryRadius = parseFloat(maxRadius);
    }

    const result = await completeProfile(userId, profileData);

    if (result.success) {
      // جلب بيانات المستخدم كاملة وحفظها
      const userData = { ...result.data, profileCompleted: true };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.removeItem('tempUserData');

      Alert.alert('تم', 'تم إكمال البيانات بنجاح');
      
      // التوجيه للوحة التحكم المناسبة
      if (role === 'merchant') {
        navigation.replace('MerchantDashboard');
      } else {
        navigation.replace('DriverDashboard');
      }
    } else {
      Alert.alert('خطأ', result.error);
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إكمال البيانات</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcomeText}>مرحباً بك!</Text>
        <Text style={styles.instruction}>
          {role === 'merchant' 
            ? 'لنبدأ بتسجيل متجرك وتحديد موقعه'
            : 'لنبدأ بتحديد منطقتك وبياناتك كمندوب'
          }
        </Text>

        {/* حقول مشتركة */}
        <View style={styles.form}>
          <Text style={styles.label}>الاسم الكامل</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="الاسم"
          />

          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="رقم الهاتف"
            keyboardType="phone-pad"
          />

          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation} disabled={gettingLocation}>
            {gettingLocation ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#4F46E5" />
                <Text style={styles.locationButtonText}>تحديد موقعي الحالي</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>العنوان بالتفصيل</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="العنوان"
            multiline
            numberOfLines={3}
          />

          {/* حقول خاصة بالتاجر */}
          {role === 'merchant' && (
            <>
              <Text style={styles.label}>نوع النشاط التجاري</Text>
              <TextInput
                style={styles.input}
                value={merchantType}
                onChangeText={setMerchantType}
                placeholder="مثال: مطاعم، سوبر ماركت، صيدلية"
              />
            </>
          )}

          {/* حقول خاصة بالمندوب */}
          {role === 'driver' && (
            <>
              <Text style={styles.label}>منطقة الخدمة</Text>
              <TextInput
                style={styles.input}
                value={serviceArea}
                onChangeText={setServiceArea}
                placeholder="مثال: الشيخ زايد"
              />

              <Text style={styles.label}>أقصى مسافة توصيل (كم)</Text>
              <TextInput
                style={styles.input}
                value={maxRadius}
                onChangeText={setMaxRadius}
                keyboardType="numeric"
              />
            </>
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>حفظ ومتابعة</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  instruction: { fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  locationButtonText: { color: '#4F46E5', fontSize: 14, fontWeight: '500' },
  submitButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
