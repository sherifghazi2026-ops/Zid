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
import { createItem } from '../../services/itemService';
import { uploadToImageKit } from '../../services/uploadService';

export default function AddProductScreen({ navigation, route }) {
  const { service, providerId, providerName, providerType } = route.params;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  // التحقق من وجود itemsCollection
  React.useEffect(() => {
    if (!service.itemsCollection) {
      Alert.alert(
        '❌ خطأ في التهيئة',
        `الخدمة "${service.name}" ليس لها collection مخصص للمنتجات.\n\nالرجاء التواصل مع الأدمن لإضافة itemsCollection للخدمة.`,
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    }
  }, []);

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
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets) {
        setImages([...images, ...result.assets.map(a => a.uri)]);
      }
    } catch (error) {
      console.error('خطأ في اختيار الصور:', error);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم المنتج مطلوب');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً');
      return;
    }

    // التأكد من وجود itemsCollection قبل الإرسال
    if (!service.itemsCollection) {
      Alert.alert(
        '❌ خطأ',
        'لا يمكن إضافة المنتج لأن الخدمة ليس لها collection مخصص.'
      );
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      const uploadedImages = [];

      for (const imageUri of images) {
        console.log(`🖼️ رفع صورة...`);
        const uploadResult = await uploadToImageKit(
          imageUri,
          `product_${Date.now()}.jpg`,
          'product',
          providerName
        );
        if (uploadResult.success) {
          uploadedImages.push(uploadResult.fileUrl);
          console.log('✅ تم رفع الصورة:', uploadResult.fileUrl);
        }
      }

      console.log('📦 الصور المرفوعة:', uploadedImages);

      const itemData = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        images: uploadedImages, // هذا array من الروابط
        providerId,
        providerName,
        providerType,
        serviceId: service.id,
        isAvailable,
      };

      console.log('📦 بيانات المنتج:', JSON.stringify(itemData, null, 2));
      console.log('📦 collectionName:', service.itemsCollection);
      
      const result = await createItem(service.itemsCollection, itemData);

      if (result.success) {
        Alert.alert(
          '✅ تم',
          'تم إضافة المنتج بنجاح بانتظار مراجعة الأدمن',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('خطأ', result.error || 'فشل في إضافة المنتج');
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      Alert.alert('خطأ', 'فشل في إضافة المنتج');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة منتج جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceId}>معرف الخدمة: {service.id}</Text>
          <Text style={styles.collectionName}>
            Collection: {service.itemsCollection || 'غير محدد'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>اسم المنتج <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: حليب"
          />

          <Text style={styles.label}>الوصف</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="وصف المنتج..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>السعر <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="numeric"
          />

          <Text style={styles.label}>صور المنتج</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="images-outline" size={40} color="#9CA3AF" />
              <Text style={styles.imagePlaceholderText}>اختر صوراً للمنتج</Text>
            </View>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView horizontal style={styles.imagesList}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

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
            disabled={submitting || uploading || !service.itemsCollection}
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
  serviceInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  serviceId: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  collectionName: { 
    fontSize: 12, 
    color: '#4F46E5', 
    fontWeight: '600',
    marginTop: 4,
  },
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
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 15,
    overflow: 'hidden',
  },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  imagePlaceholderText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  imagesList: { flexDirection: 'row', marginBottom: 15 },
  imageWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  removeImage: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12 },
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
