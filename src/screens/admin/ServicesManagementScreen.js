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
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllServices,
  toggleServiceStatus,
  toggleServiceVisibility,
  deleteService,
  createService,
  updateService,
  CORE_SERVICES,
  updateCoreService
} from '../../services/servicesService';
import * as ImagePicker from 'expo-image-picker';
import { uploadServiceImage } from '../../services/uploadService';

// خيارات النص المقترحة
const MAINTENANCE_OPTIONS = [
  'جاري التحديث',
  'قريباً',
  'تحت الصيانة',
  'غير متاح حالياً',
  'قيد التطوير',
];

const CATEGORIES = [
  { label: 'Zid Express', value: 'express' },
  { label: 'Zid Pro', value: 'pro' },
  { label: 'خدمات أخرى', value: 'other' },
  { label: 'AI', value: 'ai' },
];

const COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#4F46E5', '#14B8A6', '#F97316'
];

// أنواع الخدمات
const SERVICE_TYPES = [
  { label: 'خدمة عادية (بدون منتجات)', value: 'regular' },
  { label: 'خدمة بأصناف (مثل مكوجي)', value: 'items_service' },
  { label: 'خدمة بمنتجات (مطاعم - أكل بيتي)', value: 'items' },
  { label: 'خدمة AI (ذكاء اصطناعي)', value: 'ai' },
];

// أنواع التجار للخدمات بمنتجات
const MERCHANT_TYPES = [
  { label: 'تاجر عادي', value: 'merchant' },
  { label: 'مطعم', value: 'restaurant' },
  { label: 'شيف منزلي', value: 'home_chef' },
  { label: 'مخبز', value: 'bakery' },
  { label: 'مشروبات', value: 'drinks' },
];

export default function ServicesManagementScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [maintenanceText, setMaintenanceText] = useState('');
  const [showMaintenanceInput, setShowMaintenanceInput] = useState(false);

  // Modal إضافة/تعديل خدمة
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // حقول الخدمة الأساسية
  const [serviceId, setServiceId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceColor, setServiceColor] = useState('#6B7280');
  const [serviceCategory, setServiceCategory] = useState('other');
  const [serviceOrder, setServiceOrder] = useState('0');
  const [serviceImage, setServiceImage] = useState(null);
  const [serviceMaintenanceText, setServiceMaintenanceText] = useState('جاري التحديث');
  const [serviceType, setServiceType] = useState('regular');
  const [merchantType, setMerchantType] = useState('merchant');
  const [itemsCollection, setItemsCollection] = useState('');
  const [uploading, setUploading] = useState(false);

  // خدمات فرعية (للخدمات من نوع items_service)
  const [subServices, setSubServices] = useState([]);
  const [currentSubService, setCurrentSubService] = useState('');
  const [editingSubIndex, setEditingSubIndex] = useState(null);

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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح بالوصول للمعرض');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const uploadResult = await uploadServiceImage(result.assets[0].uri);
        setUploading(false);

        if (uploadResult.success) {
          setServiceImage(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل في رفع الصورة');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const resetForm = () => {
    setServiceId('');
    setServiceName('');
    setServiceColor('#6B7280');
    setServiceCategory('other');
    setServiceOrder('0');
    setServiceImage(null);
    setServiceMaintenanceText('جاري التحديث');
    setServiceType('regular');
    setMerchantType('merchant');
    setItemsCollection('');
    setSubServices([]);
    setCurrentSubService('');
    setEditingSubIndex(null);
    setIsEditing(false);
    setSelectedService(null);
  };

  // دوال إدارة الخدمات الفرعية
  const addSubService = () => {
    if (!currentSubService.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم الخدمة الفرعية');
      return;
    }

    if (editingSubIndex !== null) {
      // تعديل خدمة فرعية موجودة
      const updated = [...subServices];
      updated[editingSubIndex] = currentSubService.trim();
      setSubServices(updated);
      setEditingSubIndex(null);
    } else {
      // إضافة خدمة فرعية جديدة
      setSubServices([...subServices, currentSubService.trim()]);
    }
    setCurrentSubService('');
  };

  const editSubService = (index) => {
    setCurrentSubService(subServices[index]);
    setEditingSubIndex(index);
  };

  const removeSubService = (index) => {
    Alert.alert(
      'حذف الخدمة الفرعية',
      `هل أنت متأكد من حذف "${subServices[index]}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            const filtered = subServices.filter((_, i) => i !== index);
            setSubServices(filtered);
            if (editingSubIndex === index) {
              setCurrentSubService('');
              setEditingSubIndex(null);
            }
          }
        }
      ]
    );
  };

  const handleAddService = async () => {
    if (!serviceId.trim()) {
      Alert.alert('تنبيه', 'معرف الخدمة مطلوب');
      return;
    }
    if (!serviceName.trim()) {
      Alert.alert('تنبيه', 'اسم الخدمة مطلوب');
      return;
    }

    // التحقق من وجود خدمات فرعية للخدمات من نوع items_service
    if (serviceType === 'items_service' && subServices.length === 0) {
      Alert.alert('تنبيه', 'يجب إضافة خدمة فرعية واحدة على الأقل');
      return;
    }

    setUploading(true);

    try {
      // تحديد الـ screen المناسب حسب نوع الخدمة
      let screen = 'ServiceScreen';
      if (serviceType === 'items_service') {
        screen = 'ItemsServiceScreen';
      } else if (serviceType === 'items') {
        screen = 'ServiceItemsScreen';
      } else if (serviceType === 'ai') {
        screen = 'AiMainModal';
      }

      // إنشاء اسم collection للمنتجات إذا كانت الخدمة ليها منتجات
      let itemsColl = null;
      if (serviceType === 'items') {
        itemsColl = `service_${serviceId}_items`;
        Alert.alert(
          'تنبيه',
          `محتاج تنشئ collection في Appwrite بإسم: ${itemsColl}\n\nوالـ attributes:\n- name (string)\n- price (double)\n- description (string)\n- images (string[])\n- providerId (string)\n- providerName (string)\n- providerType (string)\n- serviceId (string)\n- status (string)\n- isAvailable (boolean)`
        );
      }

      const serviceData = {
        id: serviceId.trim().toLowerCase(),
        name: serviceName.trim(),
        type: serviceType,
        screen: screen,
        icon: 'apps-outline',
        color: serviceColor,
        category: serviceCategory,
        isActive: true,
        isVisible: true,
        hasItems: serviceType === 'items' || serviceType === 'items_service',
        itemsCollection: itemsColl,
        merchantRole: 'merchant',
        merchantType: merchantType,
        imageUrl: serviceImage,
        maintenanceText: serviceMaintenanceText,
        order: parseInt(serviceOrder) || 0,
        // حفظ الخدمات الفرعية
        subServices: serviceType === 'items_service' ? subServices : [],
      };

      const result = await createService(serviceData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الخدمة بنجاح');
        setEditModalVisible(false);
        resetForm();
        loadServices();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    setUploading(true);

    try {
      const updateData = {
        name: serviceName,
        color: serviceColor,
        icon: 'apps-outline',
        imageUrl: serviceImage,
        maintenanceText: serviceMaintenanceText,
        category: serviceCategory,
        hasItems: serviceType === 'items' || serviceType === 'items_service',
        order: parseInt(serviceOrder) || 0,
        type: serviceType,
        merchantType: merchantType,
        // تحديث الخدمات الفرعية
        subServices: serviceType === 'items_service' ? subServices : [],
      };

      const result = await updateService(selectedService.$id, updateData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم تحديث الخدمة بنجاح');
        setEditModalVisible(false);
        resetForm();
        loadServices();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleService = async (service) => {
    if (service.isCore) {
      const newStatus = !service.isActive;
      const updated = await updateCoreService(service.id, { isActive: newStatus });
      if (updated.success) {
        setServices(services.map(s =>
          s.id === service.id ? { ...s, isActive: newStatus } : s
        ));
        Alert.alert('تم', `تم ${newStatus ? 'تفعيل' : 'تعطيل'} خدمة ${service.name}`);
      }
      return;
    }

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
    if (service.isCore) {
      const newVisibility = !service.isVisible;
      const updated = await updateCoreService(service.id, { isVisible: newVisibility });
      if (updated.success) {
        setServices(services.map(s =>
          s.id === service.id ? { ...s, isVisible: newVisibility } : s
        ));
        Alert.alert('تم', `تم ${newVisibility ? 'إظهار' : 'إخفاء'} خدمة ${service.name}`);
      }
      return;
    }

    setUpdating(service.$id);
    const newVisibility = !service.isVisible;
    const result = await toggleServiceVisibility(service.$id, newVisibility);

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

  const handleUpdateMaintenanceText = async () => {
    if (!selectedService || !maintenanceText.trim()) return;

    if (selectedService.isCore) {
      const updated = await updateCoreService(selectedService.id, { maintenanceText });
      if (updated.success) {
        setServices(services.map(s =>
          s.id === selectedService.id ? { ...s, maintenanceText } : s
        ));
        Alert.alert('تم', 'تم تحديث نص الصيانة');
      }
    } else {
      setUpdating(selectedService.$id);
      const result = await updateService(selectedService.$id, { maintenanceText });
      if (result.success) {
        setServices(services.map(s =>
          s.$id === selectedService.$id ? { ...s, maintenanceText } : s
        ));
        Alert.alert('تم', 'تم تحديث نص الصيانة');
      }
      setUpdating(null);
    }

    setShowMaintenanceInput(false);
    setMaintenanceText('');
  };

  const handleDeleteService = (service) => {
    if (service.isCore) {
      Alert.alert('تنبيه', 'لا يمكن حذف الخدمات الأساسية');
      return;
    }

    Alert.alert(
      'حذف الخدمة',
      `هل أنت متأكد من حذف خدمة ${service.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setUpdating(service.$id);
            const result = await deleteService(service.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الخدمة');
              loadServices();
            } else {
              Alert.alert('خطأ', result.error);
            }
            setUpdating(null);
          }
        }
      ]
    );
  };

  const openEditModal = (service) => {
    if (service.isCore) {
      setSelectedService(service);
      setShowMaintenanceInput(true);
      setMaintenanceText(service.maintenanceText || 'جاري التحديث');
      return;
    }

    setServiceId(service.id);
    setServiceName(service.name);
    setServiceColor(service.color || '#6B7280');
    setServiceCategory(service.category || 'other');
    setServiceOrder(String(service.order || '0'));
    setServiceImage(service.imageUrl || null);
    setServiceMaintenanceText(service.maintenanceText || 'جاري التحديث');
    setServiceType(service.type || 'regular');
    setMerchantType(service.merchantType || 'merchant');
    setItemsCollection(service.itemsCollection || '');
    setSubServices(service.subServices || []);
    setIsEditing(true);
    setSelectedService(service);
    setEditModalVisible(true);
  };

  const openAddModal = () => {
    resetForm();
    setEditModalVisible(true);
  };

  const openOptionsModal = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const getServiceIcon = (iconName) => {
    const icons = {
      'restaurant-outline': 'restaurant-outline',
      'home-outline': 'home-outline',
      'basket-outline': 'basket-outline',
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
      restaurant: '#F59E0B',
      home_chef: '#EF4444',
      supermarket: '#F59E0B',
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
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={loadServices} style={styles.headerButton}>
            <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminAssistants')}
            style={styles.headerButton}
          >
            <Ionicons name="chatbubbles" size={24} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openAddModal}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#4F46E5" />
          <Text style={styles.infoText}>
            • التفعيل: الخدمة تعمل بشكل طبيعي
            {'\n'}• التعطيل: الخدمة تظهر معتمة وعليها النص الذي تحدده
            {'\n'}• الإخفاء: الخدمة لا تظهر نهائياً للعملاء
          </Text>
        </View>

        {services.map((service) => (
          <View key={service.$id || service.id} style={styles.serviceCard}>
            <View style={styles.serviceInfo}>
              {service.imageUrl ? (
                <Image source={{ uri: service.imageUrl }} style={styles.serviceImage} />
              ) : (
                <View style={[styles.iconContainer, { backgroundColor: getServiceColor(service.id) + '20' }]}>
                  <Ionicons name={getServiceIcon(service.icon)} size={24} color={getServiceColor(service.id)} />
                </View>
              )}
              <View style={styles.serviceDetails}>
                <View style={styles.serviceNameRow}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {service.isCore && (
                    <View style={styles.coreBadge}>
                      <Text style={styles.coreBadgeText}>أساسية</Text>
                    </View>
                  )}
                  {service.type === 'items_service' && (
                    <View style={[styles.typeBadge, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.typeBadgeText, { color: '#3B82F6' }]}>أصناف</Text>
                    </View>
                  )}
                  {service.type === 'items' && (
                    <View style={[styles.typeBadge, { backgroundColor: '#10B98120' }]}>
                      <Text style={[styles.typeBadgeText, { color: '#10B981' }]}>منتجات</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.serviceId}>ID: {service.id}</Text>
                {service.subServices && service.subServices.length > 0 && (
                  <View style={styles.subServicesContainer}>
                    <Text style={styles.subServicesLabel}>الخدمات الفرعية:</Text>
                    <View style={styles.subServicesList}>
                      {service.subServices.map((sub, index) => (
                        <View key={index} style={styles.subServiceChip}>
                          <Text style={styles.subServiceText}>{sub}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
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
                {!service.isActive && service.maintenanceText && (
                  <View style={styles.maintenanceBadge}>
                    <Text style={styles.maintenanceBadgeText}>نص: {service.maintenanceText}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.serviceActions}>
              {service.type === 'items_service' && (
                <TouchableOpacity
                  style={[styles.itemActionButton, { backgroundColor: '#3B82F6' }]}
                  onPress={() => navigation.navigate('ItemsServiceScreen', {
                    serviceId: service.id,
                    serviceName: service.name,
                    serviceColor: service.color,
                    subServices: service.subServices || [],
                    isAdmin: true
                  })}
                >
                  <Ionicons name="list-outline" size={18} color="#FFF" />
                  <Text style={styles.itemActionText}>إدارة الأصناف</Text>
                </TouchableOpacity>
              )}
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

            {/* زر تعديل النص */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                setSelectedService(selectedService);
                setShowMaintenanceInput(true);
                setMaintenanceText(selectedService?.maintenanceText || 'جاري التحديث');
              }}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#4F46E5" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>تغيير نص الصيانة</Text>
                <Text style={styles.modalOptionDesc}>
                  الحالي: {selectedService?.maintenanceText || 'جاري التحديث'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* زر التعديل */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                openEditModal(selectedService);
              }}
            >
              <Ionicons name="create-outline" size={24} color="#4F46E5" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>
                  {selectedService?.isCore ? 'تعديل نص الصيانة' : 'تعديل الخدمة'}
                </Text>
                <Text style={styles.modalOptionDesc}>
                  {selectedService?.isCore
                    ? 'تغيير النص الذي يظهر عند التعطيل'
                    : 'تغيير بيانات الخدمة وإعداداتها'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* زر التفعيل/التعطيل */}
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
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>
                  {selectedService?.isActive ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
                </Text>
                <Text style={styles.modalOptionDesc}>
                  {selectedService?.isActive
                    ? 'الخدمة ستظهر معتمة مع نص الصيانة'
                    : 'الخدمة ستعمل بشكل طبيعي'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* زر الإظهار/الإخفاء */}
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
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>
                  {selectedService?.isVisible === false ? 'إظهار الخدمة' : 'إخفاء الخدمة'}
                </Text>
                <Text style={styles.modalOptionDesc}>
                  {selectedService?.isVisible === false
                    ? 'الخدمة ستظهر للعملاء'
                    : 'الخدمة لن تظهر نهائياً للعملاء'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* زر الحذف */}
            {!selectedService?.isCore && (
              <TouchableOpacity
                style={[styles.modalOption, styles.deleteOption]}
                onPress={() => {
                  setModalVisible(false);
                  handleDeleteService(selectedService);
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                <View style={styles.modalOptionTextContainer}>
                  <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>حذف الخدمة</Text>
                  <Text style={styles.modalOptionDesc}>لا يمكن التراجع عن هذا الإجراء</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelOptionText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal إدخال نص الصيانة */}
      <Modal visible={showMaintenanceInput} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>نص الصيانة</Text>
              <TouchableOpacity onPress={() => setShowMaintenanceInput(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>اختر نصاً مقترحاً:</Text>
            <View style={styles.optionsContainer}>
              {MAINTENANCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    maintenanceText === option && styles.optionButtonActive
                  ]}
                  onPress={() => setMaintenanceText(option)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    maintenanceText === option && styles.optionButtonTextActive
                  ]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>أو اكتب نصاً مخصصاً:</Text>
            <TextInput
              style={styles.input}
              value={maintenanceText}
              onChangeText={setMaintenanceText}
              placeholder="اكتب النص الذي تريد ظهوره"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMaintenanceInput(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateMaintenanceText}
              >
                <Text style={styles.saveButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal إضافة/تعديل خدمة - مع إضافة الخدمات الفرعية */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setEditModalVisible(false);
                  resetForm();
                }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {!isEditing && (
                <>
                  <Text style={styles.label}>معرف الخدمة</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ironing, laundry, bakery, etc"
                    value={serviceId}
                    onChangeText={setServiceId}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.label}>اسم الخدمة</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: مكوجي, مخبز, مشروبات"
                value={serviceName}
                onChangeText={setServiceName}
              />

              {/* نوع الخدمة */}
              <Text style={styles.label}>نوع الخدمة</Text>
              <View style={styles.typeContainer}>
                {SERVICE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      serviceType === type.value && styles.typeButtonActive
                    ]}
                    onPress={() => setServiceType(type.value)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      serviceType === type.value && styles.typeButtonTextActive
                    ]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* خدمات فرعية - للخدمات من نوع items_service */}
              {serviceType === 'items_service' && (
                <View style={styles.subServicesSection}>
                  <Text style={styles.label}>الخدمات الفرعية</Text>
                  <Text style={styles.subServicesHint}>
                    أضف الخدمات التي تقدمها (مثل: كوي فقط، غسيل وكوي، تنظيف جاف، إلخ)
                  </Text>

                  {/* عرض الخدمات الفرعية المضافة */}
                  {subServices.length > 0 && (
                    <View style={styles.subServicesList}>
                      {subServices.map((sub, index) => (
                        <View key={index} style={styles.subServiceItem}>
                          <View style={styles.subServiceInfo}>
                            <Ionicons name="pricetag-outline" size={16} color="#4F46E5" />
                            <Text style={styles.subServiceName}>{sub}</Text>
                          </View>
                          <View style={styles.subServiceActions}>
                            <TouchableOpacity onPress={() => editSubService(index)} style={styles.subServiceEdit}>
                              <Ionicons name="create-outline" size={18} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeSubService(index)} style={styles.subServiceDelete}>
                              <Ionicons name="close-circle" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* إضافة خدمة فرعية جديدة */}
                  <View style={styles.addSubServiceRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="اكتب اسم الخدمة الفرعية"
                      value={currentSubService}
                      onChangeText={setCurrentSubService}
                    />
                    <TouchableOpacity
                      style={styles.addSubServiceButton}
                      onPress={addSubService}
                    >
                      <Ionicons name={editingSubIndex !== null ? "checkmark" : "add"} size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* خيارات إضافية للخدمات بمنتجات */}
              {serviceType === 'items' && (
                <>
                  <Text style={styles.label}>نوع التاجر</Text>
                  <View style={styles.merchantTypeContainer}>
                    {MERCHANT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.merchantTypeButton,
                          merchantType === type.value && styles.merchantTypeButtonActive
                        ]}
                        onPress={() => setMerchantType(type.value)}
                      >
                        <Text style={[
                          styles.merchantTypeText,
                          merchantType === type.value && styles.merchantTypeTextActive
                        ]}>{type.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>صورة الخدمة</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                disabled={uploading}
              >
                {serviceImage ? (
                  <Image source={{ uri: serviceImage }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {uploading ? (
                      <ActivityIndicator size="large" color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>اللون</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      serviceColor === color && styles.colorOptionActive
                    ]}
                    onPress={() => setServiceColor(color)}
                  />
                ))}
              </ScrollView>

              <Text style={styles.label}>التصنيف</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryOption,
                      serviceCategory === cat.value && styles.categoryOptionActive
                    ]}
                    onPress={() => setServiceCategory(cat.value)}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      serviceCategory === cat.value && styles.categoryOptionTextActive
                    ]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>الترتيب</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={serviceOrder}
                    onChangeText={setServiceOrder}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>نص الصيانة</Text>
              <View style={styles.optionsContainer}>
                {MAINTENANCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      serviceMaintenanceText === option && styles.optionButtonActive
                    ]}
                    onPress={() => setServiceMaintenanceText(option)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      serviceMaintenanceText === option && styles.optionButtonTextActive
                    ]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, uploading && styles.disabled]}
                onPress={isEditing ? handleUpdateService : handleAddService}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'حفظ التغييرات' : 'إضافة الخدمة'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  headerButtons: { flexDirection: 'row', gap: 12 },
  headerButton: { padding: 4 },
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceInfo: { flexDirection: 'row', alignItems: 'center' },
  serviceImage: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  serviceDetails: { flex: 1 },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  coreBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  coreBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '600' },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '600' },
  serviceId: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  subServicesContainer: { marginBottom: 4 },
  subServicesLabel: { fontSize: 11, color: '#4B5563', marginBottom: 2 },
  subServicesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  subServiceChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  subServiceText: { fontSize: 10, color: '#1F2937' },
  badgesContainer: { flexDirection: 'row', gap: 4, marginBottom: 4, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  maintenanceBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  maintenanceBadgeText: { fontSize: 10, color: '#92400E', fontWeight: '500' },
  serviceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  itemActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  moreButton: { padding: 8 },

  // Modal styles
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
    width: '90%',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 12,
  },
  modalOptionTextContainer: { flex: 1 },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  modalOptionDesc: { fontSize: 12, color: '#6B7280' },
  deleteOption: { backgroundColor: '#FEE2E2' },
  cancelOption: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelOptionText: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8, marginTop: 8 },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  optionButtonText: { fontSize: 12, color: '#4B5563' },
  optionButtonTextActive: { color: '#FFF', fontWeight: '600' },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: { opacity: 0.6 },
  modalScrollContent: { paddingVertical: 20 },
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 15,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  imagePlaceholderText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  colorsScroll: { flexDirection: 'row', marginBottom: 15 },
  colorOption: { width: 40, height: 40, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorOptionActive: { borderColor: '#1F2937' },
  row: { flexDirection: 'row', gap: 10 },
  halfWidth: { flex: 1 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryOptionText: { fontSize: 12, color: '#4B5563' },
  categoryOptionTextActive: { color: '#FFF', fontWeight: '600' },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#4B5563',
  },
  typeButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  merchantTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  merchantTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  merchantTypeButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  merchantTypeText: {
    fontSize: 12,
    color: '#4B5563',
  },
  merchantTypeTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  
  // أنماط إضافية للخدمات الفرعية
  subServicesSection: {
    marginBottom: 15,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subServicesHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 15,
  },
  subServicesList: {
    marginBottom: 10,
  },
  subServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subServiceName: {
    fontSize: 14,
    color: '#1F2937',
  },
  subServiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  subServiceEdit: {
    padding: 4,
  },
  subServiceDelete: {
    padding: 4,
  },
  addSubServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  addSubServiceButton: {
    backgroundColor: '#4F46E5',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
