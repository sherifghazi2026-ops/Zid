import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';
import { uploadToImageKit } from '../services/uploadService';

export default function CompleteProfileScreen({ navigation, route }) {
  const { userId, role } = route.params;

  const [address, setAddress] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [maxRadius, setMaxRadius] = useState('10');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [idImage, setIdImage] = useState(null);
  const [commercialImage, setCommercialImage] = useState(null);
  const [taxImage, setTaxImage] = useState(null);
  const [uploading, setUploading] = useState(false);

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
        setServiceArea(addressResult.region || '');
      }

      Alert.alert('تم', 'تم تحديد موقعك بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في الحصول على الموقع');
    } finally {
      setGettingLocation(false);
    }
  };

  const pickImage = async (setter) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح بالوصول للمعرض');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets) {
        setter(result.assets[0].uri);
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
    }
  };

  const handleComplete = async () => {
    if (!address) {
      Alert.alert('تنبيه', 'الرجاء إدخال العنوان');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let idUrl = null;
      let commercialUrl = null;
      let taxUrl = null;

      if (idImage) {
        const uploadRes = await uploadToImageKit(idImage, `id_${Date.now()}.jpg`, 'verification');
        if (uploadRes.success) idUrl = uploadRes.fileUrl;
      }
      if (commercialImage) {
        const uploadRes = await uploadToImageKit(commercialImage, `commercial_${Date.now()}.jpg`, 'verification');
        if (uploadRes.success) commercialUrl = uploadRes.fileUrl;
      }
      if (taxImage) {
        const uploadRes = await uploadToImageKit(taxImage, `tax_${Date.now()}.jpg`, 'verification');
        if (uploadRes.success) taxUrl = uploadRes.fileUrl;
      }

      const updateData = {
        address: address,
        service_area: serviceArea,
        max_delivery_radius: parseFloat(maxRadius),
        location_lat: location?.latitude || null,
        location_lng: location?.longitude || null,
        verification_image: idUrl,
        commercial_register: commercialUrl,
        tax_card: taxUrl,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      await AsyncStorage.setItem('profileCompleted', 'true');
      
      Alert.alert('✅ تم', 'تم إكمال الملف الشخصي بنجاح');
      
      if (role === 'merchant') {
        navigation.replace('MerchantDashboard');
      } else if (role === 'driver') {
        navigation.replace('DriverDashboard');
      } else {
        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('خطأ في إكمال الملف:', error);
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>إكمال الملف الشخصي</Text>

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
          style={styles.input}
          placeholder="العنوان بالتفصيل"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <TextInput
          style={styles.input}
          placeholder="منطقة الخدمة"
          value={serviceArea}
          onChangeText={setServiceArea}
        />

        <TextInput
          style={styles.input}
          placeholder="أقصى مسافة توصيل (كم)"
          value={maxRadius}
          onChangeText={setMaxRadius}
          keyboardType="numeric"
        />

        <Text style={styles.sectionLabel}>📄 المستندات المطلوبة</Text>

        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setIdImage)}>
          <Ionicons name="id-card" size={24} color="#4F46E5" />
          <Text style={styles.uploadButtonText}>
            {idImage ? '✅ تم اختيار صورة البطاقة' : 'رفع صورة البطاقة الشخصية'}
          </Text>
        </TouchableOpacity>

        {role === 'merchant' && (
          <>
            <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setCommercialImage)}>
              <Ionicons name="business" size={24} color="#4F46E5" />
              <Text style={styles.uploadButtonText}>
                {commercialImage ? '✅ تم اختيار السجل التجاري' : 'رفع السجل التجاري (اختياري)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setTaxImage)}>
              <Ionicons name="document-text" size={24} color="#4F46E5" />
              <Text style={styles.uploadButtonText}>
                {taxImage ? '✅ تم اختيار البطاقة الضريبية' : 'رفع البطاقة الضريبية (اختياري)'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.completeButton, (loading || uploading) && styles.disabled]}
          onPress={handleComplete}
          disabled={loading || uploading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.completeButtonText}>إكمال الملف</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 20 },
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
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadButtonText: { fontSize: 14, color: '#4B5563', flex: 1 },
  completeButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  disabled: { opacity: 0.6 },
  completeButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
