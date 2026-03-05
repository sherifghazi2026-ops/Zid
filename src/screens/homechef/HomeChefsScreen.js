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

export default function HomeChefsScreen({ navigation }) {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChefs();
  }, []);

  const loadChefs = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        'home_chefs',
        [
          Query.equal('isActive', true),
          Query.equal('isVerified', true),
          Query.orderAsc('name')
        ]
      );
      
      // جلب عدد الأطباق لكل شيف
      const chefsWithStats = await Promise.all(
        response.documents.map(async (chef) => {
          try {
            const dishesRes = await databases.listDocuments(
              DATABASE_ID,
              'dishes',
              [
                Query.equal('providerId', chef.$id),
                Query.equal('providerType', 'home_chef'),
                Query.equal('status', 'approved'),
                Query.equal('isAvailable', true),
                Query.limit(1)
              ]
            );
            return { ...chef, dishesCount: dishesRes.total || 0 };
          } catch (e) {
            return { ...chef, dishesCount: 0 };
          }
        })
      );
      
      setChefs(chefsWithStats.filter(chef => chef.dishesCount > 0));
    } catch (error) {
      console.error('خطأ في جلب الشيفات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChefs();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>شيفات منزلي</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chefs}
        keyExtractor={item => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chefCard}
            onPress={() => navigation.navigate('HomeChefDishesScreen', {
              chefId: item.$id,
              chefName: item.name,
              chefImage: item.imageUrl
            })}
          >
            <Image 
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }} 
              style={styles.chefImage} 
            />
            <View style={styles.chefInfo}>
              <Text style={styles.chefName}>{item.name}</Text>
              {item.specialties && item.specialties.length > 0 && (
                <Text style={styles.chefSpecialty} numberOfLines={1}>
                  {item.specialties.join(' • ')}
                </Text>
              )}
              <View style={styles.chefMeta}>
                <Ionicons name="restaurant-outline" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{item.dishesCount} أطباق</Text>
                <Ionicons name="bicycle" size={14} color="#6B7280" style={{ marginLeft: 8 }} />
                <Text style={styles.metaText}>{item.deliveryFee || 0} ج</Text>
              </View>
              {item.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={styles.verifiedText}>موثق</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد شيفات متاحين حالياً</Text>
          </View>
        }
        contentContainerStyle={styles.list}
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  list: { padding: 16 },
  chefCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  chefImage: { width: 70, height: 70, borderRadius: 35, marginRight: 12 },
  chefInfo: { flex: 1, justifyContent: 'center' },
  chefName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
  chefSpecialty: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  chefMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { fontSize: 11, color: '#6B7280', marginLeft: 2 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 2,
  },
  verifiedText: { fontSize: 10, color: '#10B981', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },
});
