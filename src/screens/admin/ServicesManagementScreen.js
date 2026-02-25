import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllServices, toggleServiceStatus, updateService } from '../../services/servicesService';

export default function ServicesManagementScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const result = await getAllServices();
    if (result.success) {
      setServices(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleToggleService = async (service) => {
    setUpdating(service.$id);
    const newStatus = !service.isActive;
    
    const result = await toggleServiceStatus(service.$id, newStatus);
    
    if (result.success) {
      setServices(services.map(s => 
        s.$id === service.$id ? { ...s, isActive: newStatus } : s
      ));
      Alert.alert('تم', `تم ${newStatus ? 'تفعيل' : 'تعطيل'} خدمة ${service.name}`);
    } else {
      Alert.alert('خطأ', result.error);
    }
    setUpdating(null);
  };

  const handleToggleVisibility = async (service) => {
    setUpdating(service.$id);
    const newVisibility = !service.isVisible;
    
    const result = await updateService(service.$id, { isVisible: newVisibility });
    
    if (result.success) {
      setServices(services.map(s => 
        s.$id === service.$id ? { ...s, isVisible: newVisibility } : s
      ));
      Alert.alert('تم', `تم ${newVisibility ? 'إظهار' : 'إخفاء'} خدمة ${service.name}`);
    } else {
      Alert.alert('خطأ', result.error);
    }
    setUpdating(null);
  };

  const openOptionsModal = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const getServiceIcon = (iconName) => {
    const icons = {
      'basket-outline': 'basket-outline',
      'restaurant-outline': 'restaurant-outline',
      'medical-outline': 'medical-outline',
      'shirt-outline': 'shirt-outline',
      'water-outline': 'water-outline',
      'hammer-outline': 'hammer-outline',
      'apps-outline': 'apps-outline',
      'car-outline': 'car-outline',
      'flash-outline': 'flash-outline',
      'cube-outline': 'cube-outline',
    };
    return icons[iconName] || 'construct-outline';
  };

  const getServiceColor = (serviceId) => {
    const colors = {
      supermarket: '#F59E0B',
      restaurant: '#EF4444',
      pharmacy: '#10B981',
      ironing: '#3B82F6',
      plumbing: '#3B82F6',
      kitchen: '#8B5CF6',
      carpentry: '#8B5CF6',
      marble: '#EC4899',
      winch: '#EC4899',
      electrician: '#F59E0B',
      moving: '#F59E0B'
    };
    return colors[serviceId] || '#6B7280';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الخدمات</Text>
        <TouchableOpacity onPress={loadServices}>
          <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#4F46E5" />
          <Text style={styles.infoText}>
            • التفعيل: الخدمة تعمل بشكل طبيعي
            {'\n'}• التعطيل: الخدمة تظهر معتمة وعليها "جاري التحديث"
            {'\n'}• الإخفاء: الخدمة لا تظهر نهائياً للعملاء
          </Text>
        </View>

        {services.map((service) => (
          <View key={service.$id} style={styles.serviceCard}>
            <View style={styles.serviceInfo}>
              <View style={[styles.iconContainer, { backgroundColor: getServiceColor(service.id) + '20' }]}>
                <Ionicons name={getServiceIcon(service.icon)} size={24} color={getServiceColor(service.id)} />
              </View>
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceId}>{service.id}</Text>
                <View style={styles.badgesContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: service.isActive ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.statusText, { color: service.isActive ? '#10B981' : '#EF4444' }]}>
                      {service.isActive ? 'نشط' : 'معطل'}
                    </Text>
                  </View>
                  {service.isVisible === false && (
                    <View style={[styles.statusBadge, { backgroundColor: '#6B728020' }]}>
                      <Text style={[styles.statusText, { color: '#6B7280' }]}>مخفي</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => openOptionsModal(service)}
              disabled={updating === service.$id}
            >
              {updating === service.$id ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Modal خيارات الخدمة */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedService?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                handleToggleService(selectedService);
              }}
            >
              <Ionicons 
                name={selectedService?.isActive ? "close-circle-outline" : "checkmark-circle-outline"} 
                size={24} 
                color={selectedService?.isActive ? "#EF4444" : "#10B981"} 
              />
              <Text style={styles.modalOptionText}>
                {selectedService?.isActive ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
              </Text>
              <Text style={styles.modalOptionDesc}>
                {selectedService?.isActive 
                  ? 'الخدمة تظهر معتمة وعليها "جاري التحديث"' 
                  : 'الخدمة تعمل بشكل طبيعي'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                handleToggleVisibility(selectedService);
              }}
            >
              <Ionicons 
                name={selectedService?.isVisible === false ? "eye-outline" : "eye-off-outline"} 
                size={24} 
                color={selectedService?.isVisible === false ? "#10B981" : "#6B7280"} 
              />
              <Text style={styles.modalOptionText}>
                {selectedService?.isVisible === false ? 'إظهار الخدمة' : 'إخفاء الخدمة'}
              </Text>
              <Text style={styles.modalOptionDesc}>
                {selectedService?.isVisible === false 
                  ? 'الخدمة ستظهر للعملاء' 
                  : 'الخدمة لن تظهر نهائياً للعملاء'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelOptionText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: { fontSize: 14, color: '#4F46E5', lineHeight: 22 },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  serviceDetails: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  serviceId: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  badgesContainer: { flexDirection: 'row', gap: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  moreButton: { padding: 8 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  modalOptionDesc: { fontSize: 12, color: '#6B7280' },
  cancelOption: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelOptionText: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
});
