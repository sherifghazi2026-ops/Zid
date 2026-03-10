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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getItemsByProvider, deleteItem, updateItem } from '../../services/itemService';
import { getAllServices } from '../../services/servicesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const user = JSON.parse(data);
      setUserData(user);
      loadServices(user);
    }
  };

  const loadServices = async (user) => {
    const servicesResult = await getAllServices();
    if (servicesResult.success) {
      // فلترة الخدمات اللي ليها منتجات ونوع التاجر مناسب
      const relevantServices = servicesResult.data.filter(s => 
        s.hasItems && (s.merchantType === user.merchantType || s.merchantType === 'merchant')
      );
      setServices(relevantServices);
      
      // جلب منتجات التاجر من كل خدمة
      await loadAllProducts(relevantServices, user.$id);
    }
  };

  const loadAllProducts = async (servicesList, providerId) => {
    let allProducts = [];
    
    for (const service of servicesList) {
      if (service.itemsCollection) {
        const result = await getItemsByProvider(service.itemsCollection, providerId);
        if (result.success) {
          const productsWithService = result.data.map(p => ({
            ...p,
            serviceName: service.name,
            serviceColor: service.color,
            collectionName: service.itemsCollection
          }));
          allProducts = [...allProducts, ...productsWithService];
        }
      }
    }
    
    setProducts(allProducts);
    setLoading(false);
  };

  const handleDelete = (product) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف "${product.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteItem(product.collectionName, product.$id);
            if (result.success) {
              setProducts(products.filter(p => p.$id !== product.$id));
              Alert.alert('✅ تم', 'تم حذف المنتج بنجاح');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const toggleAvailability = async (product) => {
    const result = await updateItem(product.collectionName, product.$id, {
      isAvailable: !product.isAvailable
    });
    if (result.success) {
      setProducts(products.map(p => 
        p.$id === product.$id ? { ...p, isAvailable: !p.isAvailable } : p
      ));
    }
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
      default: return status;
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholder]}>
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price} ج</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
            <View style={[styles.serviceBadge, { backgroundColor: item.serviceColor + '20' }]}>
              <Text style={[styles.serviceText, { color: item.serviceColor }]}>
                {item.serviceName}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {item.status === 'approved' && (
        <View style={styles.productActions}>
          <TouchableOpacity 
            style={[styles.actionButton, item.isAvailable ? styles.availableButton : styles.unavailableButton]}
            onPress={() => toggleAvailability(item)}
          >
            <Ionicons 
              name={item.isAvailable ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color="#FFF" 
            />
            <Text style={styles.actionText}>
              {item.isAvailable ? 'متاح' : 'غير متاح'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#FFF" />
            <Text style={styles.actionText}>حذف</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>منتجاتي</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MerchantDashboard')}>
          <Ionicons name="home" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            services.length > 0 ? (
              <View style={styles.servicesHeader}>
                <Text style={styles.servicesTitle}>الخدمات المتاحة للإضافة:</Text>
                <View style={styles.servicesList}>
                  {services.map(service => (
                    <TouchableOpacity
                      key={service.$id}
                      style={[styles.serviceChip, { backgroundColor: service.color + '20' }]}
                      onPress={() => navigation.navigate('AddProductScreen', {
                        service,
                        providerId: userData?.$id,
                        providerName: userData?.name,
                        providerType: userData?.merchantType
                      })}
                    >
                      <Text style={[styles.serviceChipText, { color: service.color }]}>
                        + {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد منتجات</Text>
              {services.length > 0 && (
                <Text style={styles.emptySubText}>
                  اضغط على إحدى الخدمات أعلاه لإضافة منتج جديد
                </Text>
              )}
            </View>
          }
        />
      )}
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
  servicesHeader: {
    marginBottom: 20,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 10,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  serviceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  serviceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  availableButton: {
    backgroundColor: '#10B981',
  },
  unavailableButton: {
    backgroundColor: '#6B7280',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
