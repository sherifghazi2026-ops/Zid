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
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system'; // ✅ استخدام File بدلاً من FileSystem القديم
import { createDish } from '../../services/dishService';
import { uploadToImageKit } from '../../services/uploadService';

const CATEGORY_SUGGESTIONS = ['مقبلات', 'أطباق رئيسية', 'مشاوي', 'مأكولات بحرية', 'شوربة', 'سلطات', 'حلويات', 'مشروبات'];

export default function AddHomeChefDishScreen({ navigation, route }) {
  const { chefId, chefName } = route.params;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
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
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets) {
        setImages([...images, ...result.assets.map(a => a.uri)]);
      }
    } catch (error) {
      console.error('خطأ في اختيار الصور:', error);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime'],
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        setVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('خطأ في اختيار الفيديو:', error);
    }
  };

  const addIngredient = () => {
    if (currentIngredient.trim()) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient('');
    }
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // ✅ دالة التحقق من الملف باستخدام File API
  const validateFile = async (uri) => {
    try {
      const file = new File(uri);
      const exists = await file.exists;
      
      if (!exists) {
        return { valid: false, error: 'الملف غير موجود' };
      }
      
      const fileInfo = await file.info();
      
      // حد أقصى 10MB للصور والفيديو
      if (fileInfo.size > 10 * 1024 * 1024) {
        return { valid: false, error: 'حجم الملف كبير جداً (أقصى حد 10MB)' };
      }
      
      return { valid: true, fileInfo };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم الطبق مطلوب');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً');
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      const uploadedImages = [];

      // رفع الصور إلى ImageKit
      for (const imageUri of images) {
        console.log(`🖼️ رفع صورة إلى مجلد ${chefName}...`);
        
        // ✅ التحقق من صحة الملف قبل الرفع
        const validation = await validateFile(imageUri);
        if (!validation.valid) {
          Alert.alert('خطأ', `الصورة غير صالحة: ${validation.error}`);
          continue;
        }
        
        const uploadResult = await uploadToImageKit(
          imageUri,
          `dish_${Date.now()}.jpg`,
          'dish',
          chefName
        );
        if (uploadResult.success) {
          uploadedImages.push(uploadResult.fileUrl);
        }
      }

      let videoUrl = null;
      if (video) {
        console.log(`🎥 رفع فيديو إلى مجلد ${chefName}...`);
        
        // ✅ التحقق من صحة الفيديو قبل الرفع
        const validation = await validateFile(video);
        if (!validation.valid) {
          Alert.alert('خطأ', `الفيديو غير صالح: ${validation.error}`);
        } else {
          const videoResult = await uploadToImageKit(
            video,
            `video_${Date.now()}.mp4`,
            'video',
            chefName
          );
          if (videoResult.success) {
            videoUrl = videoResult.fileUrl;
          }
        }
      }

      const dishData = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        category: category.trim() || null,
        ingredients: ingredients.length ? ingredients : null,
        images: uploadedImages,
        videoUrl,
        providerId: chefId,
        providerType: 'home_chef',
        isAvailable,
      };

      console.log('📦 بيانات الطبق:', dishData);
      const result = await createDish(dishData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الطبق بنجاح بانتظار مراجعة الأدمن');
        navigation.goBack();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      Alert.alert('خطأ', 'فشل في إضافة الطبق');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#EF4444" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة طبق جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم الطبق <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: كبسة دجاج"
          />

          <Text style={styles.label}>الوصف</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="وصف الطبق..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>السعر (ج) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="120"
            keyboardType="numeric"
          />

          <Text style={styles.label}>التصنيف</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="مثال: مشاوي، مقبلات..."
          />
          <ScrollView horizontal style={styles.suggestionsRow}>
            {CATEGORY_SUGGESTIONS.map(sugg => (
              <TouchableOpacity key={sugg} style={styles.suggestionChip} onPress={() => setCategory(sugg)}>
                <Text style={styles.suggestionText}>{sugg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>المكونات</Text>
          <View style={styles.ingredientInput}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="أضف مكوناً..."
              value={currentIngredient}
              onChangeText={setCurrentIngredient}
            />
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {ingredients.length > 0 && (
            <View style={styles.ingredientsList}>
              {ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientTag}>
                  <Text style={styles.ingredientTagText}>{ing}</Text>
                  <TouchableOpacity onPress={() => removeIngredient(index)}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.label}>صور الطبق</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="images-outline" size={40} color="#9CA3AF" />
              <Text style={styles.imagePlaceholderText}>اختر صوراً للطبق</Text>
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

          <Text style={styles.label}>فيديو التحضير (اختياري)</Text>
          <TouchableOpacity style={styles.videoPicker} onPress={pickVideo} disabled={uploading}>
            {video ? (
              <View style={styles.videoSelected}>
                <Ionicons name="videocam" size={24} color="#10B981" />
                <Text style={styles.videoSelectedText} numberOfLines={1}>
                  {video.split('/').pop()}
                </Text>
                <TouchableOpacity onPress={() => setVideo(null)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-outline" size={40} color="#9CA3AF" />
                <Text style={styles.videoPlaceholderText}>اختر فيديو التحضير</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>متاح للطلب</Text>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
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
              <Text style={styles.submitButtonText}>إضافة الطبق</Text>
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
  suggestionsRow: { flexDirection: 'row', marginBottom: 15, marginTop: -5 },
  suggestionChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  suggestionText: { fontSize: 12, color: '#EF4444' },
  ingredientInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  addButton: { backgroundColor: '#EF4444', width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  ingredientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ingredientTagText: { fontSize: 12, color: '#EF4444' },
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
  videoPicker: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 15,
    overflow: 'hidden',
  },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', flexDirection: 'row', gap: 8 },
  videoPlaceholderText: { fontSize: 14, color: '#9CA3AF' },
  videoSelected: { flex: 1, justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 10, flexDirection: 'row' },
  videoSelectedText: { fontSize: 14, color: '#10B981', flex: 1, marginLeft: 8 },
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
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
