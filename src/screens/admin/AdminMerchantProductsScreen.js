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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { approveProduct, rejectProduct } from '../../services/productService';

const PRODUCTS_COLLECTION = TABLES.PRODUCTS;

export default function AdminMerchantProductsScreen({ navigation, route }) {
  const { merchantId, merchantName, serviceId } = route.params || {};

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!merchantId || !serviceId) {
      Alert.alert('خطأ', 'بيانات غير كاملة');
      navigation.goBack();
      return;
    }
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from(PRODUCTS_COLLECTION)
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        $id: item.id,
        ...item,
      }));

      setProducts(formattedData);
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error);
      Alert.alert('خطأ', 'فشل تحميل المنتجات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = (product) => {
    Alert.alert(
      'موافقة على المنتج',
      `هل أنت متأكد من الموافقة على المنتج "${product.name}"؟`,
      [
        { text: 'إلغاء' },
        {
          text: 'موافقة',
          onPress: async () => {
            const result = await approveProduct(product.$id);
            if (result.success) {
              Alert.alert('✅ تم', 'تمت الموافقة على المنتج');
              loadProducts();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال سبب الرفض');
      return;
    }

    Alert.alert(
      'رفض المنتج',
      `هل أنت متأكد من رفض "${selectedProduct?.name}"؟`,
      [
        { text: 'إلغاء' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            const result = await rejectProduct(selectedProduct.$id, rejectReason);
            if (result.success) {
              setRejectModal(false);
              setRejectReason('');
              Alert.alert('✅ تم', 'تم رفض المنتج');
              loadProducts();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return { text: 'مقبول', color: '#10B981', bg: '#D1FAE5' };
      case 'pending': return { text: 'قيد المراجعة', color: '#F59E0B', bg: '#FEF3C7' };
      case 'rejected': return { text: 'مرفوض', color: '#EF4444', bg: '#FEE2E2' };
      default: return { text: 'غير محدد', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const renderProduct = ({ item }) => {
    const badge = getStatusBadge(item.status);
    return (
      <View style={styles.productCard}>
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
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleApprove(item)}>
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => {
                setSelectedProduct(item);
                setRejectModal(true);
              }}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
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
        <Text style={styles.headerTitle} numberOfLines={1}>{merchantName || 'التاجر'}</Text>
        <TouchableOpacity onPress={loadProducts}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.$id || item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProducts} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد منتجات لهذا التاجر</Text>
          </View>
        }
      />

      <Modal visible={rejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>سبب الرفض</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="اكتب سبب الرفض..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModal(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, textAlign: 'center' },
  list: { padding: 16 },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginBottom: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  actions: { justifyContent: 'center', gap: 8, marginLeft: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  approveButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1F2937' },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  cancelButton: { backgroundColor: '#F3F4F6' },
  confirmButton: { backgroundColor: '#EF4444' },
  cancelButtonText: { color: '#1F2937', fontWeight: '600' },
  confirmButtonText: { color: '#FFF', fontWeight: '600' },
});
