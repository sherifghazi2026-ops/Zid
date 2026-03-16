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
import { getMerchantsByType } from '../services/merchantService';
import DynamicMongez from '../components/DynamicMongez';

export default function MerchantsListScreen({ navigation, route }) {
  const { serviceType, serviceName, collectionName } = route.params;

  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    const result = await getMerchantsByType(serviceType);
    if (result.success) {
      setMerchants(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const renderMerchant = ({ item }) => (
    <TouchableOpacity
      style={styles.merchantCard}
      onPress={() => navigation.navigate('MerchantProductsScreen', {
        merchantId: item.$id,
        merchantName: item.name,
        merchantImage: item.imageUrl,
        serviceType: serviceType,
        serviceName: serviceName
      })}
    >
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
        style={styles.merchantImage}
      />
      <View style={styles.merchantInfo}>
        <Text style={styles.merchantName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.merchantDesc} numberOfLines={2}>{item.description}</Text>
        )}
        {item.deliveryFee !== undefined && (
          <Text style={styles.deliveryInfo}>توصيل: {item.deliveryFee} ج</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={merchants}
        renderItem={renderMerchant}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMerchants} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد تجار متاحين</Text>
          </View>
        }
      />

      {/* ✅ إضافة DynamicMongez مع تمرير serviceId */}
      <DynamicMongez
        screen="service"
        navigation={navigation}
        contextData={{
          serviceId: serviceType,
          serviceName: serviceName
        }}
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, textAlign: 'center' },
  list: { padding: 16 },
  merchantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  merchantImage: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  merchantInfo: { flex: 1 },
  merchantName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  merchantDesc: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  deliveryInfo: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
