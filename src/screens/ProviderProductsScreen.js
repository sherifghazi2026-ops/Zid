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
import { getItemsByProvider } from '../services/itemService';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

export default function ProviderProductsScreen({ route, navigation }) {
  const { providerId, providerName, providerType } = route.params;
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerInfo, setProviderInfo] = useState(null);

  useEffect(() => {
    loadProviderInfo();
    loadProducts();
  }, []);

  const loadProviderInfo = async () => {
    try {
      // جلب معلومات التاجر من users collection
      const res = await databases.listDocuments(
        DATABASE_ID,
        'users',
        [Query.equal('$id', providerId), Query.limit(1)]
      );
      if (res.documents.length > 0) {
        setProviderInfo(res.documents[0]);
      }
    } catch (error) {
      console.error('خطأ في جلب معلومات التاجر:', error);
    }
  };

  const loadProducts = async () => {
    try {
      console.log(`🔍 جلب منتجات التاجر: ${providerName}`);
      
      // تحديد collection name حسب نوع التاجر
      let collectionName = '';
      if (providerType === 'milk') {
        collectionName = 'service_milk_items';
      } else if (providerType === 'restaurant') {
        collectionName = 'dishes';
      } else if (providerType === 'home_chef') {
        collectionName = 'home_chef_dishes';
      }

      if (!collectionName) {
        console.error('❌ لا يوجد collection مخصص لهذا النوع');
        setProducts([]);
        setLoading(false);
        return;
      }

      const result = await getItemsByProvider(collectionName, providerId);
      if (result.success) {
        // فلترة المنتجات المقبولة فقط
        const approvedProducts = result.data.filter(p => p.status === 'approved');
        console.log(`✅ تم جلب ${approvedProducts.length} منتج`);
        setProducts(approvedProducts);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const renderProduct = ({ item }) => {
    const imageSource = item.imageUrl 
      ? item.imageUrl 
      : (item.images && item.images.length > 0 ? item.images[0] : null);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => {
          navigation.navigate('ProductDetailsScreen', {
            product: item,
            providerName: providerName,
            providerId: providerId,
            providerType: providerType
          });
        }}
      >
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
          {item.description && <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>}
        </View>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{providerName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* معلومات التاجر */}
      {providerInfo && (
        <View style={styles.providerCard}>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{providerInfo.name}</Text>
            {providerInfo.description && (
              <Text style={styles.providerDescription}>{providerInfo.description}</Text>
            )}
            {providerInfo.deliveryFee !== undefined && (
              <Text style={styles.deliveryInfo}>توصيل: {providerInfo.deliveryFee} ج</Text>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          products.length > 0 ? (
            <Text style={styles.sectionTitle}>منتجات {providerName}</Text>
          ) : null
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  providerCard: {
    backgroundColor: '#4F46E5',
    padding: 20,
    marginBottom: 8,
  },
  providerInfo: {
    alignItems: 'center',
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  deliveryInfo: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
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
  productImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginTop: 2 },
  productDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280' },
});
