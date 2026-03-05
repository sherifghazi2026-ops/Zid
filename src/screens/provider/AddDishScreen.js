import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '../../services/uploadService';
import { createDish } from '../../services/dishService';

export default function AddDishScreen({ navigation, route }) {
  const { providerId, providerType, providerName } = route.params;

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

  const pickImages = async () => {
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
        const newImages = result.assets.map(a => a.uri);
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في اختيار الصور');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets) {
        setVideo(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في اختيار الفيديو');
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم الطبق مطلوب');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً');
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // رفع الصور إلى ImageKit
      const uploadedImages = [];
      for (const uri of images) {
        const result = await uploadToImageKit(uri, `dish_${Date.now()}.jpg`, 'dishes');
        if (result.success) {
          uploadedImages.push(result.fileUrl);
        }
      }

      // رفع الفيديو (إذا وجد)
      let videoUrl = null;
      if (video) {
        const videoResult = await uploadToImageKit(video, `dish_video_${Date.now()}.mp4`, 'dishes_videos');
        if (videoResult.success) {
          videoUrl = videoResult.fileUrl;
        }
      }

      // حفظ البيانات
      const dishData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        providerId,
        providerType,
        category: category.trim(),
        ingredients,
        images: uploadedImages,
        videoUrl,
      };

      const result = await createDish(dishData);

      if (result.success) {
        Alert.alert(
          '✅ تم بنجاح',
          `تم إضافة "${name}" إلى ${providerName}`,
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
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
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة طبق جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم الطبق</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: كفتة مشوية"
          />

          <Text style={styles.label}>الوصف (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="وصف الطبق..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>السعر (جنيه)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="مثال: 120"
            keyboardType="numeric"
          />

          <Text style={styles.label}>التصنيف (اختياري)</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="مشاوي، بيتزا، حلويات..."
          />

          <Text style={styles.label}>المكونات</Text>
          <View style={styles.ingredientInput}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={currentIngredient}
              onChangeText={setCurrentIngredient}
              placeholder="مثال: لحم مفروم"
            />
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {ingredients.length > 0 && (
            <View style={styles.ingredientsList}>
              {ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientTag}>
                  <Text style={styles.ingredientText}>{ing}</Text>
                  <TouchableOpacity onPress={() => removeIngredient(index)}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.label}>صور الطبق</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImages}>
            <Ionicons name="images-outline" size={40} color="#9CA3AF" />
            <Text style={styles.imagePickerText}>اختر صوراً للطبق</Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView horizontal style={styles.imagesList}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>فيديو (اختياري)</Text>
          <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={40} color="#9CA3AF" />
            <Text style={styles.videoPickerText}>
              {video ? 'تم اختيار فيديو' : 'اختر فيديو'}
            </Text>
          </TouchableOpacity>

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
  ingredientInput: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  ingredientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ingredientText: { fontSize: 12, color: '#4F46E5' },
  imagePicker: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  imagesList: { flexDirection: 'row', marginBottom: 15 },
  imageWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  removeImage: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12 },
  videoPicker: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  videoPickerText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
