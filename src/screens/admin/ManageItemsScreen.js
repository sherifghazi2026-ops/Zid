import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getItems, addItem, updateItem, deleteItem, toggleItemStatus } from '../../services/itemService';
import { uploadServiceImage } from '../../services/uploadService';

export default function ManageItemsScreen({ navigation, route }) {
  // استقبال البيانات من الراوتر
  const { collectionName, serviceName } = route.params;
  const isLaundry = collectionName === 'laundry_items';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);

  // حقول النموذج
  const [itemName, setName] = useState('');
  const [itemPrice, setPrice] = useState('');
  const [ironPrice, setIronPrice] = useState('');
  const [cleanPrice, setCleanPrice] = useState('');
  const [itemImage, setImage] = useState(null);
  const [isActive, setIsActive] = useState(true);

  // تحميل الأصناف عند فتح الشاشة
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const result = await getItems(collectionName);
    if (result.success) {
      setItems(result.data);
    } else {
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
    }
    setLoading(false);
  };

  // اختيار صورة من المعرض
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setUploading(true);
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
        setUploading(false);
        
        if (uploadResult.success) {
          setImage(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل رفع الصورة');
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل اختيار الصورة');
    }
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setIronPrice('');
    setCleanPrice('');
    setImage(null);
    setIsActive(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setPrice(item.price?.toString() || '');
    setIronPrice(item.ironPrice?.toString() || '');
    setCleanPrice(item.cleanPrice?.toString() || '');
    setImage(item.imageUrl || null);
    setIsActive(item.isActive !== false);
    setModalVisible(true);
  };

  // حفظ الصنف (إضافة أو تحديث)
  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert('تنبيه', 'اسم الصنف مطلوب');
      return;
    }

    // التحقق من الأسعار حسب نوع الخدمة
    if (isLaundry) {
      if (!ironPrice || !cleanPrice) {
        Alert.alert('تنبيه', 'جميع الأسعار مطلوبة');
        return;
      }
    } else {
      if (!itemPrice) {
        Alert.alert('تنبيه', 'السعر مطلوب');
        return;
      }
    }

    setUploading(true);

    // تجهيز بيانات الصنف
    const itemData = {
      name: itemName.trim(),
      imageUrl: itemImage,
      isActive,
    };

    if (isLaundry) {
      itemData.ironPrice = parseFloat(ironPrice);
      itemData.cleanPrice = parseFloat(cleanPrice);
    } else {
      itemData.price = parseFloat(itemPrice);
    }

    let result;
    if (editingItem) {
      result = await updateItem(collectionName, editingItem.$id, itemData);
    } else {
      result = await addItem(collectionName, itemData);
    }

    if (result.success) {
      Alert.alert('✅ تم', editingItem ? 'تم التحديث' : 'تم الإضافة');
      setModalVisible(false);
      resetForm();
      loadItems();
    } else {
      Alert.alert('خطأ', result.error);
    }
    setUploading(false);
  };

  // حذف صنف
  const handleDelete = (item) => {
    Alert.alert('تأكيد الحذف', `هل تريد حذف "${item.name}"؟`, [
      { text: 'إلغاء' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteItem(collectionName, item.$id);
          if (result.success) {
            loadItems();
          } else {
            Alert.alert('خطأ', result.error);
          }
        }
      }
    ]);
  };

  // تغيير حالة التفعيل
  const toggleActive = async (item) => {
    const result = await toggleItemStatus(collectionName, item.$id, !item.isActive);
    if (result.success) {
      loadItems();
    }
  };

  // عرض كل صنف
  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, !item.isActive && styles.itemCardDisabled]}>
      <TouchableOpacity style={styles.itemContent} onPress={() => openEditModal(item)}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {isLaundry ? (
            <>
              <Text style={styles.itemPrice}>كوي: {item.ironPrice} ج</Text>
              <Text style={styles.itemPrice}>غسيل: {item.cleanPrice} ج</Text>
            </>
          ) : (
            <Text style={styles.itemPrice}>{item.price} ج</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, item.isActive ? styles.disableButton : styles.enableButton]}
          onPress={() => toggleActive(item)}
        >
          <Ionicons name={item.isActive ? 'close-outline' : 'checkmark-outline'} size={16} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
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
        <Text style={styles.headerTitle}>إدارة {serviceName || 'الأصناف'}</Text>
        <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة صنف جديد</Text>
          </View>
        }
      />

      {/* نافذة إضافة/تعديل صنف */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>اسم الصنف</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setName}
                placeholder="مثال: بنطلون"
              />

              {isLaundry ? (
                <>
                  <Text style={styles.label}>سعر الكوي فقط</Text>
                  <TextInput
                    style={styles.input}
                    value={ironPrice}
                    onChangeText={setIronPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.label}>سعر الكوي والتنظيف</Text>
                  <TextInput
                    style={styles.input}
                    value={cleanPrice}
                    onChangeText={setCleanPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>السعر</Text>
                  <TextInput
                    style={styles.input}
                    value={itemPrice}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </>
              )}

              <Text style={styles.label}>الصورة (اختياري)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {itemImage ? (
                  <Image source={{ uri: itemImage }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {uploading ? (
                      <ActivityIndicator color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>متاح</Text>
                <Switch value={isActive} onValueChange={setIsActive} />
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
                    {editingItem ? 'حفظ التغييرات' : 'إضافة الصنف'}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  emptySubText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCardDisabled: { opacity: 0.6 },
  itemContent: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  itemPrice: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },
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
    marginVertical: 10,
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
