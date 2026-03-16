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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMerchantProducts, deleteProduct } from '../../services/productService';

export default function MyProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserAndProducts();
  }, []);

  const loadUserAndProducts = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('✅ المستخدم الحالي:', user.$id);
        setMerchantId(user.$id);
        await loadProducts(user.$id);
      } else {
        setError('لم يتم العثور على بيانات المستخدم');
        setLoading(false);
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات المستخدم:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const loadProducts = async (mId) => {
    try {
      console.log(`🔍 جلب منتجات التاجر: ${mId}`);
      const result = await getMerchantProducts(mId);
      if (result.success) {
        setProducts(result.data);
        console.log(`✅ تم جلب ${result.data.length} منتج`);
      } else {
        console.error('❌ فشل جلب المنتجات:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب المنتجات:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      'حذف المنتج',
      `هل أنت متأكد من حذف "${product.name}"؟`,
      [
        { text: 'إلغاء' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteProduct(product.$id);
            if (result.success) {
              loadProducts(merchantId);
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
      case 'pending': return { text: 'قيد المراجعة', color: '#F59E0B', bg: '#FEF3C7' };
      case 'approved': return { text: 'مقبول', color: '#10B981', bg: '#D1FAE5' };
      case 'rejected': return { text: 'مرفوض', color: '#EF4444', bg: '#FEE2E2' };
      default: return { text: status, color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const renderProduct = ({ item }) => {
    const badge = getStatusBadge(item.status);
    return (
      <View style={styles.productCard}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
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
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
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

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            loadUserAndProducts();
          }}
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>منتجاتي</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MerchantDashboard')}>
          <Ionicons name="home" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد منتجات</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProductScreen', {
                serviceId: 'products',
                serviceName: 'منتجات'
              })}
            >
              <Text style={styles.addButtonText}>إضافة منتج جديد</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
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
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  productPrice: { fontSize: 14, color: '#F59E0B', fontWeight: '600', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  deleteButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  addButton: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  addButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginTop: 12 },
  retryButton: { marginTop: 20, backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
