import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { databases, DATABASE_ID, storage, BUCKET_ID } from '../../appwrite/config';
import { ID, Query } from 'appwrite';

// أنواع الأماكن المدعومة
const PLACE_TYPES = [
  { label: 'مطاعم', value: 'restaurants', icon: 'restaurant-outline', collection: 'restaurants' },
  { label: 'سوبر ماركت', value: 'supermarket', icon: 'cart-outline', collection: 'supermarkets' },
  { label: 'صيدليات', value: 'pharmacy', icon: 'medical-outline', collection: 'pharmacies' },
  { label: 'مغاسل', value: 'laundry', icon: 'water-outline', collection: 'laundries' },
  { label: 'كهربائيين', value: 'electrician', icon: 'flash-outline', collection: 'electricians' },
  { label: 'سباكين', value: 'plumber', icon: 'water-outline', collection: 'plumbers' },
  { label: 'نجارين', value: 'carpenter', icon: 'hammer-outline', collection: 'carpenters' },
];

export default function ManagePlacesScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState('restaurants');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [uploading, setUploading] = useState(false);

  // حقول المكان
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadPlaces();
  }, [selectedType]);

  const loadPlaces = async () => {
    const collectionId = getCollectionId(selectedType);
    if (!collectionId) return;

    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        collectionId,
        [Query.equal('isActive', true), Query.orderAsc('name')]
      );
      setPlaces(response.documents);
    } catch (error) {
      console.error('خطأ في جلب الأماكن:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCollectionId = (type) => {
    const placeType = PLACE_TYPES.find(t => t.value === type);
    return placeType?.collection;
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
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const uploadImage = async (uri) => {
    try {
      const fileName = `place_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: 'image/jpeg',
      });

      const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('private_EWamixKcyYNZI2xJmmO0iQBN53k=' + ':'),
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.url) {
        return { success: true, url: data.url };
      }
      return { success: false, error: 'فشل الرفع' };
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }

    setUploading(true);

    try {
      let finalImageUrl = imageUrl;
      if (image) {
        const uploadResult = await uploadImage(image);
        if (uploadResult.success) {
          finalImageUrl = uploadResult.url;
        }
      }

      const collectionId = getCollectionId(selectedType);
      const placeData = {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        imageUrl: finalImageUrl,
        isActive,
      };

      let result;
      if (editingPlace) {
        result = await databases.updateDocument(
          DATABASE_ID,
          collectionId,
          editingPlace.$id,
          placeData
        );
      } else {
        result = await databases.createDocument(
          DATABASE_ID,
          collectionId,
          ID.unique(),
          placeData
        );
      }

      Alert.alert('✅ تم', editingPlace ? 'تم التحديث بنجاح' : 'تم الإضافة بنجاح');
      setModalVisible(false);
      resetForm();
      loadPlaces();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (place) => {
    Alert.alert(
      'حذف',
      `هل أنت متأكد من حذف ${place?.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const collectionId = getCollectionId(selectedType);
              await databases.deleteDocument(
                DATABASE_ID,
                collectionId,
                place.$id
              );
              Alert.alert('تم', 'تم الحذف بنجاح');
              loadPlaces();
            } catch (error) {
              Alert.alert('خطأ', error.message);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (place) => {
    setEditingPlace(place);
    setName(place?.name || '');
    setAddress(place.address || '');
    setPhone(place.phone || '');
    setImageUrl(place.imageUrl || '');
    setIsActive(place.isActive !== false);
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingPlace(null);
    setName('');
    setAddress('');
    setPhone('');
    setImage(null);
    setImageUrl('');
    setIsActive(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlaces();
  };

  const renderPlaceCard = ({ item }) => {
    const placeType = PLACE_TYPES.find(t => t.value === selectedType);
    return (
      <View style={[styles.placeCard, !item.isActive && styles.placeCardDisabled]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.placeImage} />
        ) : (
          <View style={[styles.placeImage, styles.placeholderImage]}>
            <Ionicons name={placeType?.icon} size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.placeContent}>
          <Text style={styles.placeName}>{item?.name}</Text>
          {item.address ? <Text style={styles.placeAddress}>{item.address}</Text> : null}
          {item.phone ? <Text style={styles.placePhone}>{item.phone}</Text> : null}
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>غير نشط</Text>
            </View>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
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
        <Text style={styles.headerTitle}>إدارة الأماكن</Text>
        <TouchableOpacity onPress={() => {
          resetForm();
          setModalVisible(true);
        }}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* أزرار أنواع الأماكن */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
        {PLACE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeChip,
              selectedType === type.value && styles.typeChipActive
            ]}
            onPress={() => setSelectedType(type.value)}
          >
            <Ionicons 
              name={type.icon} 
              size={18} 
              color={selectedType === type.value ? '#FFF' : '#6B7280'} 
            />
            <Text style={[
              styles.typeChipText,
              selectedType === type.value && styles.typeChipTextActive
            ]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={places}
        renderItem={renderPlaceCard}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أماكن</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة مكان جديد</Text>
          </View>
        }
      />

      {/* Modal إضافة/تعديل */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlace ? 'تعديل المكان' : 'إضافة مكان جديد'}
              </Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>الاسم</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="الاسم"
              />

              <Text style={styles.label}>العنوان (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="العنوان"
              />

              <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="رقم الهاتف"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>الصورة</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image || imageUrl ? (
                  <Image source={{ uri: image || imageUrl }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>نشط</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, uploading && styles.disabled]}
                onPress={handleSave}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingPlace ? 'تحديث' : 'إضافة'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  typesScroll: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: '#4F46E5',
  },
  typeChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  placeCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  placeImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  placeContent: { flex: 1 },
  placeName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  placeAddress: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  placePhone: { fontSize: 12, color: '#4F46E5' },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  inactiveText: { fontSize: 10, color: '#EF4444', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  actionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F59E0B' },
  deleteButton: { backgroundColor: '#EF4444' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
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
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
