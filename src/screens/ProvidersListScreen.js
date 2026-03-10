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
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

export default function ProvidersListScreen({ route, navigation }) {
  const { serviceId, serviceName } = route.params;
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      console.log(`🔍 جلب التجار للخدمة: ${serviceName}`);

      // جلب التجار حسب نوع الخدمة
      let queries = [
        Query.equal('role', 'merchant'),
        Query.equal('active', true)
      ];

      if (serviceId === 'milk') {
        queries.push(Query.equal('merchantType', 'milk'));
      } else if (serviceId === 'restaurant') {
        queries.push(Query.equal('merchantType', 'restaurant'));
      } else if (serviceId === 'home_chef') {
        queries.push(Query.equal('merchantType', 'home_chef'));
      }

      const res = await databases.listDocuments(
        DATABASE_ID,
        'users',
        queries
      );

      // فلترة التجار اللي عندهم منتجات
      const providersWithProducts = await Promise.all(
        res.documents.map(async (provider) => {
          let collectionName = '';
          if (serviceId === 'milk') {
            collectionName = 'service_milk_items';
          } else if (serviceId === 'restaurant') {
            collectionName = 'dishes';
          } else if (serviceId === 'home_chef') {
            collectionName = 'home_chef_dishes';
          }

          if (!collectionName) return { ...provider, hasProducts: false };

          try {
            const productsRes = await databases.listDocuments(
              DATABASE_ID,
              collectionName,
              [
                Query.equal('providerId', provider.$id),
                Query.equal('status', 'approved'),
                Query.limit(1)
              ]
            );
            return {
              ...provider,
              hasProducts: productsRes.total > 0,
              productsCount: productsRes.total
            };
          } catch (e) {
            return { ...provider, hasProducts: false, productsCount: 0 };
          }
        })
      );

      setProviders(providersWithProducts.filter(p => p.hasProducts));
    } catch (error) {
      console.error('❌ خطأ في جلب التجار:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProvider = ({ item }) => (
    <TouchableOpacity
      style={styles.providerCard}
      onPress={() => navigation.navigate('ProviderProductsScreen', {
        providerId: item.$id,
        providerName: item.name,
        providerType: serviceId
      })}
    >
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
        style={styles.providerImage}
      />
      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.providerDesc} numberOfLines={1}>{item.description}</Text>
        )}
        <Text style={styles.productsCount}>{item.productsCount} منتج</Text>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>{serviceName}</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={providers}
        renderItem={renderProvider}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد تجار متاحين</Text>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  providerImage: { width: 70, height: 70, borderRadius: 35, marginRight: 12 },
  providerInfo: { flex: 1, justifyContent: 'center' },
  providerName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
  providerDesc: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  productsCount: { fontSize: 11, color: '#4F46E5', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
