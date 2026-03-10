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
import { getApprovedItems } from '../services/itemService';

export default function ServiceItemsScreen({ route, navigation }) {
  // استخراج البيانات
  const serviceId = route.params?.serviceId;
  const serviceName = route.params?.serviceName || 'المنتجات';
  const serviceColor = route.params?.serviceColor || '#4F46E5';
  const collectionName = route.params?.collectionName;
  const providerId = route.params?.providerId;
  const providerName = route.params?.providerName || serviceName;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!collectionName) {
      Alert.alert(
        'خطأ',
        'لم يتم تحديد مجموعة المنتجات',
        [{ text: 'رجوع', onPress: () => navigation.goBack() }]
      );
      return;
    }
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      console.log('🔍 جلب المنتجات للخدمة:', serviceName);
      console.log('📦 collection:', collectionName);
      
      const result = await getApprovedItems(collectionName);
      if (result.success) {
        console.log(`✅ تم جلب ${result.data.length} منتج`);
        setItems(result.data);
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
    loadItems();
  };

  // ✅ الآن navigation.navigate('Cart') سيعمل لأن الشاشتين في نفس الـ Stack
  const goToCart = () => {
    navigation.navigate('Cart');
  };

  const renderItem = ({ item }) => {
    const imageSource = item.imageUrl 
      ? item.imageUrl 
      : (item.images && item.images.length > 0 ? item.images[0] : null);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => {
          navigation.navigate('ProductDetailsScreen', {
            product: item,
            providerName: providerName,
            providerId: providerId || item.providerId,
            providerType: serviceId
          });
        }}
      >
        {imageSource ? (
          <Image source={{ uri: imageSource }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholder]}>
            <Ionicons name="image-outline" size={30} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{item.price} ج</Text>
          {item.description && <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>}
          <Text style={styles.providerName}>{providerName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={serviceColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{serviceName}</Text>
        <TouchableOpacity onPress={goToCart}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  list: { padding: 16 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginTop: 2 },
  itemDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  providerName: {
    fontSize: 11,
    color: '#4F46E5',
    marginTop: 4,
    fontWeight: '500',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280' },
});
