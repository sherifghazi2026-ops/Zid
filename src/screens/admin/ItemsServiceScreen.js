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
import { supabase } from '../../lib/supabaseClient';
import { uploadServiceImage } from '../../services/uploadService';

export default function ItemsServiceScreen({ navigation, route }) {
  const { serviceId, serviceName, collectionName, subServices = [] } = route.params;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);

  // حقول النموذج
  const [itemName, setName] = useState('');
  const [itemImage, setImage] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [subServicePrices, setSubServicePrices] = useState({});

  // الخدمات الفرعية الافتراضية
  const defaultSubServices = ['كي فقط', 'غسيل وكوي'];
  const actualSubServices = subServices.length > 0 ? subServices : defaultSubServices;
  const actualCollectionName = collectionName || `${serviceId}_items`;

  useEffect(() => {
    loadItems();
    const initialPrices = {};
    actualSubServices.forEach(sub => { initialPrices[sub] = ''; });
    setSubServicePrices(initialPrices);
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(actualCollectionName)
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        $id: item.id,
        ...item,
        created_at: item.created_at,
      }));
      setItems(formattedData);
    } catch (error) {
      console.error('❌ خطأ في تحميل الأصناف:', error);
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
    } finally {
      setLoading(false);
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
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
        setUploading(false);
        if (uploadResult.success) {
          setImage(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل رفع الصورة');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل اختيار الصورة');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setName('');
    setImage(null);
    setIsActive(true);
    const resetPrices = {};
    actualSubServices.forEach(sub => { resetPrices[sub] = ''; });
    setSubServicePrices(resetPrices);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setImage(item.image_url || null);
    setIsActive(item.is_active !== false);

    if (item.prices) {
      try {
        const prices = typeof item.prices === 'string' ? JSON.parse(item.prices) : item.prices;
        const priceMap = {};
        prices.forEach(p => {
          priceMap[p.subService] = p.price ? p.price.toString() : '';
        });
        setSubServicePrices(priceMap);
      } catch (e) {
        console.log('خطأ في قراءة الأسعار', e);
      }
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert('تنبيه', 'اسم الصنف مطلوب');
      return;
    }

    for (const sub of actualSubServices) {
      if (!subServicePrices[sub] || isNaN(parseFloat(subServicePrices[sub]))) {
        Alert.alert('تنبيه', `السعر مطلوب لـ "${sub}"`);
        return;
      }
    }

    setUploading(true);
    try {
      const pricesArray = actualSubServices.map(sub => ({
        subService: sub,
        price: parseFloat(subServicePrices[sub])
      }));
      const pricesJson = JSON.stringify(pricesArray);

      const itemData = {
        name: itemName.trim(),
        image_url: itemImage,
        is_active: isActive,
        service_id: serviceId,
        prices: pricesJson,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await supabase
          .from(actualCollectionName)
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        Alert.alert('✅ تم', 'تم تحديث الصنف');
      } else {
        const newItem = {
          ...itemData,
          created_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from(actualCollectionName)
          .insert([newItem]);

        if (error) throw error;
        Alert.alert('✅ تم', 'تم إضافة الصنف');
      }

      setModalVisible(false);
      resetForm();
      loadItems();
    } catch (error) {
      console.error('❌ خطأ في حفظ الصنف:', error);
      Alert.alert('خطأ', error.message || 'فشل في حفظ الصنف');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'حذف الصنف',
      `هل أنت متأكد من حذف "${item.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from(actualCollectionName)
                .delete()
                .eq('id', item.id);

              if (error) throw error;
              loadItems();
              Alert.alert('✅ تم', 'تم حذف الصنف');
            } catch (error) {
              console.error('❌ خطأ في حذف الصنف:', error);
              Alert.alert('خطأ', 'فشل في حذف الصنف');
            }
          }
        }
      ]
    );
  };

  const toggleActive = async (item) => {
    try {
      const { error } = await supabase
        .from(actualCollectionName)
        .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;
      loadItems();
      Alert.alert('✅ تم', `تم ${!item.is_active ? 'تفعيل' : 'تعطيل'} الصنف`);
    } catch (error) {
      console.error('❌ خطأ في تغيير حالة الصنف:', error);
      Alert.alert('خطأ', 'فشل في تغيير حالة الصنف');
    }
  };

  const renderItem = ({ item }) => {
    let pricesDisplay = '';
    try {
      const prices = typeof item.prices === 'string' ? JSON.parse(item.prices) : item.prices;
      pricesDisplay = prices.map(p => `${p.subService}: ${p.price}ج`).join(' | ');
    } catch (e) {
      pricesDisplay = 'لا توجد أسعار';
    }

    return (
      <View style={[styles.itemCard, !item.is_active && styles.itemCardDisabled]}>
        <TouchableOpacity style={styles.itemContent} onPress={() => openEditModal(item)}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
          ) : (
            <View style={[styles.itemImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrices} numberOfLines={2}>{pricesDisplay}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.disableButton]}
            onPress={() => toggleActive(item)}
          >
            <Ionicons name={item.is_active ? 'close-outline' : 'checkmark-outline'} size={18} color="#FFF" />
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
        keyExtractor={item => item.id || item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => { resetForm(); setModalVisible(true); }}
            >
              <Text style={styles.addButtonText}>إضافة صنف جديد</Text>
            </TouchableOpacity>
          </View>
        }
      />

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

              <Text style={styles.label}>اسم الصنف *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: بنطلون"
                value={itemName}
                onChangeText={setName}
              />

              <Text style={styles.label}>صورة الصنف (اختياري)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
                {itemImage ? (
                  <Image source={{ uri: itemImage }} style={styles.previewImage} />
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

              <Text style={styles.sectionTitle}>الخدمات المقدمة</Text>
              {actualSubServices.map((sub, index) => (
                <View key={index} style={styles.subServiceRow}>
                  <Text style={styles.subServiceLabel}>{sub}</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="السعر"
                    value={subServicePrices[sub]}
                    onChangeText={(text) => setSubServicePrices({...subServicePrices, [sub]: text})}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currency}>ج</Text>
                </View>
              ))}

              <View style={styles.switchContainer}>
                <Text style={styles.label}>الصنف نشط</Text>
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
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
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
  itemCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  itemContent: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  itemPrices: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F59E0B' },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginVertical: 10 },
  subServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  subServiceLabel: { flex: 2, fontSize: 14, color: '#1F2937' },
  priceInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  currency: { fontSize: 14, color: '#6B7280', width: 20 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
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
