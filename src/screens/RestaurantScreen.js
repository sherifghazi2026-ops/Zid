import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AIAssistantModal from '../components/AIAssistantModal';
import { getCurrentLocation } from '../utils/permissions';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

const RESTAURANTS_COLLECTION_ID = 'restaurants';

export default function RestaurantScreen({ navigation }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dishesCount, setDishesCount] = useState({});

  useEffect(() => {
    (async () => {
      const location = await getCurrentLocation();
      setUserLocation(location);
      loadRestaurants();
    })();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        [Query.equal('isActive', true)]
      );
      setRestaurants(response.documents);
      
      // جلب عدد الأطباق لكل مطعم
      await loadDishesCountForRestaurants(response.documents);
    } catch (error) {
      console.error('خطأ في جلب المطاعم:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDishesCountForRestaurants = async (restaurantsList) => {
    const counts = {};
    for (const restaurant of restaurantsList) {
      try {
        const dishesResponse = await databases.listDocuments(
          DATABASE_ID,
          'dishes',
          [
            Query.equal('providerId', restaurant.$id),
            Query.equal('providerType', 'restaurant'),
            Query.equal('status', 'approved'),
            Query.equal('isAvailable', true),
            Query.limit(1)
          ]
        );
        counts[restaurant.$id] = dishesResponse.total || 0;
      } catch (error) {
        counts[restaurant.$id] = 0;
      }
    }
    setDishesCount(counts);
  };

  const navigateToRestaurantDishes = (restaurant) => {
    if (dishesCount[restaurant.$id] > 0) {
      navigation.navigate('RestaurantDishesScreen', {
        restaurantId: restaurant.$id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.imageUrl,
        restaurantCover: restaurant.backgroundImage
      });
    } else {
      // لو مفيش أطباق، نفتح PDF كبديل
      navigation.navigate('RestaurantPDFViewer', {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        pdfUrl: restaurant.menuPdfUrl
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المطاعم</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* قسم مُنجز */}
        <View style={styles.aiSection}>
          <Image
            source={{ uri: 'https://img.icons8.com/color/96/000000/assistant.png' }}
            style={styles.assistantIcon}
          />
          <Text style={styles.aiTitle}>مُنجز</Text>
          <Text style={styles.aiDescription}>هساعدك تطلب اللي تحبه</Text>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
            <Text style={styles.aiButtonText}>اسأل مُنجز</Text>
          </TouchableOpacity>
        </View>

        {/* قائمة المطاعم */}
        <View style={styles.restaurantsSection}>
          <Text style={styles.sectionTitle}>المطاعم المتاحة</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#F59E0B" style={styles.loader} />
          ) : restaurants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={60} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد مطاعم متاحة</Text>
            </View>
          ) : (
            restaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.$id}
                style={styles.restaurantCard}
                onPress={() => navigateToRestaurantDishes(restaurant)}
              >
                {restaurant.imageUrl ? (
                  <Image source={{ uri: restaurant.imageUrl }} style={styles.restaurantImage} />
                ) : (
                  <View style={[styles.restaurantImage, styles.placeholderImage]}>
                    <Ionicons name="restaurant-outline" size={30} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.restaurantCuisine}>{restaurant.cuisine?.join(' • ')}</Text>
                  <View style={styles.restaurantMeta}>
                    <Ionicons name="time-outline" size={12} color="#F59E0B" />
                    <Text style={styles.metaText}>{restaurant.deliveryTime || 30} دقيقة</Text>
                    <Ionicons name="cash-outline" size={12} color="#F59E0B" style={{ marginLeft: 8 }} />
                    <Text style={styles.metaText}>{restaurant.deliveryFee || 0} ج</Text>
                  </View>
                  {dishesCount[restaurant.$id] > 0 && (
                    <View style={styles.dishesBadge}>
                      <Ionicons name="restaurant-outline" size={10} color="#FFF" />
                      <Text style={styles.dishesBadgeText}>{dishesCount[restaurant.$id]} أطباق</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <AIAssistantModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  content: { padding: 16 },

  // قسم مُنجز
  aiSection: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  assistantIcon: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  aiTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  aiDescription: { fontSize: 14, color: '#FFF', opacity: 0.9, marginBottom: 16 },
  aiButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
  },
  aiButtonText: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },

  // قائمة المطاعم
  restaurantsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  loader: { marginTop: 20 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  restaurantImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  restaurantInfo: { flex: 1 },
  restaurantName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  restaurantCuisine: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#6B7280' },
  dishesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 2,
  },
  dishesBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '600' },
});
