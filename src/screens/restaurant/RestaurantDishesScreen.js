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
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';

export default function RestaurantDishesScreen({ route, navigation }) {
  const { restaurantId, restaurantName } = route.params;
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        'dishes',
        [
          Query.equal('providerId', restaurantId),
          Query.equal('providerType', 'restaurant'),
          Query.equal('status', 'approved'),
          Query.equal('isAvailable', true),
          Query.limit(50)
        ]
      );

      const dishesWithProvider = res.documents.map(d => ({
        ...d,
        providerName: restaurantName,
        providerId: restaurantId,
        providerType: 'restaurant',
      }));

      setDishes(dishesWithProvider);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderDish = ({ item }) => (
    <TouchableOpacity
      style={styles.dishCard}
      onPress={() => navigation.navigate('DishDetails', { dish: item })}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.dishImage} />
      ) : (
        <View style={[styles.dishImage, styles.placeholder]} />
      )}
      <View style={styles.dishInfo}>
        <Text style={styles.dishName}>{item.name}</Text>
        <Text style={styles.dishPrice}>{item.price} ج</Text>
        {item.description && <Text style={styles.dishDesc} numberOfLines={2}>{item.description}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dishes}
        renderItem={renderDish}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDishes} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أطباق متاحة</Text>
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
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dishImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholder: { backgroundColor: '#F3F4F6' },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  dishPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginTop: 2 },
  dishDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280' }
});
