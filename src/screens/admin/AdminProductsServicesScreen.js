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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllServices } from '../../services/servicesService';

export default function AdminProductsServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const result = await getAllServices();
      if (result.success) {
        // تصفية الخدمات التي لها منتجات
        const productServices = result.data.filter(s => 
          s.hasItems === true || 
          s.type === 'items' || 
          s.type === 'ai' ||
          s.id === 'restaurant' ||
          s.id === 'home_chef'
        );
        setServices(productServices);
      }
    } catch (error) {
      console.error('خطأ في جلب الخدمات:', error);
      Alert.alert('خطأ', 'فشل تحميل الخدمات');
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (service) => {
    const icons = {
      restaurant: 'restaurant',
      home_chef: 'home',
      laundry: 'shirt',
      dairy: 'water',
      milk: 'water',
      bakery: 'restaurant',
      drinks: 'cafe',
      default: 'apps',
    };
    return icons[service.id] || service.icon || icons.default;
  };

  const getServiceColor = (service) => {
    const colors = {
      restaurant: '#EF4444',
      home_chef: '#F59E0B',
      laundry: '#3B82F6',
      dairy: '#3B82F6',
      milk: '#3B82F6',
      bakery: '#F59E0B',
      drinks: '#10B981',
      default: '#6B7280',
    };
    return service.color || colors[service.id] || colors.default;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل الخدمات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المنتجات</Text>
        <TouchableOpacity onPress={loadServices}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={60} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد خدمات تحتوي على منتجات</Text>
          </View>
        ) : (
          <View style={styles.servicesGrid}>
            {services.map((service) => {
              const color = getServiceColor(service);
              return (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => navigation.navigate('AdminMerchantsListScreen', {
                    serviceId: service.id,
                    serviceName: service.name,
                    serviceColor: color
                  })}
                >
                  <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <Ionicons name={getServiceIcon(service)} size={36} color={color} />
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 10 },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
});
