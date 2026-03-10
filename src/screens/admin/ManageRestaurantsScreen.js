import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import { uploadRestaurantImage, uploadRestaurantPDF } from '../../services/uploadService';

const RESTAURANTS_COLLECTION_ID = 'restaurants';

export default function ManageRestaurantsScreen({ navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [uploading, setUploading] = useState(false);

  // حقول المطعم
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('30');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        [Query.orderDesc('createdAt')]
      );
      setRestaurants(response.documents);
    } catch (error) {
      console.error('خطأ في جلب المطاعم:', error);
      Alert.alert('خطأ', 'فشل في تحميل المطاعم');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
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
      }
    } catch (error) {
      console.error('خطأ في اختيار PDF:', error);
      Alert.alert('خطأ', 'فشل في اختيار الملف');
    }
  };

  const handleToggleStatus = async (restaurant) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        restaurant.$id,
        { isActive: !restaurant.isActive }
      );
      loadRestaurants();
      Alert.alert('تم', `تم ${!restaurant.isActive ? 'تفعيل' : 'تعطيل'} ${restaurant.name}`);
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  const handleDeleteRestaurant = (restaurant) => {
    Alert.alert(
      'حذف المطعم',
      `هل أنت متأكد من حذف ${restaurant.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                RESTAURANTS_COLLECTION_ID,
                restaurant.$id
              );
              loadRestaurants();
              Alert.alert('تم', 'تم حذف المطعم');
            } catch (error) {
              Alert.alert('خطأ', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم المطعم مطلوب');
      return;
    }

    setUploading(true);
    try {
      let finalImageUrl = imageUrl;
      let finalPdfUrl = pdfUrl;

      // رفع الصورة الجديدة إذا تم اختيارها
      if (image) {
        const imageResult = await uploadRestaurantImage(image, name.trim(), 'profile');
        if (imageResult.success) {
          finalImageUrl = imageResult.fileUrl;
        }
      }

      // رفع PDF الجديد إذا تم اختياره
      if (pdfFile) {
        const pdfResult = await uploadRestaurantPDF(pdfFile, name.trim());
        if (pdfResult.success) {
          finalPdfUrl = pdfResult.fileUrl;
        }
      }

      // ✅ تأكد من إضافة merchantId كحقل إلزامي
      const restaurantData = {
        name: name.trim(),
        cuisine: cuisine.split(',').map(item => item.trim()).filter(item => item),
        deliveryTime: parseInt(deliveryTime) || 30,
        deliveryFee: parseFloat(deliveryFee) || 0,
        imageUrl: finalImageUrl,
        menuPdfUrl: finalPdfUrl,
        isActive: isActive,
        merchantId: '', // ✅ هذا الحقل مطلوب في قاعدة البيانات
        updatedAt: new Date().toISOString(),
      };

      console.log('📤 بيانات المطعم:', restaurantData);

      if (editingRestaurant) {
        // تحديث مطعم موجود
        await databases.updateDocument(
          DATABASE_ID,
          RESTAURANTS_COLLECTION_ID,
          editingRestaurant.$id,
          restaurantData
        );
        Alert.alert('✅ تم', 'تم تحديث بيانات المطعم');
      } else {
        // إضافة مطعم جديد
        restaurantData.createdAt = new Date().toISOString();
        restaurantData.id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        
        await databases.createDocument(
          DATABASE_ID,
          RESTAURANTS_COLLECTION_ID,
          ID.unique(),
          restaurantData
        );
        Alert.alert('✅ تم', 'تم إضافة المطعم بنجاح');
      }

      setModalVisible(false);
      resetForm();
      loadRestaurants();
    } catch (error) {
      console.error('❌ خطأ في الحفظ:', error);
      Alert.alert('خطأ', error.message || 'فشل في حفظ البيانات');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingRestaurant(null);
    setName('');
    setCuisine('');
    setDeliveryTime('30');
    setDeliveryFee('0');
    setImage(null);
    setImageUrl('');
    setPdfFile(null);
    setPdfName('');
    setPdfUrl('');
    setIsActive(true);
  };

  const openEditModal = (restaurant) => {
    setEditingRestaurant(restaurant);
    setName(restaurant.name || '');
    setCuisine(restaurant.cuisine?.join(', ') || '');
    setDeliveryTime(String(restaurant.deliveryTime || '30'));
    setDeliveryFee(String(restaurant.deliveryFee || '0'));
    setImageUrl(restaurant.imageUrl || '');
    setPdfUrl(restaurant.menuPdfUrl || '');
    setPdfName(restaurant.menuPdfUrl ? restaurant.menuPdfUrl.split('/').pop() : '');
    setIsActive(restaurant.isActive !== false);
    setModalVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRestaurants();
  };

  const renderRestaurantCard = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.restaurantImage} />
      ) : (
        <View style={[styles.restaurantImage, styles.placeholderImage]}>
          <Ionicons name="restaurant-outline" size={30} color="#9CA3AF" />
        </View>
      )}
      
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10B98120' : '#EF444420' }]}>
            <Text style={[styles.statusText, { color: item.isActive ? '#10B981' : '#EF4444' }]}>
              {item.isActive ? 'نشط' : 'معطل'}
            </Text>
          </View>
        </View>

        <Text style={styles.restaurantCuisine}>
          {item.cuisine?.join(' • ') || 'أصناف متنوعة'}
        </Text>

        <View style={styles.restaurantMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#F59E0B" />
            <Text style={styles.metaText}>{item.deliveryTime || 30} دقيقة</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color="#F59E0B" />
            <Text style={styles.metaText}>{item.deliveryFee || 0} ج</Text>
          </View>
        </View>

        {item.menuPdfUrl && (
          <View style={styles.pdfBadge}>
            <Ionicons name="document-text" size={12} color="#FFF" />
            <Text style={styles.pdfBadgeText}>PDF</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, item.isActive ? styles.disableButton : styles.enableButton]}
          onPress={() => handleToggleStatus(item)}
        >
          <Ionicons 
            name={item.isActive ? "close-outline" : "checkmark-outline"} 
            size={16} 
            color="#FFF" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteRestaurant(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>إدارة المطاعم</Text>
        <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={restaurants}
        renderItem={renderRestaurantCard}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد مطاعم</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة مطعم جديد</Text>
          </View>
        }
      />

      {/* Modal إضافة/تعديل مطعم */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingRestaurant ? 'تعديل المطعم' : 'إضافة مطعم جديد'}
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>اسم المطعم <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="مثال: أبو طارق"
              />

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
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
                {image || imageUrl ? (
                  <Image source={{ uri: image || imageUrl }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>ملف PDF للمنيو</Text>
              <TouchableOpacity style={styles.pdfPicker} onPress={pickPDF} disabled={uploading}>
                <Ionicons name="document-text" size={24} color="#4F46E5" />
                <Text style={styles.pdfPickerText} numberOfLines={1}>
                  {pdfName || 'اختر ملف PDF'}
                </Text>
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
                style={[styles.saveButton, (uploading) && styles.disabled]}
                onPress={handleSave}
                disabled={uploading}
              >
                {uploading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFF" />
                    <Text style={styles.loadingText}>جاري الرفع...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingRestaurant ? 'حفظ التغييرات' : 'إضافة المطعم'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },
  
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    elevation: 2,
  },
  restaurantImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  restaurantInfo: { flex: 1 },
  restaurantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  restaurantName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  restaurantCuisine: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  restaurantMeta: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 2,
  },
  pdfBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '600' },
  
  actionButtons: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  actionButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F59E0B' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: { paddingBottom: 20, paddingTop: 60 },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
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
    minHeight: 56,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  loadingText: { color: '#FFF', fontSize: 14, fontWeight: '500', marginLeft: 8 },
});
