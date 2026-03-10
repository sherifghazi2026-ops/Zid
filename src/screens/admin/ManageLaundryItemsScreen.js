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
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllLaundryItems,
  createLaundryItem,
  updateLaundryItem,
  deleteLaundryItem,
  toggleLaundryItemStatus,
} from '../../services/laundryService';
import * as ImagePicker from 'expo-image-picker';
import { uploadServiceImage } from '../../services/uploadService';

export default function ManageLaundryItemsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // حقول الصنف
  const [itemId, setItemId] = useState('');
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [ironPrice, setIronPrice] = useState('');
  const [cleanPrice, setCleanPrice] = useState('');
  const [ironCount, setIronCount] = useState('0');
  const [cleanCount, setCleanCount] = useState('0');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const result = await getAllLaundryItems();
    if (result.success) {
      setItems(result.data);
    }
    setLoading(false);
    setRefreshing(false);
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
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
        setUploading(false);
        if (uploadResult.success) {
          setImage(uploadResult.fileUrl);
          Alert.alert('✅ تم', 'تم رفع الصورة بنجاح');
        } else {
          Alert.alert('خطأ', 'فشل في رفع الصورة');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const handleAddItem = async () => {
    if (!itemId.trim() || !name.trim() || !ironPrice.trim() || !cleanPrice.trim()) {
      Alert.alert('تنبيه', 'جميع الحقول مطلوبة');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createLaundryItem({
        id: itemId.trim().toLowerCase().replace(/\s+/g, '_'),
        name: name.trim(),
        imageUrl: image || null,
        ironPrice: parseFloat(ironPrice),
        cleanPrice: parseFloat(cleanPrice),
        ironCount: parseInt(ironCount) || 0,
        cleanCount: parseInt(cleanCount) || 0,
      });

      if (result.success) {
        Alert.alert('تم', 'تم إضافة الصنف بنجاح');
        setModalVisible(false);
        resetForm();
        loadItems();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إضافة الصنف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!name.trim() || !ironPrice.trim() || !cleanPrice.trim()) {
      Alert.alert('تنبيه', 'جميع الحقول مطلوبة');
      return;
    }

    setSubmitting(true);

    try {
      const result = await updateLaundryItem(editingItem.$id, {
        name: name.trim(),
        imageUrl: image || imageUrl || null,
        ironPrice: parseFloat(ironPrice),
        cleanPrice: parseFloat(cleanPrice),
        ironCount: parseInt(ironCount) || 0,
        cleanCount: parseInt(cleanCount) || 0,
      });

      if (result.success) {
        Alert.alert('تم', 'تم تحديث الصنف بنجاح');
        setModalVisible(false);
        resetForm();
        loadItems();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث الصنف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const result = await toggleLaundryItemStatus(item.$id, !item.isActive);
    if (result.success) {
      loadItems();
    } else {
      Alert.alert('خطأ', result.error);
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
            const result = await deleteLaundryItem(item.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الصنف');
              loadItems();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemId(item.id);
    setName(item.name);
    setImageUrl(item.imageUrl || '');
    setIronPrice(String(item.ironPrice));
    setCleanPrice(String(item.cleanPrice));
    setIronCount(String(item.ironCount || 0));
    setCleanCount(String(item.cleanCount || 0));
    setModalVisible(true);
  };

  const resetForm = () => {
    setItemId('');
    setName('');
    setImage(null);
    setImageUrl('');
    setIronPrice('');
    setCleanPrice('');
    setIronCount('0');
    setCleanCount('0');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
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
        <Text style={styles.headerTitle}>إدارة أصناف المكوجي</Text>
        <TouchableOpacity onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة صنف جديد</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.$id} style={[styles.itemCard, !item.isActive && styles.itemCardDisabled]}>
              <View style={styles.itemHeader}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.imagePlaceholder]}>
                    <Ionicons name="shirt-outline" size={24} color="#F59E0B" />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemId}>{item.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10B98120' : '#EF444420' }]}>
                  <Text style={[styles.statusText, { color: item.isActive ? '#10B981' : '#EF4444' }]}>
                    {item.isActive ? 'نشط' : 'معطل'}
                  </Text>
                </View>
              </View>

              <View style={styles.pricesContainer}>
                <View style={styles.priceBox}>
                  <Ionicons name="flame-outline" size={16} color="#EF4444" />
                  <Text style={styles.priceLabel}>كوي فقط</Text>
                  <Text style={styles.priceValue}>{item.ironPrice} ج</Text>
                  <View style={styles.countContainer}>
                    <Text style={styles.countLabel}>الكمية:</Text>
                    <Text style={styles.countValue}>{item.ironCount || 0}</Text>
                  </View>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceBox}>
                  <Ionicons name="water-outline" size={16} color="#3B82F6" />
                  <Text style={styles.priceLabel}>غسيل وكوي</Text>
                  <Text style={styles.priceValue}>{item.cleanPrice} ج</Text>
                  <View style={styles.countContainer}>
                    <Text style={styles.countLabel}>الكمية:</Text>
                    <Text style={styles.countValue}>{item.cleanCount || 0}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>تعديل</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, item.isActive ? styles.disableButton : styles.enableButton]}
                  onPress={() => handleToggleStatus(item)}
                >
                  <Ionicons name={item.isActive ? "close-circle-outline" : "checkmark-circle-outline"} size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>{item.isActive ? 'تعطيل' : 'تفعيل'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteItem(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal إضافة/تعديل صنف */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {!editingItem && (
                  <>
                    <Text style={styles.label}>المعرف (id) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="shirt" placeholderTextColor="#9CA3AF"
                      value={itemId}
                      onChangeText={setItemId}
                      autoCapitalize="none"
                    />
                  </>
                )}

                <Text style={styles.label}>الاسم *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="قميص" placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>صورة الصنف</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
                  {image || imageUrl ? (
                    <Image source={{ uri: image || imageUrl }} style={styles.previewImage} />
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

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>كوي فقط (سعر) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10" placeholderTextColor="#9CA3AF"
                      value={ironPrice}
                      onChangeText={setIronPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>غسيل وكوي (سعر) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="15" placeholderTextColor="#9CA3AF"
                      value={cleanPrice}
                      onChangeText={setCleanPrice}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>كمية الكوي</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0" placeholderTextColor="#9CA3AF"
                      value={ironCount}
                      onChangeText={setIronCount}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>كمية الغسيل والكوي</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0" placeholderTextColor="#9CA3AF"
                      value={cleanCount}
                      onChangeText={setCleanCount}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, (submitting || uploading) && styles.disabled]}
                  onPress={editingItem ? handleUpdateItem : handleAddItem}
                  disabled={submitting || uploading}
                >
                  {(submitting || uploading) ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingItem ? 'حفظ التغييرات' : 'إضافة الصنف'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },

  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  imagePlaceholder: {
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  itemId: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },

  pricesContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  priceBox: { flex: 1, alignItems: 'center' },
  priceDivider: { width: 1, backgroundColor: '#E5E7EB' },
  priceLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  priceValue: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginTop: 2 },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countLabel: { fontSize: 10, color: '#6B7280' },
  countValue: { fontSize: 12, fontWeight: '600', color: '#F59E0B', marginLeft: 4 },

  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButton: { backgroundColor: '#F59E0B' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
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
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
