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
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';

export default function AdminMerchantsListScreen({ navigation, route }) {
  const { serviceId, serviceName, serviceColor = '#4F46E5' } = route.params || {};

  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!serviceId) {
      Alert.alert('خطأ', 'معرف الخدمة غير موجود');
      navigation.goBack();
      return;
    }
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('role', 'merchant')
        .eq('merchant_type', serviceId)
        .eq('active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        $id: item.id,
        id: item.id,
        name: item.full_name,
        full_name: item.full_name,
        phone: item.phone,
        image_url: item.image_url || item.avatar_url,
        merchant_type: item.merchant_type,
        place_name: item.place_name,
      }));

      setMerchants(formattedData);
    } catch (error) {
      console.error('خطأ في جلب التجار:', error);
      Alert.alert('خطأ', 'فشل تحميل التجار');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderMerchant = ({ item }) => (
    <TouchableOpacity
      style={styles.merchantCard}
      onPress={() => navigation.navigate('AdminMerchantProductsScreen', {
        merchantId: item.id,
        merchantName: item.name,
        serviceId: serviceId
      })}
    >
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/60' }}
        style={styles.merchantImage}
      />
      <View style={styles.merchantInfo}>
        <Text style={styles.merchantName}>{item.name}</Text>
        <Text style={styles.merchantPhone}>{item.phone}</Text>
        {item.place_name && (
          <Text style={styles.merchantPlace}>{item.place_name}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={serviceColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: serviceColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تجار {serviceName || 'الخدمة'}</Text>
        <TouchableOpacity onPress={loadMerchants}>
          <Ionicons name="refresh" size={24} color={serviceColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={merchants}
        renderItem={renderMerchant}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMerchants} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد تجار في هذه الخدمة</Text>
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
    borderBottomWidth: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
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
  merchantImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  merchantInfo: { flex: 1 },
  merchantName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  merchantPhone: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  merchantPlace: { fontSize: 12, color: '#10B981', marginTop: 2 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
