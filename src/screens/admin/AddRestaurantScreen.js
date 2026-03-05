import React, { useState } from 'react';
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
import { ID } from 'appwrite';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadRestaurantImage, uploadRestaurantPDF } from '../../services/uploadService';

const RESTAURANTS_COLLECTION_ID = 'restaurants';

export default function AddRestaurantScreen({ navigation }) {
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('30');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [image, setImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const pickBackgroundImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للمعرض');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setBackgroundImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('خطأ في اختيار صورة الخلفية:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setPdfFile(file.uri);
        setPdfName(file.name);
        Alert.alert('✅ تم', `تم اختيار ملف: ${file.name}`);
      }
    } catch (error) {
      console.error('خطأ في اختيار PDF:', error);
      Alert.alert('خطأ', 'فشل في اختيار الملف');
    }
  };

  const handleAddRestaurant = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم المطعم مطلوب');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let imageUrl = null;
      let bgImageUrl = null;
      let pdfUrl = null;

      const restaurantNameForFolder = name.trim();

      // رفع الصورة الرئيسية إلى ImageKit
      if (image) {
        console.log('🖼️ جاري رفع صورة المطعم إلى ImageKit...');
        const imageResult = await uploadRestaurantImage(image, restaurantNameForFolder, 'profile');
        if (imageResult.success) {
          imageUrl = imageResult.fileUrl;
          console.log('✅ تم رفع الصورة:', imageUrl);
        } else {
          console.log('⚠️ فشل رفع الصورة:', imageResult.error);
        }
      }

      // رفع صورة الخلفية إلى ImageKit
      if (backgroundImage) {
        console.log('🖼️ جاري رفع صورة الخلفية إلى ImageKit...');
        const bgResult = await uploadRestaurantImage(backgroundImage, restaurantNameForFolder, 'cover');
        if (bgResult.success) {
          bgImageUrl = bgResult.fileUrl;
          console.log('✅ تم رفع صورة الخلفية:', bgImageUrl);
        }
      }

      // رفع ملف PDF إلى ImageKit
      if (pdfFile) {
        console.log('📄 جاري رفع PDF إلى ImageKit...');
        const pdfResult = await uploadRestaurantPDF(pdfFile, restaurantNameForFolder);
        if (pdfResult.success) {
          pdfUrl = pdfResult.fileUrl;
          console.log('✅ تم رفع PDF:', pdfUrl);
        } else {
          console.log('⚠️ فشل رفع PDF:', pdfResult.error);
        }
      }

      // تجهيز بيانات المطعم
      const restaurantData = {
        name: name.trim(),
        id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
        cuisine: cuisine.split(',').map(item => item.trim()).filter(item => item),
        deliveryTime: parseInt(deliveryTime) || 30,
        deliveryFee: parseFloat(deliveryFee) || 0,
        imageUrl: imageUrl,
        backgroundImage: bgImageUrl,
        menuPdfUrl: pdfUrl || '',
        isActive: isActive,
        merchantId: '', // ✅ حقل مطلوب في قاعدة البيانات
        createdAt: new Date().toISOString(),
      };

      console.log('📦 إنشاء مطعم في Appwrite:', restaurantData);

      await databases.createDocument(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        ID.unique(),
        restaurantData
      );

      Alert.alert(
        '✅ تم بنجاح',
        'تم إضافة المطعم بنجاح',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('❌ خطأ:', error);
      Alert.alert('خطأ', error.message || 'فشل في إضافة المطعم');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة مطعم جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم المطعم <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: أبو طارق"
          />

          <Text style={styles.label}>صورة الخلفية</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickBackgroundImage} disabled={loading}>
            {backgroundImage ? (
              <Image source={{ uri: backgroundImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>اختر صورة خلفية</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>أنواع الأكل (مفصولة بفواصل)</Text>
          <TextInput
            style={styles.input}
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="مشاوي شرقية، بيتزا، سندوتشات"
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>وقت التوصيل (دقائق)</Text>
              <TextInput
                style={styles.input}
                value={deliveryTime}
                onChangeText={setDeliveryTime}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>رسوم التوصيل (ج)</Text>
              <TextInput
                style={styles.input}
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          <Text style={styles.label}>صورة المطعم</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={loading}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>ملف PDF للمنيو</Text>
          <TouchableOpacity style={styles.pdfPicker} onPress={pickPDF} disabled={loading}>
            <Ionicons name="document-text" size={24} color="#4F46E5" />
            <Text style={styles.pdfPickerText} numberOfLines={1}>
              {pdfName ? pdfName : 'اختر ملف PDF'}
            </Text>
          </TouchableOpacity>
          {pdfName && (
            <Text style={styles.pdfHint}>✅ تم اختيار الملف</Text>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.label}>المطعم نشط</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, (loading || uploading) && styles.disabled]}
            onPress={handleAddRestaurant}
            disabled={loading || uploading}
          >
            {(loading || uploading) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.loadingText}>
                  {uploading ? 'جاري رفع الملفات...' : 'جاري الإضافة...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.addButtonText}>إضافة المطعم</Text>
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
  row: { flexDirection: 'row', gap: 10 },
  halfWidth: { flex: 1 },
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
  pdfPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 5,
    gap: 8,
  },
  pdfPickerText: { fontSize: 14, color: '#4F46E5', fontWeight: '500', flex: 1 },
  pdfHint: { fontSize: 12, color: '#10B981', marginBottom: 15 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 56,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
});
