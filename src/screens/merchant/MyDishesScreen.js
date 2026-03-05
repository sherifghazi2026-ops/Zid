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
import { getMyRestaurantDishes, deleteDish } from '../../services/dishService';

export default function MyDishesScreen({ navigation, route }) {
  const { providerId, providerType, providerName } = route.params;
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    const result = await getMyRestaurantDishes(providerId);
    if (result.success) {
      setDishes(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleDelete = (dish) => {
    Alert.alert(
      'حذف الطبق',
      `هل أنت متأكد من حذف "${dish.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDish(dish.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الطبق');
              loadDishes();
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
      case 'pending':
        return { text: 'قيد المراجعة', color: '#F59E0B', bg: '#FEF3C7' };
      case 'approved':
        return { text: 'مقبول', color: '#10B981', bg: '#D1FAE5' };
      case 'rejected':
        return { text: 'مرفوض', color: '#EF4444', bg: '#FEE2E2' };
      default:
        return { text: 'مسودة', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const renderDish = ({ item }) => {
    const badge = getStatusBadge(item.status);
    return (
      <View style={styles.dishCard}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.dishImage} />
        ) : (
          <View style={[styles.dishImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={30} color="#9CA3AF" />
          </View>
        )}
        
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{item.name}</Text>
          <Text style={styles.dishPrice}>{item.price} ج</Text>
          
          <View style={styles.dishFooter}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.iconButton, styles.editButton]}
                onPress={() => navigation.navigate('EditDishScreen', { 
                  dishId: item.$id,
                  providerId,
                  providerType,
                  providerName
                })}
              >
                <Ionicons name="create-outline" size={18} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.iconButton, styles.deleteButton]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          أطباق {providerName}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddDishScreen', {
          providerId,
          providerType,
          providerName
        })}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
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
            <Text style={styles.emptyText}>لا توجد أطباق مضافة</Text>
            <Text style={styles.emptySubText}>اضغط + لإضافة طبق جديد</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  dishImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  dishPrice: { fontSize: 14, color: '#F59E0B', fontWeight: '600', marginBottom: 6 },
  dishFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  iconButton: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  editButton: { backgroundColor: '#F59E0B' },
  deleteButton: { backgroundColor: '#EF4444' },
});
