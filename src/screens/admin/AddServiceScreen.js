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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        
        // رفع الصورة إلى ImageKit في مجلد services
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
        
        setUploading(false);
        if (uploadResult.success) {
          setImage(uploadResult.fileUrl);
          console.log('✅ صورة الخدمة:', uploadResult.fileUrl);
          Alert.alert('✅ تم', 'تم رفع الصورة بنجاح');
        } else {
          Alert.alert('خطأ', 'فشل في رفع الصورة: ' + uploadResult.error);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
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
      const serviceData = {
        id: serviceId.trim().toLowerCase(),
        name: name.trim(),
        type: 'service',
        screen: hasItems ? 'ItemsServiceScreen' : 'ServiceScreen',
        icon: 'apps-outline',
        color,
        category,
        isActive,
        isVisible,
        hasItems,
        imageUrl: image, // رابط الصورة من ImageKit
        order: parseInt(order) || 0,
      };

      console.log('📦 بيانات الخدمة:', serviceData);
      const result = await createService(serviceData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الخدمة بنجاح');
        navigation.goBack();
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
          />
          {idError ? <Text style={styles.errorText}>{idError}</Text> : null}
          <Text style={styles.hint}>يُسمح بالأحرف الإنجليزية والأرقام والشرطة السفلية فقط</Text>

          <Text style={styles.label}>اسم الخدمة <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: مكوجي"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>صورة الخدمة (اختياري)</Text>
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
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>حالة الخدمة</Text>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>نشط</Text>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#E5E7EB', true: color }} />
              </View>
            </View>
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>ظاهر للعملاء</Text>
            <Switch value={isVisible} onValueChange={setIsVisible} trackColor={{ false: '#E5E7EB', true: color }} />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>له أصناف (مثل المكوجي)</Text>
            <Switch 
              value={hasItems} 
              onValueChange={setHasItems} 
              trackColor={{ false: '#E5E7EB', true: color }} 
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: color }, (submitting || uploading) && styles.disabled]}
            onPress={handleAddService}
            disabled={submitting || uploading}
          >
            {(submitting || uploading) ? (
              <ActivityIndicator color="#FFF" />
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
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
