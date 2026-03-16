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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProductsByService } from '../services/productService';
import { useCart } from '../context/CartContext';

export default function ProductsServiceScreen({ navigation, route }) {
  const { serviceId, serviceName } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      console.log(`🔍 جلب منتجات الخدمة: ${serviceId}`);
      const result = await getProductsByService(serviceId);
      
      if (result.success) {
        console.log(`✅ تم جلب ${result.data.length} منتج`);
        setProducts(result.data);
      } else {
        console.error('❌ فشل جلب المنتجات:', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب المنتجات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddToCart = (product) => {
    addToCart({
      ...product,
      quantity: 1,
      cartItemId: Date.now().toString()
    });
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price} ج</Text>
        <Text style={styles.productMerchant}>{item.merchantName}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToCart(item)}
        >
          <Ionicons name="add-circle" size={24} color="#4F46E5" />
          <Text style={styles.addButtonText}>إضافة للسلة</Text>
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
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProducts} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد منتجات متاحة</Text>
          </View>
        }
      />
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
  productImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginBottom: 2 },
  productMerchant: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
  },
  addButtonText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280' },
});
