import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, SafeAreaView, ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Checkbox from 'expo-checkbox';
import { createUserByAdmin, acceptTerms } from '../../appwrite/userService';
import { uploadToImageKit } from '../../services/uploadService';
import { useTerms } from '../../context/TermsContext';
import { fontFamily } from '../../utils/fonts';

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
  
  // استخدام Context للشروط
  const { termsAccepted, acceptTerms: acceptTermsContext } = useTerms();

  // حقول التوثيق
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

  const handleRegister = async () => {
    if (!name || !phone || !password || !address) {
      Alert.alert('تنبيه', 'الرجاء إدخال جميع البيانات');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('تنبيه', 'يجب الموافقة على شروط الاستخدام');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // رفع الصور إن وجدت
      let idUrl = null;
      let commercialUrl = null;
      let taxUrl = null;

      if (idImage) {
        const uploadRes = await uploadToImageKit(idImage, `id_${Date.now()}.jpg`, 'verification', name);
        if (uploadRes.success) idUrl = uploadRes.fileUrl;
      }
      if (commercialImage) {
        const uploadRes = await uploadToImageKit(commercialImage, `commercial_${Date.now()}.jpg`, 'verification', name);
        if (uploadRes.success) commercialUrl = uploadRes.fileUrl;
      }
      if (taxImage) {
        const uploadRes = await uploadToImageKit(taxImage, `tax_${Date.now()}.jpg`, 'verification', name);
        if (uploadRes.success) taxUrl = uploadRes.fileUrl;
      }

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
        verificationImage: idUrl,
        commercialRegister: commercialUrl,
        taxCard: taxUrl,
        isVerified: false,
      };

      const result = await createUserByAdmin(userData);

      if (result.success) {
        // تسجيل الموافقة على الشروط
        await acceptTerms(result.data.$id);
        acceptTermsContext(); // تحديث حالة الموافقة محلياً
        
        Alert.alert('تم التسجيل', `تم تسجيل ${role === 'merchant' ? 'التاجر' : 'المندوب'} بنجاح. بانتظار مراجعة المستندات من الإدارة.`);
        navigation.goBack();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إتمام التسجيل');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#4F46E5" />
        </TouchableOpacity>

        <Text style={[styles.title, { fontFamily: fontFamily.arabic }]}>
          {role === 'merchant' ? 'تسجيل تاجر جديد' : 'تسجيل مندوب جديد'}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { fontFamily: fontFamily.arabic }]}
            placeholder="الاسم"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={[styles.input, { fontFamily: fontFamily.arabic }]}
            placeholder="رقم الهاتف"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { fontFamily: fontFamily.arabic }]}
            placeholder="كلمة المرور"
            placeholderTextColor="#9CA3AF"
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
                <Text style={[styles.locationButtonText, { fontFamily: fontFamily.arabic }]}>حدد موقعي الحالي</Text>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { fontFamily: fontFamily.arabic }]}
            placeholder="العنوان بالتفصيل"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <TextInput
            style={[styles.input, { fontFamily: fontFamily.arabic }]}
            placeholder="منطقة الخدمة (مثال: الشيخ زايد)"
            placeholderTextColor="#9CA3AF"
            value={serviceArea}
            onChangeText={setServiceArea}
          />

          <TextInput
            style={[styles.input, { fontFamily: fontFamily.arabic }]}
            placeholder="أقصى مسافة توصيل (كم)"
            placeholderTextColor="#9CA3AF"
            value={maxRadius}
            onChangeText={setMaxRadius}
            keyboardType="numeric"
          />

          {/* وثائق التحقق */}
          <Text style={[styles.sectionLabel, { fontFamily: fontFamily.arabic }]}>📄 المستندات المطلوبة للتحقق</Text>
          
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setIdImage)}>
            <Ionicons name="id-card" size={24} color="#4F46E5" />
            <Text style={[styles.uploadButtonText, { fontFamily: fontFamily.arabic }]}>
              {idImage ? '✅ تم اختيار صورة البطاقة' : 'رفع صورة البطاقة الشخصية'}
            </Text>
          </TouchableOpacity>

          {role === 'merchant' && (
            <>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setCommercialImage)}>
                <Ionicons name="business" size={24} color="#4F46E5" />
                <Text style={[styles.uploadButtonText, { fontFamily: fontFamily.arabic }]}>
                  {commercialImage ? '✅ تم اختيار السجل التجاري' : 'رفع السجل التجاري (اختياري)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setTaxImage)}>
                <Ionicons name="document-text" size={24} color="#4F46E5" />
                <Text style={[styles.uploadButtonText, { fontFamily: fontFamily.arabic }]}>
                  {taxImage ? '✅ تم اختيار البطاقة الضريبية' : 'رفع البطاقة الضريبية (اختياري)'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* الموافقة على الشروط */}
          <View style={styles.termsRow}>
            <Checkbox
              value={termsAccepted}
              onValueChange={acceptTermsContext}
              color={termsAccepted ? '#4F46E5' : undefined}
            />
            <TouchableOpacity onPress={() => navigation.navigate('TermsScreen')}>
              <Text style={[styles.termsText, { fontFamily: fontFamily.arabic }]}>
                أوافق على <Text style={styles.termsLink}>شروط الاستخدام</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, (loading || uploading) && styles.disabled]}
            onPress={handleRegister}
            disabled={loading || uploading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> :
              <Text style={[styles.registerText, { fontFamily: fontFamily.arabic }]}>تسجيل</Text>
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
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16, textAlign: 'right' },
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#4B5563',
  },
  termsLink: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  registerButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  disabled: { opacity: 0.6 },
  registerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
