import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { databases, DATABASE_ID } from '../../appwrite/config';

const { width } = Dimensions.get('window');

export default function DishDetailsScreen({ navigation, route }) {
  const { dishId } = route.params;
  const [dish, setDish] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadDishDetails();
  }, []);

  const loadDishDetails = async () => {
    try {
      // جلب الطبق
      const dishDoc = await databases.getDocument(
        DATABASE_ID,
        'dishes',
        dishId
      );
      setDish(dishDoc);

      // جلب معلومات المقدم (مطعم أو طاهي)
      if (dishDoc.providerType === 'restaurant') {
        const providerDoc = await databases.getDocument(
          DATABASE_ID,
          'restaurants',
          dishDoc.providerId
        );
        setProvider(providerDoc);
      } else {
        const providerDoc = await databases.getDocument(
          DATABASE_ID,
          'users',
          dishDoc.providerId
        );
        setProvider(providerDoc);
      }
    } catch (error) {
      console.error('خطأ في جلب تفاصيل الطبق:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>الطبق غير موجود</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل الطبق</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* صور الطبق */}
        {dish.images && dish.images.length > 0 && (
          <View style={styles.imagesContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
            >
              {dish.images.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.fullImage} />
              ))}
            </ScrollView>
            {dish.images.length > 1 && (
              <View style={styles.imageIndicators}>
                {dish.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageIndicator,
                      index === currentImageIndex && styles.imageIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* معلومات الطبق */}
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishPrice}>{dish.price} ج</Text>
          
          {dish.description ? (
            <Text style={styles.dishDescription}>{dish.description}</Text>
          ) : null}

          {/* معلومات المقدم */}
          <TouchableOpacity 
            style={styles.providerCard}
            onPress={() => {
              if (dish.providerType === 'restaurant') {
                navigation.navigate('RestaurantDetails', { restaurantId: dish.providerId });
              } else {
                navigation.navigate('ChefProfile', { chefId: dish.providerId });
              }
            }}
          >
            <Ionicons 
              name={dish.providerType === 'restaurant' ? 'restaurant-outline' : 'person-outline'} 
              size={24} 
              color="#4F46E5" 
            />
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>
                {dish.providerType === 'restaurant' 
                  ? provider?.name 
                  : provider?.name || 'طاهٍ منزلي'}
              </Text>
              <Text style={styles.providerType}>
                {dish.providerType === 'restaurant' ? 'مطعم' : 'طاهٍ منزلي'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* المكونات */}
          {dish.ingredients && dish.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>المكونات</Text>
              <View style={styles.ingredientsGrid}>
                {dish.ingredients.map((ing, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* فيديو */}
          {dish.videoUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>فيديو التحضير</Text>
              <Video
                source={{ uri: dish.videoUrl }}
                style={styles.video}
                useNativeControls
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* زر الطلب */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.orderButton}
          onPress={() => navigation.navigate('OrderScreen', { dish })}
        >
          <Text style={styles.orderButtonText}>طلب هذا الطبق</Text>
          <Ionicons name="cart-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#EF4444' },
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
  content: { paddingBottom: 80 },
  
  imagesContainer: { height: 300, backgroundColor: '#000' },
  fullImage: { width, height: 300, resizeMode: 'cover' },
  imageIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageIndicatorActive: { backgroundColor: '#F59E0B', width: 16 },
  
  dishInfo: { padding: 16 },
  dishName: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  dishPrice: { fontSize: 22, fontWeight: 'bold', color: '#F59E0B', marginBottom: 12 },
  dishDescription: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 16 },
  
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  providerType: { fontSize: 12, color: '#6B7280' },
  
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  ingredientsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ingredientText: { fontSize: 12, color: '#1F2937' },
  
  video: { width: '100%', height: 200, borderRadius: 8 },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  orderButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
