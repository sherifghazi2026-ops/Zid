import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { getAllServices } from '../../services/servicesService';
import { getMerchantsByType } from '../../services/merchantService';
import { getAllProducts, deleteProduct } from '../../services/productService';

export default function ManageAllProductsScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [merchantsMap, setMerchantsMap] = useState({});
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedServices, setExpandedServices] = useState({});
  const [expandedMerchants, setExpandedMerchants] = useState({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const servicesResult = await getAllServices();
      if (!servicesResult.success) throw new Error('فشل جلب الخدمات');

      const productServices = servicesResult.data.filter(s =>
        s.id !== 'laundry' && s.id !== 'restaurant' && s.id !== 'home_chef'
      );
      setServices(productServices);

      const productsResult = await getAllProducts();
      const allProducts = productsResult.success ? productsResult.data : [];

      const merchantsTemp = {};
      const productsTemp = {};

      for (const service of productServices) {
        const serviceId = service.id;
        const merchantsResult = await getMerchantsByType(serviceId);
        if (merchantsResult.success) {
          merchantsTemp[serviceId] = merchantsResult.data;
          const serviceProducts = {};
          for (const merchant of merchantsResult.data) {
            serviceProducts[merchant.$id || merchant.id] = allProducts.filter(p =>
              p.merchant_id === (merchant.$id || merchant.id) && p.service_id === serviceId
            );
          }
          productsTemp[serviceId] = serviceProducts;
        } else {
          merchantsTemp[serviceId] = [];
          productsTemp[serviceId] = {};
        }
      }

      setMerchantsMap(merchantsTemp);
      setProductsMap(productsTemp);

      if (productServices.length > 0) {
        setExpandedServices({ [productServices[0].id]: true });
      }

    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
      Alert.alert('خطأ', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleService = (serviceId) => {
    setExpandedServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const toggleMerchant = (serviceId, merchantId) => {
    const key = `${serviceId}_${merchantId}`;
    setExpandedMerchants(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert(
      'حذف المنتج',
      'هل أنت متأكد من حذف هذا المنتج؟',
      [
        { text: 'إلغاء' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteProduct(productId);
              if (result.success) {
                Alert.alert('✅ تم', 'تم حذف المنتج');
                loadAllData();
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              Alert.alert('خطأ', error.message);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'approved': return 'مقبول';
      case 'pending': return 'قيد المراجعة';
      case 'rejected': return 'مرفوض';
      default: return status || 'غير محدد';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل المنتجات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة جميع المنتجات</Text>
        <TouchableOpacity onPress={loadAllData}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد خدمات بمنتجات</Text>
          </View>
        ) : (
          services.map((service) => {
            const serviceId = service.id;
            const merchants = merchantsMap[serviceId] || [];
            const serviceProducts = productsMap[serviceId] || {};
            const isServiceExpanded = expandedServices[serviceId];

            return (
              <View key={serviceId} style={styles.serviceCard}>
                <TouchableOpacity style={styles.serviceHeader} onPress={() => toggleService(serviceId)}>
                  <View style={[styles.serviceIcon, { backgroundColor: service.color + '20' }]}>
                    <Ionicons name={service.icon || 'apps-outline'} size={24} color={service.color} />
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceCount}>({merchants.length} تاجر)</Text>
                  <Ionicons name={isServiceExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
                </TouchableOpacity>

                {isServiceExpanded && (
                  <View style={styles.merchantsContainer}>
                    {merchants.length === 0 ? (
                      <Text style={styles.noMerchantsText}>لا يوجد تجار لهذه الخدمة</Text>
                    ) : (
                      merchants.map((merchant) => {
                        const merchantId = merchant.$id || merchant.id;
                        const products = serviceProducts[merchantId] || [];
                        const isMerchantExpanded = expandedMerchants[`${serviceId}_${merchantId}`];

                        return (
                          <View key={merchantId} style={styles.merchantCard}>
                            <TouchableOpacity style={styles.merchantHeader} onPress={() => toggleMerchant(serviceId, merchantId)}>
                              <Image source={{ uri: merchant.image_url || 'https://via.placeholder.com/40' }} style={styles.merchantAvatar} />
                              <Text style={styles.merchantName}>{merchant.name || merchant.full_name}</Text>
                              <Text style={styles.productCount}>({products.length})</Text>
                              <Ionicons name={isMerchantExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
                            </TouchableOpacity>

                            {isMerchantExpanded && (
                              <View style={styles.productsContainer}>
                                {products.length === 0 ? (
                                  <Text style={styles.noProductsText}>لا توجد منتجات</Text>
                                ) : (
                                  products.map((product) => (
                                    <View key={product.$id || product.id} style={styles.productItem}>
                                      {product.image_url ? (
                                        <Image source={{ uri: product.image_url }} style={styles.productImage} />
                                      ) : (
                                        <View style={[styles.productImage, styles.placeholderImage]}>
                                          <Ionicons name="image-outline" size={16} color="#9CA3AF" />
                                        </View>
                                      )}
                                      <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{product.name}</Text>
                                        <Text style={styles.productPrice}>{product.price} ج</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) + '20' }]}>
                                          <Text style={[styles.statusText, { color: getStatusColor(product.status) }]}>
                                            {getStatusText(product.status)}
                                          </Text>
                                        </View>
                                      </View>
                                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteProduct(product.$id || product.id)}>
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                      </TouchableOpacity>
                                    </View>
                                  ))
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
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
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  serviceCount: { fontSize: 14, color: '#6B7280', marginRight: 8 },
  merchantsContainer: { padding: 12 },
  merchantCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  merchantAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  merchantName: { fontSize: 14, fontWeight: '500', color: '#1F2937', flex: 1 },
  productCount: { fontSize: 12, color: '#6B7280', marginRight: 8 },
  productsContainer: { padding: 8, paddingTop: 0 },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productImage: { width: 30, height: 30, borderRadius: 4, marginRight: 8 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '500', color: '#1F2937' },
  productPrice: { fontSize: 11, color: '#F59E0B', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  statusText: { fontSize: 9, fontWeight: '600' },
  deleteButton: { padding: 4 },
  noMerchantsText: { textAlign: 'center', color: '#9CA3AF', padding: 12 },
  noProductsText: { textAlign: 'center', color: '#9CA3AF', padding: 8 },
});
