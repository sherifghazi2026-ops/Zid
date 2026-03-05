import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';

const RESTAURANTS_COLLECTION_ID = 'restaurants';

export default function RestaurantListScreen({ navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        RESTAURANTS_COLLECTION_ID,
        [Query.equal('isActive', true), Query.orderAsc('name')]
      );
      setRestaurants(response.documents);
    } catch (error) {
      console.error('خطأ في جلب المطاعم:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRestaurant = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantPDFViewer', {
        restaurantId: item.id,
        restaurantName: item.name,
        pdfUrl: item.menuPdfUrl,
        backgroundImage: item.backgroundImage
      })}
      activeOpacity={0.9}
    >
      {item.backgroundImage ? (
        <ImageBackground 
          source={{ uri: item.backgroundImage }} 
          style={styles.restaurantBackground}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.restaurantLogo} />
            ) : (
              <View style={[styles.restaurantLogo, styles.placeholderLogo]}>
                <Ionicons name="restaurant-outline" size={30} color="#FFF" />
              </View>
            )}
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <Text style={styles.restaurantCuisine}>{item.cuisine?.join(' • ')}</Text>
              <View style={styles.restaurantMeta}>
                <Ionicons name="time-outline" size={14} color="#FFD700" />
                <Text style={styles.metaText}>{item.deliveryTime || 30} دقيقة</Text>
                <Ionicons name="cash-outline" size={14} color="#FFD700" style={{ marginLeft: 12 }} />
                <Text style={styles.metaText}>{item.deliveryFee || 0} ج</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.restaurantBackground, { backgroundColor: '#4F46E5' }]}>
          <View style={styles.overlay}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.restaurantLogo} />
            ) : (
              <View style={[styles.restaurantLogo, styles.placeholderLogo]}>
                <Ionicons name="restaurant-outline" size={30} color="#FFF" />
              </View>
            )}
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <Text style={styles.restaurantCuisine}>{item.cuisine?.join(' • ')}</Text>
              <View style={styles.restaurantMeta}>
                <Ionicons name="time-outline" size={14} color="#FFD700" />
                <Text style={styles.metaText}>{item.deliveryTime || 30} دقيقة</Text>
                <Ionicons name="cash-outline" size={14} color="#FFD700" style={{ marginLeft: 12 }} />
                <Text style={styles.metaText}>{item.deliveryFee || 0} ج</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </View>
        </View>
      )}
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>المطاعم</Text>
        <View style={{ width: 40 }} />
      </View>

      {restaurants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyText}>لا توجد مطاعم متاحة</Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  list: { padding: 16 },
  restaurantCard: {
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  restaurantLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFF',
    marginRight: 16,
  },
  placeholderLogo: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: { flex: 1 },
  restaurantName: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  restaurantCuisine: { fontSize: 14, color: '#FFF', opacity: 0.9, marginBottom: 6 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#FFF', opacity: 0.9 },
});
