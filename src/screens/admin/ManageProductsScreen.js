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
  TextInput,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAllProducts, createProduct, deleteProduct, toggleProductAvailability, uploadProductImage } from '../../services/productsService';

export default function ManageProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // حقول المنتج الجديد
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const result = await getAllProducts();
    if (result.success) {
      setProducts(result.data);
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
        mediaTypes: ['images'],
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

  const handleAddProduct = async () => {
    if (!name.trim() || !description.trim() || !price.trim()) {
      Alert.alert('تنبيه', 'الاسم والوصف والسعر مطلوبون');
      return;
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;
      if (image) {
        setUploading(true);
        const uploadResult = await uploadProductImage(image);
        setUploading(false);
        if (uploadResult.success) {
          imageUrl = uploadResult.url;
        }
      }

      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category: category.trim(),
        stock: stock ? parseInt(stock) : 0,
        imageUrl,
        isAvailable: true,
      };

      const result = await createProduct(productData);

      if (result.success) {
        Alert.alert('تم', 'تم إضافة المنتج بنجاح');
        setModalVisible(false);
        setName('');
        setDescription('');
        setPrice('');
        setCategory('');
        setStock('');
        setImage(null);
        loadProducts();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في إضافة المنتج:', error);
      Alert.alert('خطأ', 'فشل في إضافة المنتج');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleToggleAvailability = async (product) => {
    const result = await toggleProductAvailability(product.$id, !product.isAvailable);
    if (result.success) {
      loadProducts();
      Alert.alert('تم', `تم ${!product.isAvailable ? 'تفعيل' : 'تعطيل'} المنتج`);
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'حذف المنتج',
      `هل أنت متأكد من حذف ${product.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteProduct(product.$id, product.imageUrl);
            if (result.success) {
              Alert.alert('تم', 'تم حذف المنتج');
              loadProducts();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
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
        <Text style={styles.headerTitle}>إدارة المنتجات</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد منتجات</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة منتج جديد</Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product.$id} style={styles.productCard}>
              {product.imageUrl && (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              )}
              <View style={styles.productContent}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <View style={[styles.priceBadge, { backgroundColor: product.isAvailable ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.priceText, { color: product.isAvailable ? '#10B981' : '#EF4444' }]}>
                      {product.price} ج
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.productDescription} numberOfLines={2}>
                  {product.description}
                </Text>
                
                <View style={styles.productFooter}>
                  <View style={styles.productMeta}>
                    {product.category ? (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{product.category}</Text>
                      </View>
                    ) : null}
                    {product.stock > 0 ? (
                      <Text style={styles.stockText}>المخزون: {product.stock}</Text>
                    ) : null}
                  </View>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, product.isAvailable ? styles.disableButton : styles.enableButton]}
                      onPress={() => handleToggleAvailability(product)}
                    >
                      <Ionicons 
                        name={product.isAvailable ? "close-circle-outline" : "checkmark-circle-outline"} 
                        size={18} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteProduct(product)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal إضافة منتج جديد */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة منتج جديد</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>اسم المنتج</Text>
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="مثال: شامبو طبيعي" placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>وصف المنتج</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="وصف تفصيلي للمنتج..." placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>السعر (جنيه)</Text>
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="مثال: 150" placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <Text style={styles.label}>التصنيف (اختياري)</Text>
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="مثال: عناية بالبشرة" placeholderTextColor="#9CA3AF"
                value={category}
                onChangeText={setCategory}
              />

              <Text style={styles.label}>المخزون (اختياري)</Text>
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="مثال: 10" placeholderTextColor="#9CA3AF"
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
              />

              <Text style={styles.label}>صورة المنتج (اختياري)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addButton, (submitting || uploading) && styles.disabled]}
                onPress={handleAddProduct}
                disabled={submitting || uploading}
              >
                {(submitting || uploading) ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.addButtonText}>إضافة المنتج</Text>
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
  
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: 150, resizeMode: 'cover' },
  productContent: { padding: 16 },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  priceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  priceText: { fontSize: 14, fontWeight: '600' },
  productDescription: { fontSize: 14, color: '#6B7280', marginBottom: 8, lineHeight: 20 },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  categoryText: { fontSize: 10, color: '#6B7280' },
  stockText: { fontSize: 10, color: '#9CA3AF' },
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
  addButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
