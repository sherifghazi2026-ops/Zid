import React, { useState } from 'react';
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
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addProduct } from '../../services/productService';
import { uploadServiceImage } from '../../services/uploadService';

export default function AddProductScreen({ navigation, route }) {
  const { serviceId, serviceName } = route.params;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

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
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم المنتج مطلوب');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      Alert.alert('تنبيه', 'السعر مطلوب');
      return;
    }

    setSubmitting(true);

    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
        return;
      }
      const merchant = JSON.parse(userData);

      const productData = {
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim(),
        imageUrl: image,
        isAvailable,
        merchantId: merchant.$id,
        merchantName: merchant.name,
        serviceId: serviceId,
      };

      console.log('📦 إرسال بيانات المنتج:', productData);

      const result = await addProduct(productData);

      if (result.success) {
        Alert.alert(
          '✅ تم',
          'تم إضافة المنتج بانتظار مراجعة الأدمن',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة منتج - {serviceName}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم المنتج <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: فينو"
          />

          <Text style={styles.label}>السعر (ج) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="6"
            keyboardType="numeric"
          />

          <Text style={styles.label}>الوصف (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="وصف المنتج..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>صورة المنتج (اختياري)</Text>
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

          <View style={styles.switchContainer}>
            <Text style={styles.label}>متاح للبيع</Text>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (submitting || uploading) && styles.disabled]}
            onPress={handleSubmit}
            disabled={submitting || uploading}
          >
            {(submitting || uploading) ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>إضافة المنتج</Text>
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
  required: { color: '#EF4444' },
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
