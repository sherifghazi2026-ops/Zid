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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllServices } from '../../services/servicesService';
import { getAllPendingItems, reviewItem } from '../../services/itemService';

export default function AdminProductsReviewScreen({ navigation }) {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadPendingProducts();
  }, []);

  const loadPendingProducts = async () => {
    setLoading(true);
    
    // جلب كل الخدمات اللي ليها منتجات
    const servicesResult = await getAllServices();
    if (servicesResult.success) {
      // جمع أسماء الـ collections
      const collections = servicesResult.data
        .filter(s => s.hasItems && s.itemsCollection)
        .map(s => s.itemsCollection);
      
      console.log('📚 Collections:', collections);
      
      // جلب كل المنتجات المعلقة
      const result = await getAllPendingItems(collections);
      if (result.success) {
        console.log(`📦 تم جلب ${result.data.length} منتج معلق`);
        
        // إضافة اسم الخدمة لكل منتج
        const productsWithService = result.data.map(product => {
          const service = servicesResult.data.find(s => s.id === product.serviceId);
          console.log(`🔍 المنتج: ${product.name}, collection: ${product.collectionName}`);
          return {
            ...product,
            serviceName: service?.name || 'خدمة غير معروفة',
            serviceColor: service?.color || '#6B7280',
          };
        });
        setPendingProducts(productsWithService);
      }
    }
    
    setLoading(false);
  };

  const handleApprove = (product) => {
    Alert.alert(
      'موافقة على المنتج',
      `هل أنت متأكد من الموافقة على المنتج "${product.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'موافقة',
          onPress: async () => {
            // استخدام collectionName اللي ضفناها
            const collectionId = product.collectionName;
            console.log('📤 محاولة الموافقة:', { collectionId, productId: product.$id });
            
            if (!collectionId) {
              Alert.alert('خطأ', 'معرف المجموعة غير موجود');
              return;
            }
            
            const result = await reviewItem(collectionId, product.$id, 'approved', '');
            if (result.success) {
              Alert.alert('✅ تم', 'تمت الموافقة على المنتج');
              loadPendingProducts();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const openRejectModal = (product) => {
    setSelectedProduct(product);
    setReviewNotes('');
    setModalVisible(true);
  };

  const handleReject = async () => {
    if (!selectedProduct) return;
    
    const collectionId = selectedProduct.collectionName;
    console.log('📤 محاولة الرفض:', { collectionId, productId: selectedProduct.$id });
    
    if (!collectionId) {
      Alert.alert('خطأ', 'معرف المجموعة غير موجود');
      setModalVisible(false);
      return;
    }
    
    const result = await reviewItem(collectionId, selectedProduct.$id, 'rejected', reviewNotes);
    
    if (result.success) {
      Alert.alert('✅ تم', 'تم رفض المنتج');
      setModalVisible(false);
      loadPendingProducts();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const renderProduct = ({ item }) => {
    // محاولة الحصول على الصورة (سواء كانت imageUrl أو images array)
    const imageSource = item.imageUrl 
      ? item.imageUrl 
      : (item.images && item.images.length > 0 ? item.images[0] : null);

    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          {imageSource ? (
            <Image source={{ uri: imageSource }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholder]}>
              <Ionicons name="image-outline" size={30} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>{item.price} ج</Text>
            <View style={[styles.serviceBadge, { backgroundColor: item.serviceColor + '20' }]}>
              <Text style={[styles.serviceText, { color: item.serviceColor }]}>
                {item.serviceName}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.providerInfo}>
          مقدم من: {item.providerName} ({item.providerType})
        </Text>
        
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.actionText}>موافقة</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => openRejectModal(item)}
          >
            <Ionicons name="close-circle" size={20} color="#FFF" />
            <Text style={styles.actionText}>رفض</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مراجعة المنتجات</Text>
        <TouchableOpacity onPress={loadPendingProducts}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={pendingProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد منتجات بانتظار المراجعة</Text>
            </View>
          }
        />
      )}

      {/* Modal رفض المنتج */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>رفض المنتج</Text>
            <Text style={styles.modalSubtitle}>{selectedProduct?.name}</Text>
            
            <Text style={styles.label}>سبب الرفض (اختياري)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder="اكتب سبب الرفض..."
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={handleReject}
              >
                <Text style={styles.confirmButtonText}>تأكيد الرفض</Text>
              </TouchableOpacity>
            </View>
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 4,
  },
  serviceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  serviceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  providerInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
