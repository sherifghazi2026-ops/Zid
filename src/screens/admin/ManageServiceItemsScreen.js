import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Switch,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAllServices } from '../../services/servicesService';
import {
  getAllServiceItems,
  createServiceItem,
  updateServiceItem,
  deleteServiceItem,
  toggleItemStatus,
} from '../../services/itemsService';
import { uploadProductImage } from '../../services/uploadService';

export default function ManageServiceItemsScreen({ navigation, route }) {
  const { serviceId, serviceName, serviceColor } = route.params || {};
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (serviceId) {
      // لو جينا من رابط مباشر مع serviceId
      loadServiceInfo(serviceId, serviceName, serviceColor);
    } else if (selectedService) {
      // لو اخترنا خدمة من القائمة
      loadItems(selectedService.id);
    }
  }, [selectedService, serviceId]);

  const loadServices = async () => {
    const result = await getAllServices();
    if (result.success) {
      // فقط الخدمات اللي hasItems = true
      const servicesWithItems = result.data.filter(s => s.hasItems);
      setServices(servicesWithItems);
      
      // لو جينا من رابط مباشر مع serviceId
      if (serviceId) {
        const found = servicesWithItems.find(s => s.id === serviceId);
        if (found) {
          setSelectedService(found);
        }
      }
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadServiceInfo = (sid, sname, scolor) => {
    setSelectedService({
      id: sid,
      name: sname,
      color: scolor
    });
  };

  const loadItems = async (sid) => {
    const result = await getAllServiceItems(sid);
    if (result.success) {
      setItems(result.data);
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
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const handleAddItem = async () => {
    if (!selectedService) {
      Alert.alert('تنبيه', 'الرجاء اختيار خدمة أولاً');
      return;
    }

    if (!itemName.trim()) {
      Alert.alert('تنبيه', 'اسم الصنف مطلوب');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً');
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = null;
      if (image) {
        setUploading(true);
        const uploadResult = await uploadProductImage(image);
        setUploading(false);
        if (uploadResult.success) {
          finalImageUrl = uploadResult.fileUrl;
        }
      }

      const itemData = {
        serviceId: selectedService.id,
        name: itemName.trim(),
        price: parseFloat(price),
        description: description.trim() || '',
        imageUrl: finalImageUrl,
        isActive,
      };

      const result = await createServiceItem(itemData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الصنف بنجاح');
        setModalVisible(false);
        resetForm();
        loadItems(selectedService.id);
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إضافة الصنف');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setSubmitting(true);
    try {
      let finalImageUrl = imageUrl;
      if (image) {
        setUploading(true);
        const uploadResult = await uploadProductImage(image);
        setUploading(false);
        if (uploadResult.success) {
          finalImageUrl = uploadResult.fileUrl;
        }
      }

      const updateData = {
        name: itemName.trim() || editingItem.name,
        price: parseFloat(price) || editingItem.price,
        description: description.trim() || editingItem.description,
        imageUrl: finalImageUrl,
        isActive,
      };

      const result = await updateServiceItem(editingItem.$id, updateData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم تحديث الصنف بنجاح');
        setModalVisible(false);
        resetForm();
        setEditingItem(null);
        loadItems(selectedService.id);
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث الصنف');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'حذف الصنف',
      `هل أنت متأكد من حذف ${item.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteServiceItem(item.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الصنف');
              loadItems(selectedService.id);
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (item) => {
    const result = await toggleItemStatus(item.$id, !item.isActive);
    if (result.success) {
      loadItems(selectedService.id);
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name || '');
    setPrice(item.price?.toString() || '');
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setIsActive(item.isActive !== false);
    setModalVisible(true);
  };

  const resetForm = () => {
    setItemName('');
    setPrice('');
    setDescription('');
    setImage(null);
    setImageUrl('');
    setIsActive(true);
    setEditingItem(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedService) {
      loadItems(selectedService.id);
    } else {
      loadServices();
    }
  };

  const renderItemCard = ({ item }) => (
    <View style={[styles.itemCard, !item.isActive && styles.itemCardDisabled]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.placeholderImage]}>
          <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{item.price} ج</Text>
        </View>
        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {!item.isActive && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>غير نشط</Text>
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
          style={[styles.actionButton, item.isActive ? styles.disableButton : styles.enableButton]}
          onPress={() => handleToggleStatus(item)}
        >
          <Ionicons
            name={item.isActive ? "close-outline" : "checkmark-outline"}
            size={18}
            color="#FFF"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
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
      <View style={[styles.header, { backgroundColor: selectedService?.color || '#4F46E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedService ? selectedService.name : 'إدارة الأصناف'}
        </Text>
        {selectedService && (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={28} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* اختيار الخدمة - يظهر فقط لو مفيش serviceId محدد */}
      {!selectedService && services.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceChip, { borderColor: service.color }]}
              onPress={() => setSelectedService(service)}
            >
              <Ionicons name={service.icon} size={18} color={service.color} />
              <Text style={styles.serviceChipText}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!selectedService && services.length === 0 && (
        <View style={styles.noServicesContainer}>
          <Text style={styles.noServicesText}>لا توجد خدمات لها أصناف</Text>
        </View>
      )}

      {selectedService && (
        <FlatList
          data={items}
          renderItem={renderItemCard}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد أصناف</Text>
              <Text style={styles.emptySubText}>اضغط على + لإضافة صنف جديد</Text>
            </View>
          }
        />
      )}

      {/* Modal إضافة/تعديل صنف */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>اسم الصنف</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: قميص"
                value={itemName}
                onChangeText={setItemName}
              />

              <Text style={styles.label}>السعر (جنيه)</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: 30"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <Text style={styles.label}>الوصف (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="وصف الصنف..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>الصورة (اختياري)</Text>
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
                <Text style={styles.label}>متاح</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (submitting || uploading) && styles.disabled]}
                onPress={editingItem ? handleUpdateItem : handleAddItem}
                disabled={submitting || uploading}
              >
                {(submitting || uploading) ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingItem ? 'تحديث الصنف' : 'إضافة الصنف'}
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
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  servicesScroll: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
    borderWidth: 1,
  },
  serviceChipText: { fontSize: 13, color: '#6B7280' },
  noServicesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noServicesText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  itemCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B' },
  itemDescription: { fontSize: 12, color: '#6B7280' },
  unavailableBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  unavailableText: { fontSize: 10, color: '#EF4444', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 4 },
  actionButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F59E0B' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScrollContent: { paddingBottom: 20 },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, marginTop: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
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

