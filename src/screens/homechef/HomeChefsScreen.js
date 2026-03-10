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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';

export default function HomeChefsScreen({ navigation }) {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChefs();
  }, []);

  const loadChefs = async () => {
    try {
      // جلب الشيفات النشطين فقط
      const res = await databases.listDocuments(
        DATABASE_ID,
        'users',
        [
          Query.equal('role', 'merchant'),
          Query.equal('merchantType', 'home_chef'),
          Query.equal('active', true),
          Query.limit(50)
        ]
      );

      // فلترة الشيفات اللي عندهم أطباق
      const chefsWithDishes = await Promise.all(
        res.documents.map(async (chef) => {
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
          return {
            ...chef,
            hasDishes: dishesRes.total > 0,
            dishesCount: dishesRes.total
          };
        })
      );

      // عرض الشيفات اللي عندهم أطباق فقط
      setChefs(chefsWithDishes.filter(chef => chef.hasDishes));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#EF4444" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>شيفات منزلي</Text>
        <View style={{ width: 28 }} />
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
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
              style={styles.chefImage}
            />
            <View style={styles.chefInfo}>
              <Text style={styles.chefName}>{item.name}</Text>
              {item.specialties && item.specialties.length > 0 && (
                <Text style={styles.chefSpecialty} numberOfLines={1}>
                  {item.specialties.join(' • ')}
                </Text>
              )}
              <Text style={styles.chefDishes}>عدد الأطباق: {item.dishesCount}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد شيفات متاحين</Text>
          </View>
        }
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#EF4444' },
  list: { padding: 16 },
  chefCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chefImage: { width: 70, height: 70, borderRadius: 35, marginRight: 12 },
  chefInfo: { flex: 1, justifyContent: 'center' },
  chefName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  chefSpecialty: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chefDishes: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
