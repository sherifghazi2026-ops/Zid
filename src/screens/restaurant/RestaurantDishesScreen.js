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
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';

export default function RestaurantDishesScreen({ navigation, route }) {
  const { restaurantId, restaurantName, restaurantImage, restaurantCover } = route.params;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      // جلب الأطباق المقبولة لهذا المطعم
      const dishesResponse = await databases.listDocuments(
        DATABASE_ID,
        'dishes',
        [
          Query.equal('providerId', restaurantId),
          Query.equal('providerType', 'restaurant'),
          Query.equal('status', 'approved'),
          Query.equal('isAvailable', true),
          Query.orderAsc('category'),
          Query.orderAsc('name')
        ]
      );
      
      console.log(`✅ تم جلب ${dishesResponse.documents.length} طبق للمطعم`);
      
      // تجميع الأطباق حسب التصنيف
      const groupedDishes = {};
      dishesResponse.documents.forEach(dish => {
        const category = dish.category || 'أطباق رئيسية';
        if (!groupedDishes[category]) {
          groupedDishes[category] = [];
        }
        groupedDishes[category].push(dish);
      });

      // تحويل إلى صيغة SectionList
      const sectionsData = Object.keys(groupedDishes).map(category => ({
        title: category,
        data: groupedDishes[category],
      }));

      setSections(sectionsData);
    } catch (error) {
      console.error('❌ خطأ في جلب الأطباق:', error);
      Alert.alert('خطأ', 'فشل في تحميل الأطباق');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderDishItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.dishCard}
      onPress={() => navigation.navigate('DishDetailsScreen', { dishId: item.$id })}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.dishImage} />
      ) : (
        <View style={[styles.dishImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={30} color="#9CA3AF" />
        </View>
      )}
      
      <View style={styles.dishInfo}>
        <View style={styles.dishHeader}>
          <Text style={styles.dishName}>{item.name}</Text>
          {item.videoUrl && (
            <Ionicons name="videocam" size={16} color="#EF4444" />
          )}
        </View>
        
        {item.description ? (
          <Text style={styles.dishDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}
        
        <View style={styles.dishFooter}>
          <Text style={styles.dishPrice}>{item.price} ج</Text>
          {item.ingredients && item.ingredients.length > 0 && (
            <View style={styles.ingredientsBadge}>
              <Ionicons name="basket-outline" size={12} color="#6B7280" />
              <Text style={styles.ingredientsText}>{item.ingredients.length}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
        </View>
        <TouchableOpacity style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {restaurantCover && (
        <Image source={{ uri: restaurantCover }} style={styles.coverImage} />
      )}

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyText}>لا توجد أطباق متاحة حالياً</Text>
          <Text style={styles.emptySubText}>سيتم إضافة أطباق قريباً</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderDishItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadDishes} />
          }
          stickySectionHeadersEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  cartButton: { padding: 4 },
  
  coverImage: { width: '100%', height: 150, resizeMode: 'cover' },
  
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  
  sectionHeader: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dishImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  dishInfo: { flex: 1 },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dishName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  dishDescription: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  dishFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishPrice: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B' },
  ingredientsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  ingredientsText: { fontSize: 10, color: '#6B7280' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#1F2937', fontWeight: '600', marginTop: 12 },
  emptySubText: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
