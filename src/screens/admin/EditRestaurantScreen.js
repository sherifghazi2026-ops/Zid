import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '../../services/uploadService';

const RESTAURANTS_COLLECTION_ID = 'restaurants';

export default function EditRestaurantScreen({ navigation, route }) {
  const { restaurantId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const restaurant = await databases.getDocument(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        restaurantId
      );
      
      setName(restaurant.name || '');
      setCuisine(restaurant.cuisine?.join(', ') || '');
      setDeliveryTime(String(restaurant.deliveryTime || '30'));
      setDeliveryFee(String(restaurant.deliveryFee || '0'));
      setImageUrl(restaurant.imageUrl);
      setIsActive(restaurant.isActive !== false);
    } catch (error) {
      console.error('خطأ في جلب المطعم:', error);
      Alert.alert('خطأ', 'فشل في جلب بيانات المطعم');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للمعرض');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم المطعم مطلوب');
      return;
    }

    setSaving(true);
    setUploading(true);

    try {
      let finalImageUrl = imageUrl;

      // رفع الصورة الجديدة إذا تم تغييرها
      if (image) {
        const imageResult = await uploadToImageKit(image, `restaurant_${Date.now()}.jpg`, 'image');
        if (imageResult.success) {
          finalImageUrl = imageResult.fileUrl;
        }
      }

      const updateData = {
        name: name.trim(),
        cuisine: cuisine.split(',').map(item => item.trim()),
        deliveryTime: parseInt(deliveryTime) || 30,
        deliveryFee: parseFloat(deliveryFee) || 0,
        imageUrl: finalImageUrl,
        isActive: isActive,
      };

      await databases.updateDocument(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        restaurantId,
        updateData
      );

      Alert.alert(
        '✅ تم',
        'تم تحديث بيانات المطعم',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('❌ خطأ:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحديث المطعم');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل المطعم</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم المطعم</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="اسم المطعم"
          />

          <Text style={styles.label}>أنواع الأكل (مفصولة بفواصل)</Text>
          <TextInput
            style={styles.input}
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="مشاوي شرقية، لحوم، فراخ"
          />

          <Text style={styles.label}>وقت التوصيل (دقائق)</Text>
          <TextInput
            style={styles.input}
            value={deliveryTime}
            onChangeText={setDeliveryTime}
            keyboardType="numeric"
            placeholder="30"
          />

          <Text style={styles.label}>رسوم التوصيل (جنيه)</Text>
          <TextInput
            style={styles.input}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            keyboardType="numeric"
            placeholder="0"
          />

          <Text style={styles.label}>صورة المطعم</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={saving}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>المطعم نشط</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (saving || uploading) && styles.disabled]}
            onPress={handleSave}
            disabled={saving || uploading}
          >
            {(saving || uploading) ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
