import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMerchantProductsByService } from '../services/productService';
import { useCart } from '../context/CartContext';
import DynamicMongez from '../components/DynamicMongez';

export default function MerchantProductsScreen({ navigation, route }) {
  const { merchantId, merchantName, merchantImage, serviceType, serviceName } = route.params;
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const result = await getMerchantProductsByService(merchantId, serviceType);
    if (result.success) setProducts(result.data);
    setLoading(false);
    setRefreshing(false);
  };

  const handleAddToCart = (product) => {
    addToCart({ ...product, merchantId, merchantName, serviceType, quantity: 1 });
    Alert.alert('✅ تم', 'تمت إضافة المنتج إلى السلة');
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.productImage} /> :
        <View style={[styles.productImage, styles.placeholderImage]}><Ionicons name="image-outline" size={30} color="#9CA3AF" /></View>}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price} ج</Text>
        {item.description && <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>}
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
          <Ionicons name="add-circle" size={24} color="#4F46E5" /><Text style={styles.addButtonText}>إضافة للسلة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  const displayName = merchantName;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#1F2937" /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}><Ionicons name="cart" size={24} color="#4F46E5" /></TouchableOpacity>
      </View>
      {merchantImage && <Image source={{ uri: merchantImage }} style={styles.coverImage} />}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.$id || item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProducts} />}
        ListHeaderComponent={products.length > 0 ? <Text style={styles.sectionTitle}>منتجات {displayName}</Text> : null}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="cube-outline" size={80} color="#E5E7EB" /><Text style={styles.emptyText}>لا توجد منتجات متاحة</Text></View>}
      />
      <DynamicMongez screen="service" navigation={navigation} contextData={{ serviceId: serviceType, serviceName, merchantId, merchantName }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, textAlign: 'center' },
  coverImage: { width: '100%', height: 150, resizeMode: 'cover' },
  list: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  productCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  productImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4 },
  addButtonText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280' },
});
