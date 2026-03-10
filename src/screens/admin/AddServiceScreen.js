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
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system/next';
import { createService } from '../../services/servicesService';
import { uploadServiceImage } from '../../services/uploadService';

const COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#4F46E5', '#14B8A6', '#F97316'
];

const CATEGORIES = [
  { label: 'خدمات سريعة', value: 'express' },
  { label: 'خدمات متخصصة', value: 'pro' },
  { label: 'خدمات أخرى', value: 'other' },
];

export default function AddServiceScreen({ navigation }) {
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [category, setCategory] = useState('other');
  const [isActive, setIsActive] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [hasItems, setHasItems] = useState(false);
  const [order, setOrder] = useState('0');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idError, setIdError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateId = (id) => {
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(id)) {
      return 'يُسمح فقط بالأحرف الإنجليزية والأرقام والشرطة السفلية';
    }
    if (id.length > 36) {
      return 'الحد الأقصى 36 حرف';
    }
    return '';
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'يجب السماح بالوصول إلى معرض الصور');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0].uri;
        
        // التحقق من حجم الصورة باستخدام File API
        const file = new File(selectedImage);
        const exists = await file.exists;
        if (!exists) {
          Alert.alert('خطأ', 'الملف غير موجود');
          return;
        }
        
        const fileInfo = await file.info();
        if (fileInfo.size > 5 * 1024 * 1024) {
          Alert.alert('خطأ', 'حجم الصورة كبير جداً (أقصى حد 5MB)');
          return;
        }

        setImage(selectedImage);
        console.log('✅ تم اختيار الصورة:', selectedImage);
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة: ' + error.message);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    setUploading(true);
    setUploadProgress(10);

    try {
      console.log('🖼️ بدء رفع صورة الخدمة...');
      
      const file = new File(image);
      const exists = await file.exists;
      if (!exists) {
        throw new Error('الملف غير موجود');
      }
      
      const fileInfo = await file.info();
      setUploadProgress(30);
      console.log('✅ الملف موجود، الحجم:', fileInfo.size);

      const uploadResult = await uploadServiceImage(image);

      setUploadProgress(100);

      if (uploadResult.success) {
        console.log('✅ تم رفع الصورة بنجاح:', uploadResult.fileUrl);
        return uploadResult.fileUrl;
      } else {
        throw new Error(uploadResult.error || 'فشل في رفع الصورة');
      }
    } catch (error) {
      console.error('❌ فشل رفع الصورة:', error);
      Alert.alert('خطأ', 'فشل في رفع الصورة: ' + error.message);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddService = async () => {
    if (!serviceId.trim()) {
      Alert.alert('تنبيه', 'معرف الخدمة مطلوب');
      return;
    }

    const error = validateId(serviceId);
    if (error) {
      setIdError(error);
      return;
    }

    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم الخدمة مطلوب');
      return;
    }

    setSubmitting(true);
    setIdError('');

    try {
      let imageUrl = null;

      if (image) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          Alert.alert(
            'تنبيه',
            'فشل رفع الصورة، هل تريد إكمال إضافة الخدمة بدون صورة؟',
            [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'متابعة بدون صورة', onPress: () => continueAddingService(null) }
            ]
          );
          return;
        }
      }

      await continueAddingService(imageUrl);

    } catch (error) {
      console.error('❌ خطأ:', error);
      Alert.alert('خطأ', error.message || 'فشل في إضافة الخدمة');
      setSubmitting(false);
    }
  };

  const continueAddingService = async (imageUrl) => {
    try {
      // ✅ تحديد الشاشة المناسبة بناءً على hasItems
      const screen = hasItems ? 'ItemsServiceScreen' : 'ServiceScreen';
      
      const serviceData = {
        id: serviceId.trim().toLowerCase(),
        name: name.trim(),
        type: 'service',
        screen: screen, // ✅ إضافة الحقل المطلوب
        icon: 'apps-outline',
        color,
        category,
        isActive,
        isVisible,
        hasItems,
        imageUrl: imageUrl,
        order: parseInt(order) || 0,
      };

      console.log('📦 بيانات الخدمة:', serviceData);
      const result = await createService(serviceData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الخدمة بنجاح', [
          { text: 'حسناً', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('خطأ', result.error);
        setSubmitting(false);
      }
    } catch (error) {
      console.error('❌ خطأ في إنشاء الخدمة:', error);
      Alert.alert('خطأ', error.message);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة خدمة جديدة</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>معرف الخدمة <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, idError && styles.inputError]}
            placeholder="ironing, supermarket, restaurant..."
            value={serviceId}
            onChangeText={(text) => {
              setServiceId(text);
              setIdError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting && !uploading}
          />
          {idError ? <Text style={styles.errorText}>{idError}</Text> : null}
          <Text style={styles.hint}>يُسمح بالأحرف الإنجليزية والأرقام والشرطة السفلية فقط</Text>

          <Text style={styles.label}>اسم الخدمة <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: مكوجي"
            value={name}
            onChangeText={setName}
            editable={!submitting && !uploading}
          />

          <Text style={styles.label}>صورة الخدمة (اختياري)</Text>
          <TouchableOpacity 
            style={styles.imagePicker} 
            onPress={pickImage} 
            disabled={uploading || submitting}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                {uploading ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.uploadingText}>جاري الرفع... {uploadProgress}%</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>اللون</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
            {COLORS.map((colorOption) => (
              <TouchableOpacity
                key={colorOption}
                style={[
                  styles.colorOption,
                  { backgroundColor: colorOption },
                  color === colorOption && styles.colorOptionActive
                ]}
                onPress={() => setColor(colorOption)}
                disabled={submitting || uploading}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>التصنيف</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryOption,
                  category === cat.value && styles.categoryOptionActive,
                  { borderColor: color }
                ]}
                onPress={() => setCategory(cat.value)}
                disabled={submitting || uploading}
              >
                <Text style={[
                  styles.categoryOptionText,
                  category === cat.value && styles.categoryOptionTextActive
                ]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>الترتيب</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={order}
                onChangeText={setOrder}
                keyboardType="numeric"
                editable={!submitting && !uploading}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>حالة الخدمة</Text>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>نشط</Text>
                <Switch 
                  value={isActive} 
                  onValueChange={setIsActive} 
                  trackColor={{ false: '#E5E7EB', true: color }}
                  disabled={submitting || uploading}
                />
              </View>
            </View>
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>ظاهر للعملاء</Text>
            <Switch 
              value={isVisible} 
              onValueChange={setIsVisible} 
              trackColor={{ false: '#E5E7EB', true: color }}
              disabled={submitting || uploading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>له أصناف (مثل المكوجي)</Text>
            <Switch
              value={hasItems}
              onValueChange={setHasItems}
              trackColor={{ false: '#E5E7EB', true: color }}
              disabled={submitting || uploading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: color }, (submitting || uploading) && styles.disabled]}
            onPress={handleAddService}
            disabled={submitting || uploading}
          >
            {(submitting || uploading) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.loadingText}>
                  {uploading ? 'جاري رفع الصورة...' : 'جاري إضافة الخدمة...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>إضافة الخدمة</Text>
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
    marginBottom: 5,
    fontSize: 14,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 10 },
  hint: { fontSize: 11, color: '#9CA3AF', marginBottom: 15 },
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
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: { marginTop: 8, fontSize: 12, color: '#4F46E5' },
  colorsScroll: { flexDirection: 'row', marginBottom: 15 },
  colorOption: { width: 40, height: 40, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorOptionActive: { borderColor: '#1F2937' },
  categoryContainer: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  categoryOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  categoryOptionActive: { backgroundColor: '#4F46E5' },
  categoryOptionText: { fontSize: 12, color: '#4B5563' },
  categoryOptionTextActive: { color: '#FFF', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  halfWidth: { flex: 1 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  switchLabel: { fontSize: 14, color: '#4B5563' },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    minHeight: 56,
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: { color: '#FFF', fontSize: 14 },
});
