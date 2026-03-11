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
  Modal,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getItemsByService, createItem, deleteItem, updateItem } from '../services/itemService';
import { uploadToImageKit } from '../services/uploadService';

const { width } = Dimensions.get('window');

export default function ItemsServiceScreen({ route, navigation }) {
  const { serviceId, serviceName, serviceColor, subServices = [], isAdmin = true } = route.params || {};
  
  console.log('📦 ItemsServiceScreen - الخدمات الفرعية المستلمة:', subServices);
  console.log('📦 عدد الخدمات الفرعية:', subServices.length);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // حقول النموذج
  const [itemName, setItemName] = useState('');
  const [itemImage, setItemImage] = useState(null);
  const [itemIsActive, setItemIsActive] = useState(true);
  
  // قيم الخدمات الفرعية
  const [subServiceValues, setSubServiceValues] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  // تهيئة قيم الخدمات الفرعية
  useEffect(() => {
    if (subServices && subServices.length > 0) {
      console.log('✅ تهيئة الخدمات الفرعية:', subServices);
      const initialValues = {};
      subServices.forEach(sub => {
        initialValues[sub] = { price: '', qty: '' };
      });
      setSubServiceValues(initialValues);
    }
  }, [subServices]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (serviceId) {
        console.log(`🔍 جلب الأصناف للخدمة: ${serviceId}`);
        const itemsResult = await getItemsByService(serviceId);
        if (itemsResult.success) {
          setItems(itemsResult.data);
          console.log(`✅ تم جلب ${itemsResult.data.length} صنف`);
        } else {
          setItems([]);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      setItems([]);
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
        setUploading(true);
        const uploadResult = await uploadToImageKit(
          result.assets[0].uri,
          `item_${Date.now()}.jpg`,
          'item',
          serviceName
        );
        setUploading(false);

        if (uploadResult.success) {
          setItemImage(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل في رفع الصورة');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const updateSubServiceValue = (subService, field, value) => {
    setSubServiceValues(prev => ({
      ...prev,
      [subService]: {
        ...(prev[subService] || {}),
        [field]: value
      }
    }));
  };

  const handleAddItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('تنبيه', 'اسم الصنف مطلوب');
      return;
    }

    const servicesList = subServices;

    if (servicesList.length === 0) {
      Alert.alert('تنبيه', 'لا توجد خدمات فرعية لهذه الخدمة');
      return;
    }

    for (const sub of servicesList) {
      const price = subServiceValues[sub]?.price;
      if (!price || isNaN(parseFloat(price))) {
        Alert.alert('تنبيه', `السعر مطلوب لـ "${sub}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const subServicesData = {};
      servicesList.forEach(sub => {
        subServicesData[sub] = {
          price: parseFloat(subServiceValues[sub]?.price || 0),
          qty: subServiceValues[sub]?.qty ? parseInt(subServiceValues[sub].qty) : 0
        };
      });

      const itemData = {
        name: itemName.trim(),
        imageUrl: itemImage,
        isAvailable: itemIsActive,
        subServices: subServicesData,
      };

      console.log(`📦 إنشاء صنف للخدمة: ${serviceId}`);

      let result;
      if (editingItem) {
        result = await updateItem(editingItem.$id, itemData);
      } else {
        result = await createItem(serviceId, itemData);
      }

      if (result.success) {
        Alert.alert('✅ تم', editingItem ? 'تم تحديث الصنف' : 'تم إضافة الصنف');
        resetForm();
        loadData();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSubmitting(false);
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
            try {
              const result = await deleteItem(item.$id);
              if (result.success) {
                Alert.alert('تم', 'تم حذف الصنف');
                loadData();
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              Alert.alert('خطأ', error.message);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemImage(item.imageUrl || null);
    setItemIsActive(item.isActive !== false);
    
    // تعبئة قيم الخدمات الفرعية من العنصر - باستخدام حقل prices
    if (item.prices && item.prices.length > 0) {
      const values = {};
      item.prices.forEach(p => {
        values[p.subService] = {
          price: p.price?.toString() || '',
          qty: p.qty?.toString() || ''
        };
      });
      setSubServiceValues(values);
    } else if (item.subServices) {
      // للتوافق مع البيانات القديمة
      const values = {};
      subServices.forEach(sub => {
        values[sub] = {
          price: item.subServices[sub]?.price?.toString() || '',
          qty: item.subServices[sub]?.qty?.toString() || ''
        };
      });
      setSubServiceValues(values);
    }
    
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setItemName('');
    setItemImage(null);
    setItemIsActive(true);
    
    if (subServices.length > 0) {
      const initialValues = {};
      subServices.forEach(sub => {
        initialValues[sub] = { price: '', qty: '' };
      });
      setSubServiceValues(initialValues);
    }
    
    setModalVisible(false);
  };

  const renderItem = ({ item }) => {
    // استخدام prices إذا كان موجوداً، وإلا استخدام subServices القديم
    const prices = item.prices || [];
    
    return (
      <View style={styles.itemCard}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: (serviceColor || '#F59E0B') + '20' }]}>
            <Ionicons name="shirt-outline" size={30} color={serviceColor || '#F59E0B'} />
          </View>
        )}
        
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {isAdmin && (
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteItem(item)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* عرض الخدمات الفرعية من حقل prices */}
          {prices.length > 0 ? (
            prices.map((priceData, index) => (
              <View key={index} style={styles.subServiceRow}>
                <Text style={styles.subServiceLabel}>{priceData.subService}:</Text>
                <Text style={styles.subServicePrice}>{priceData.price} ج</Text>
                {priceData.qty > 0 && (
                  <Text style={styles.subServiceQty}>(الكمية: {priceData.qty})</Text>
                )}
              </View>
            ))
          ) : (
            // للتوافق مع البيانات القديمة
            subServices.map(sub => {
              const subData = item.subServices?.[sub] || { price: 0, qty: 0 };
              return (
                <View key={sub} style={styles.subServiceRow}>
                  <Text style={styles.subServiceLabel}>{sub}:</Text>
                  <Text style={styles.subServicePrice}>{subData.price} ج</Text>
                  {subData.qty > 0 && (
                    <Text style={styles.subServiceQty}>(الكمية: {subData.qty})</Text>
                  )}
                </View>
              );
            })
          )}

          <View style={styles.itemFooter}>
            <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10B98120' : '#EF444420' }]}>
              <Text style={[styles.statusText, { color: item.isActive ? '#10B981' : '#EF4444' }]}>
                {item.isActive ? 'متاح' : 'غير متاح'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={serviceColor || '#F59E0B'} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: serviceColor || '#F59E0B' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceName || 'إدارة الأصناف'}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={28} color={serviceColor || '#F59E0B'} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.$id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة صنف جديد</Text>
          </View>
        }
      />

      {/* نافذة إضافة/تعديل الصنف */}
      {isAdmin && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                </Text>

                <Text style={styles.label}>اسم الصنف *</Text>
                <TextInput
                  style={styles.input}
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="مثال: بنطلون"
                />

                <Text style={styles.label}>صورة الصنف (اختياري)</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {itemImage ? (
                    <Image source={{ uri: itemImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholderPicker}>
                      {uploading ? (
                        <ActivityIndicator size="large" color={serviceColor || '#F59E0B'} />
                      ) : (
                        <>
                          <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                          <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* الخدمات الفرعية */}
                {subServices.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>الخدمات المقدمة</Text>
                    {subServices.map((sub, index) => (
                      <View key={index} style={styles.subServiceSection}>
                        <Text style={styles.subServiceTitle}>{sub}</Text>
                        
                        <View style={styles.priceQtyRow}>
                          <View style={styles.priceInputContainer}>
                            <Text style={styles.subLabel}>السعر *</Text>
                            <TextInput
                              style={styles.priceInput}
                              value={subServiceValues[sub]?.price}
                              onChangeText={(value) => updateSubServiceValue(sub, 'price', value)}
                              placeholder="0.00"
                              keyboardType="numeric"
                            />
                          </View>
                          
                          <View style={styles.qtyInputContainer}>
                            <Text style={styles.subLabel}>الكمية</Text>
                            <TextInput
                              style={styles.qtyInput}
                              value={subServiceValues[sub]?.qty}
                              onChangeText={(value) => updateSubServiceValue(sub, 'qty', value)}
                              placeholder="0"
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={styles.noSubServicesContainer}>
                    <Ionicons name="warning-outline" size={40} color="#F59E0B" />
                    <Text style={styles.noSubServicesText}>لا توجد خدمات فرعية</Text>
                  </View>
                )}

                <View style={styles.switchContainer}>
                  <Text style={styles.label}>متاح</Text>
                  <TouchableOpacity
                    style={[
                      styles.availabilitySwitch,
                      itemIsActive ? styles.availableActive : styles.availableInactive
                    ]}
                    onPress={() => setItemIsActive(!itemIsActive)}
                  >
                    <View style={[
                      styles.switchKnob,
                      itemIsActive ? styles.knobRight : styles.knobLeft
                    ]} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, (submitting || uploading) && styles.disabled]}
                  onPress={handleAddItem}
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

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelButtonText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // نفس الأنماط السابقة
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  itemActions: { flexDirection: 'row', gap: 12 },
  editButton: { padding: 4 },
  deleteButton: { padding: 4 },
  
  subServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  subServiceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    minWidth: 80,
  },
  subServicePrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  subServiceQty: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  itemFooter: { marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },

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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 20 },
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
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1F2937', 
    marginTop: 15, 
    marginBottom: 10,
  },
  subServiceSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subServiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 8,
  },
  priceQtyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceInputContainer: {
    flex: 2,
  },
  qtyInputContainer: {
    flex: 1,
  },
  subLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  priceInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  qtyInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  noSubServicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginVertical: 15,
  },
  noSubServicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 10,
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
  imagePlaceholderPicker: {
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
    marginTop: 15,
    marginBottom: 20,
  },
  availabilitySwitch: {
    width: 50,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  availableActive: {
    backgroundColor: '#10B981',
  },
  availableInactive: {
    backgroundColor: '#EF4444',
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
  },
  knobRight: {
    alignSelf: 'flex-end',
  },
  knobLeft: {
    alignSelf: 'flex-start',
  },
  
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { padding: 16, alignItems: 'center' },
  cancelButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
