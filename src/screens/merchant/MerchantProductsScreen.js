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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';
import { useCart } from '../../context/CartContext';
import DynamicMongez from '../../components/DynamicMongez';

export default function MerchantProductsScreen({ navigation, route }) {
  const { merchantId, merchantName, merchantImage, serviceType, serviceName } = route.params;
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    console.log(`🔍 جلب منتجات التاجر ${merchantName} (${merchantId}) للخدمة ${serviceType}`);
    
    try {
      // ✅ للمطاعم والأكل البيتي، نجيب من dishes collection
      if (serviceType === 'restaurant' || serviceType === 'home_chef') {
        const providerType = serviceType === 'restaurant' ? 'restaurant' : 'home_chef';
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          'dishes',
          [
            Query.equal('providerId', merchantId),
            Query.equal('providerType', providerType),
            Query.equal('status', 'approved'),
            Query.equal('isAvailable', true),
            Query.orderAsc('name')
          ]
        );
        
        console.log(`✅ تم جلب ${response.documents.length} طبق من dishes`);
        setProducts(response.documents);
      } 
      // ✅ للخدمات الأخرى (سوبر ماركت، مخبز)، نجيب من products collection
      else {
        const response = await databases.listDocuments(
          DATABASE_ID,
          'products',
          [
            Query.equal('merchantId', merchantId),
            Query.equal('serviceId', 'products'),
            Query.equal('status', 'approved'),
            Query.equal('isAvailable', true),
            Query.orderAsc('name')
          ]
        );
        
        console.log(`✅ تم جلب ${response.documents.length} منتج من products`);
        setProducts(response.documents);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب المنتجات:', error);
      Alert.alert('خطأ', 'فشل في تحميل المنتجات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddToCart = (item) => {
    // ✅ تجهيز العنصر حسب نوعه
    const cartItem = {
      ...item,
      merchantId,
      merchantName,
      serviceType,
      quantity: 1,
      cartItemId: Date.now().toString()
    };

    // ✅ للخدمات من نوع مطاعم أو أكل بيتي، نضبط الاسم والعرض
    if (serviceType === 'restaurant' || serviceType === 'home_chef') {
      cartItem.name = item.name;
      cartItem.price = item.price;
      cartItem.imageUrl = item.images?.[0] || null;
    }

    addToCart(cartItem);
    Alert.alert('✅ تم', 'تمت إضافة العنصر إلى السلة');
  };

  const renderItem = ({ item }) => {
    // ✅ عرض مختلف للمطاعم (صور متعددة)
    const isRestaurant = serviceType === 'restaurant' || serviceType === 'home_chef';
    
    let imageUrl = null;
    if (isRestaurant) {
      imageUrl = item.images?.[0] || null;
    } else {
      imageUrl = item.imageUrl || null;
    }

    return (
      <View style={styles.productCard}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={30} color="#9CA3AF" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price} ج</Text>
          {item.description && (
            <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
          )}

          {/* ✅ عرض المكونات للأطباق */}
          {isRestaurant && item.ingredients && item.ingredients.length > 0 && (
            <View style={styles.ingredientsContainer}>
              <Text style={styles.ingredientsLabel}>المكونات:</Text>
              <Text style={styles.ingredientsText} numberOfLines={1}>
                {item.ingredients.join(' • ')}
              </Text>
            </View>
          )}

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
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{merchantName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {merchantImage && (
        <Image source={{ uri: merchantImage }} style={styles.coverImage} />
      )}

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProducts} />
        }
        ListHeaderComponent={
          products.length > 0 ? (
            <Text style={styles.sectionTitle}>منتجات {merchantName}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد منتجات متاحة</Text>
          </View>
        }
      />

      <DynamicMongez
        screen="service"
        navigation={navigation}
        contextData={{
          serviceId: serviceType,
          serviceName: serviceName,
          merchantId: merchantId,
          merchantName: merchantName
        }}
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
  coverImage: { width: '100%', height: 150, resizeMode: 'cover' },
  list: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
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
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  ingredientsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  ingredientsLabel: { fontSize: 11, color: '#4B5563', marginRight: 4 },
  ingredientsText: { fontSize: 11, color: '#6B7280', flex: 1 },
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
