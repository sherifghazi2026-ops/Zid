import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActiveOffers } from '../services/offersService';

// إلغاء تفعيل RTL للعربية - نريد النص من اليسار لليمين
// I18nManager.allowRTL(true);
// I18nManager.forceRTL(true);

export default function OffersScreen({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    const result = await getActiveOffers();
    if (result.success) {
      setOffers(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOffers();
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>العروض</Text>
        <TouchableOpacity onPress={loadOffers}>
          <Ionicons name="refresh-outline" size={24} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد عروض حالياً</Text>
            <Text style={styles.emptySubText}>تابعنا لتصلك أحدث العروض</Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.$id} style={styles.offerCard}>
              {offer.imageUrl && (
                <Image source={{ uri: offer.imageUrl }} style={styles.offerImage} />
              )}
              <View style={styles.offerContent}>
                <View style={styles.offerHeader}>
                  <Ionicons name="pricetag-outline" size={20} color="#F59E0B" style={styles.offerIcon} />
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                </View>
                <Text style={styles.offerDescription}>{offer.description}</Text>
                <View style={styles.offerFooter}>
                  <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.offerDate}>
                    {new Date(offer.createdAt).toLocaleDateString('ar-EG')}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600', textAlign: 'center' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  
  offerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 2,
  },
  offerImage: { width: '100%', height: 150, resizeMode: 'cover' },
  offerContent: { padding: 16 },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerIcon: { marginRight: 8 },
  offerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    flex: 1,
    textAlign: 'left', // تغيير من right إلى left
  },
  offerDescription: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 8, 
    lineHeight: 20,
    textAlign: 'left', // تغيير من right إلى left
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // تغيير من flex-end إلى flex-start
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 4,
  },
  offerDate: { fontSize: 12, color: '#9CA3AF', textAlign: 'left' }, // تغيير من right إلى left
});
