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
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { uploadServiceImage } from '../../services/uploadService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageMerchantProductsScreen({ navigation, route }) {
  const { collectionName, serviceName } = route.params;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentMerchant, setCurrentMerchant] = useState(null);

  // حقول النموذج
  const [productName, setName] = useState('');
  const [productPrice, setPrice] = useState('');
  const [productDescription, setDescription] = useState('');
  const [productImage, setImage] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentMerchant) {
      loadProducts();
    }
  }, [currentMerchant]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentMerchant(user);
      } else {
        Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
        navigation.goBack();
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات المستخدم:', error);
    }
  };

  const loadProducts = async () => {
    if (!currentMerchant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(collectionName)
        .select('*')
        .eq('merchant_id', currentMerchant.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        $id: item.id,
        ...item,
      }));

      setProducts(formattedData);
    } catch (error) {
      console.error('خطأ في تحميل المنتجات:', error);
      Alert.alert('خطأ', 'فشل تحميل المنتجات');
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
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
        setUploading(false);

        if (uploadResult.success) {
          setImage(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل في رفع الصورة');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setDescription('');
    setImage(null);
    setIsAvailable(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name || '');
    setPrice(product.price?.toString() || '');
    setDescription(product.description || '');
    setImage(product.image_url || null);
    setIsAvailable(product.is_available !== false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!currentMerchant) return;

    if (!productName.trim()) {
      Alert.alert('تنبيه', 'اسم المنتج مطلوب');
      return;
    }

    if (!productPrice || isNaN(parseFloat(productPrice))) {
      Alert.alert('تنبيه', 'السعر مطلوب');
      return;
    }

    setSubmitting(true);

    try {
      const productData = {
        name: productName.trim(),
        price: parseFloat(productPrice),
        description: productDescription.trim(),
        image_url: productImage || null,
        is_available: isAvailable,
        merchant_id: currentMerchant.id,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from(collectionName)
          .update(productData)
          .eq('id', editingProduct.$id);

        if (error) throw error;
        Alert.alert('✅ تم', 'تم تحديث المنتج');
      } else {
        const { error } = await supabase
          .from(collectionName)
          .insert([{
            ...productData,
            created_at: new Date().toISOString(),
          }]);

        if (error) throw error;
        Alert.alert('✅ تم', 'تم إضافة المنتج');
      }

      setModalVisible(false);
      resetForm();
      loadProducts();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      'حذف المنتج',
      `هل أنت متأكد من حذف "${product.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from(collectionName)
                .delete()
                .eq('id', product.$id);

              if (error) throw error;
              loadProducts();
            } catch (error) {
              Alert.alert('خطأ', error.message);
            }
          }
        }
      ]
    );
  };

  const toggleAvailability = async (product) => {
    try {
      const { error } = await supabase
        .from(collectionName)
        .update({
          is_available: !product.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.$id);

      if (error) throw error;
      loadProducts();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const renderProduct = ({ item }) => (
    <View style={[styles.productCard, !item.is_available && styles.productCardDisabled]}>
      <TouchableOpacity
        style={styles.productContent}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price} ج</Text>
          {item.description && (
            <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, item.is_available ? styles.disableButton : styles.enableButton]}
          onPress={() => toggleAvailability(item)}
        >
          <Ionicons
            name={item.is_available ? 'close-outline' : 'checkmark-outline'}
            size={16}
            color="#FFF"
          />
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
        <Text style={styles.headerTitle}>إدارة {serviceName}</Text>
        <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.$id || item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد منتجات</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة منتج جديد</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>اسم المنتج *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: حليب طازج"
                value={productName}
                onChangeText={setName}
              />

              <Text style={styles.label}>السعر (ج) *</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                value={productPrice}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <Text style={styles.label}>الوصف (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="وصف المنتج..."
                value={productDescription}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>صورة المنتج (اختياري)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
                {productImage ? (
                  <Image source={{ uri: productImage }} style={styles.previewImage} />
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

              <View style={styles.switchContainer}>
                <Text style={styles.label}>المنتج متاح</Text>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, (submitting || uploading) && styles.disabled]}
                onPress={handleSave}
                disabled={submitting || uploading}
              >
                {(submitting || uploading) ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'حفظ التغييرات' : 'إضافة المنتج'}
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

  productCard: {
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
  productCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  productContent: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  productPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginTop: 2 },
  productDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
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
