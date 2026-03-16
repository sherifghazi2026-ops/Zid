import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import { uploadToImageKit } from '../../services/uploadService';
import { getAllServices } from '../../services/servicesService';

export default function MerchantRegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [merchantType, setMerchantType] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(''); // ✅ رسوم التوصيل
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const result = await getAllServices();
    if (result.success) {
      // فلترة الخدمات اللي لها منتجات أو أصناف
      const filtered = result.data.filter(s => 
        s.type === 'items' || s.type === 'items_service' || s.type === 'products'
      );
      setServices(filtered);
    }
  };

  const pickImage = async () => {
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
        setUploading(true);
        const uploadResult = await uploadToImageKit(
          result.assets[0].uri,
          `merchant_${Date.now()}.jpg`,
          'profile',
          name || 'merchant'
        );
        setUploading(false);
        if (uploadResult.success) {
          setImage(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل رفع الصورة');
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل اختيار الصورة');
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('تنبيه', 'رقم الهاتف مطلوب');
      return;
    }
    if (!password.trim()) {
      Alert.alert('تنبيه', 'كلمة المرور مطلوبة');
      return;
    }
    if (!merchantType) {
      Alert.alert('تنبيه', 'اختر نوع النشاط التجاري');
      return;
    }

    setLoading(true);

    try {
      // التحقق من عدم وجود نفس الرقم
      const existing = await databases.listDocuments(
        DATABASE_ID,
        'users',
        [Query.equal('phone', phone)]
      );

      if (existing.documents.length > 0) {
        Alert.alert('خطأ', 'رقم الهاتف مستخدم بالفعل');
        setLoading(false);
        return;
      }

      const userData = {
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        role: 'merchant',
        merchantType: merchantType,
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : 0, // ✅ حفظ رسوم التوصيل
        imageUrl: image,
        active: true,
        isVerified: false,
        createdAt: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        'users',
        ID.unique(),
        userData
      );

      Alert.alert(
        '✅ تم التسجيل',
        'تم إنشاء حساب التاجر بنجاح\nبانتظار مراجعة الأدمن',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تسجيل تاجر جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم التاجر</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: مخبز المدينة"
          />

          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="01xxxxxxxxx"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="********"
          />

          <Text style={styles.label}>نوع النشاط التجاري</Text>
          <View style={styles.servicesContainer}>
            {services.map(service => (
              <TouchableOpacity
                key={service.$id}
                style={[
                  styles.serviceChip,
                  merchantType === service.id && styles.serviceChipActive
                ]}
                onPress={() => setMerchantType(service.id)}
              >
                <Text style={[
                  styles.serviceChipText,
                  merchantType === service.id && styles.serviceChipTextActive
                ]}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ✅ حقل رسوم التوصيل */}
          <Text style={styles.label}>رسوم التوصيل (جنيه)</Text>
          <TextInput
            style={styles.input}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            placeholder="مثال: 15"
            keyboardType="numeric"
          />

          <Text style={styles.label}>صورة المتجر (اختياري)</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                {uploading ? (
                  <ActivityIndicator size="large" color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerButton, (loading || uploading) && styles.disabled]}
            onPress={handleRegister}
            disabled={loading || uploading}
          >
            {(loading || uploading) ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.registerButtonText}>تسجيل</Text>
            )}
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
  form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  serviceChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  serviceChipText: { fontSize: 12, color: '#4B5563' },
  serviceChipTextActive: { color: '#FFF', fontWeight: '600' },
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 15,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  imagePlaceholderText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  registerButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  registerButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
