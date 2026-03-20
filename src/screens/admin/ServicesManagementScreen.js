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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllServices,
  toggleServiceStatus,
  toggleServiceVisibility,
  deleteService,
  createService,
  updateService,
} from '../../services/servicesService';
import * as ImagePicker from 'expo-image-picker';
import { uploadServiceImage } from '../../services/uploadService';

const COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#4F46E5', '#14B8A6', '#F97316'
];

const CATEGORIES = [
  { label: 'Zid Express', value: 'express' },
  { label: 'Zid Pro', value: 'pro' },
  { label: 'خدمات أخرى', value: 'other' },
  { label: 'AI', value: 'ai' },
];

const SERVICE_TYPES = [
  { label: 'خدمة عادية (بدون منتجات)', value: 'regular' },
  { label: 'خدمة بأصناف (مثل مكوجي)', value: 'items_service' },
  { label: 'خدمة بمنتجات (مطاعم - سوبر ماركت)', value: 'items' },
  { label: 'خدمة AI (ذكاء اصطناعي)', value: 'ai' },
];

export default function ServicesManagementScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTracking, setUploadingTracking] = useState(false);

  // حقول الخدمة
  const [service_id, setServiceId] = useState('');
  const [service_name, setServiceName] = useState('');
  const [serviceColor, setServiceColor] = useState('#6B7280');
  const [serviceCategory, setServiceCategory] = useState('other');
  const [serviceOrder, setServiceOrder] = useState('0');
  const [serviceImage, setServiceImage] = useState(null);
  const [trackingImage, setTrackingImage] = useState(null); // ✅ صورة التتبع
  const [service_type, setServiceType] = useState('regular');
  const [merchant_type, setMerchantType] = useState('merchant');
  const [items_collection, setItemsCollection] = useState('');
  const [has_pickup, setHasPickup] = useState(false);
  const [sub_services, setSubServices] = useState([]);
  const [currentSubService, setCurrentSubService] = useState('');
  const [editingSubIndex, setEditingSubIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const pickImage = async (type = 'service') => {
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
        if (type === 'tracking') {
          setUploadingTracking(true);
          const uploadResult = await uploadServiceImage(result.assets[0].uri);
          setUploadingTracking(false);
          if (uploadResult.success) {
            setTrackingImage(uploadResult.fileUrl);
          } else {
            Alert.alert('خطأ', 'فشل رفع صورة التتبع');
          }
        } else {
          setUploading(true);
          const uploadResult = await uploadServiceImage(result.assets[0].uri);
          setUploading(false);
          if (uploadResult.success) {
            setServiceImage(uploadResult.fileUrl);
          } else {
            Alert.alert('خطأ', 'فشل رفع الصورة');
          }
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
    setTrackingImage(null);
    setServiceType('regular');
    setMerchantType('merchant');
    setItemsCollection('');
    setHasPickup(false);
    setSubServices([]);
    setCurrentSubService('');
    setEditingSubIndex(null);
    setIsEditing(false);
    setSelectedService(null);
  };

  const addSubService = () => {
    if (!currentSubService.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم الخدمة الفرعية');
      return;
    }
    if (editingSubIndex !== null) {
      const updated = [...sub_services];
      updated[editingSubIndex] = currentSubService.trim();
      setSubServices(updated);
      setEditingSubIndex(null);
    } else {
      setSubServices([...sub_services, currentSubService.trim()]);
    }
    setCurrentSubService('');
  };

  const editSubService = (index) => {
    setCurrentSubService(sub_services[index]);
    setEditingSubIndex(index);
  };

  const removeSubService = (index) => {
    Alert.alert(
      'حذف الخدمة الفرعية',
      `هل أنت متأكد من حذف "${sub_services[index]}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            const filtered = sub_services.filter((_, i) => i !== index);
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
    if (!service_id.trim()) {
      Alert.alert('تنبيه', 'معرف الخدمة مطلوب');
      return;
    }
    if (!service_name.trim()) {
      Alert.alert('تنبيه', 'اسم الخدمة مطلوب');
      return;
    }

    if (service_type === 'items_service' && sub_services.length === 0) {
      Alert.alert('تنبيه', 'يجب إضافة خدمة فرعية واحدة على الأقل');
      return;
    }

    setSubmitting(true);

    try {
      let itemsColl = items_collection;
      if (service_type === 'items_service' && !itemsColl) {
        itemsColl = `${service_id}_items`;
      } else if (service_type === 'items' && !itemsColl) {
        itemsColl = `service_${service_id}_items`;
      }

      const serviceData = {
        id: service_id.trim().toLowerCase(),
        name: service_name.trim(),
        type: service_type,
        icon: 'apps-outline',
        color: serviceColor,
        category: serviceCategory,
        is_active: true,
        is_visible: true,
        has_items: service_type === 'items' || service_type === 'items_service',
        has_pickup: has_pickup,
        items_collection: itemsColl,
        merchant_role: 'merchant',
        merchant_type: merchant_type,
        image_url: serviceImage,
        tracking_image: trackingImage, // ✅ إضافة صورة التتبع
        order: parseInt(serviceOrder) || 0,
        sub_services: service_type === 'items_service' ? sub_services : [],
      };

      const result = await createService(serviceData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة الخدمة بنجاح');
        setModalVisible(false);
        resetForm();
        loadServices();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    setSubmitting(true);

    try {
      const updateData = {
        name: service_name,
        color: serviceColor,
        image_url: serviceImage,
        tracking_image: trackingImage, // ✅ إضافة صورة التتبع
        category: serviceCategory,
        has_pickup: has_pickup,
        order: parseInt(serviceOrder) || 0,
        type: service_type,
        merchant_type: merchant_type,
        sub_services: service_type === 'items_service' ? sub_services : [],
      };

      const result = await updateService(selectedService.$id, updateData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم تحديث الخدمة بنجاح');
        setModalVisible(false);
        resetForm();
        loadServices();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (service) => {
    const newStatus = !service.is_active;
    const result = await toggleServiceStatus(service.$id, newStatus);
    if (result.success) {
      setServices(services.map(s =>
        s.$id === service.$id ? { ...s, is_active: newStatus } : s
      ));
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleToggleVisibility = async (service) => {
    const newVisibility = !service.is_visible;
    const result = await toggleServiceVisibility(service.$id, newVisibility);
    if (result.success) {
      setServices(services.map(s =>
        s.$id === service.$id ? { ...s, is_visible: newVisibility } : s
      ));
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleDeleteService = (service) => {
    Alert.alert(
      'حذف الخدمة',
      `هل أنت متأكد من حذف "${service.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteService(service.$id);
            if (result.success) {
              loadServices();
              Alert.alert('✅ تم', 'تم حذف الخدمة');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (service) => {
    setSelectedService(service);
    setServiceId(service.id);
    setServiceName(service.name);
    setServiceColor(service.color || '#6B7280');
    setServiceCategory(service.category || 'other');
    setServiceOrder(String(service.order || '0'));
    setServiceImage(service.image_url || null);
    setTrackingImage(service.tracking_image || null); // ✅ جلب صورة التتبع
    setServiceType(service.type || 'regular');
    setMerchantType(service.merchant_type || 'merchant');
    setItemsCollection(service.items_collection || '');
    setHasPickup(service.has_pickup || false);
    setSubServices(service.sub_services || []);
    setIsEditing(true);
    setModalVisible(true);
    setShowOptionsModal(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const getServiceColor = (service_id) => {
    const colors = {
      'مطاعم': '#EF4444',
      'شيف منزلي': '#F59E0B',
      'سوبر ماركت': '#10B981',
      'مكوجي': '#3B82F6',
      'صيدلية': '#8B5CF6',
      'مخبز': '#F59E0B',
    };
    return colors[service_id] || '#6B7280';
  };

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
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الخدمات</Text>
        <TouchableOpacity onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadServices} />}
        contentContainerStyle={styles.content}
      >
        {services.map((service) => (
          <View key={service.$id} style={styles.serviceCard}>
            <View style={styles.serviceInfo}>
              {service.image_url ? (
                <Image source={{ uri: service.image_url }} style={styles.serviceImage} />
              ) : (
                <View style={[styles.iconContainer, { backgroundColor: getServiceColor(service.name) + '20' }]}>
                  <Ionicons name={service.icon || 'apps-outline'} size={24} color={getServiceColor(service.name)} />
                </View>
              )}
              <View style={styles.serviceDetails}>
                <View style={styles.serviceNameRow}>
                  <Text style={styles.service_name}>{service.name}</Text>
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
                <Text style={styles.service_id}>ID: {service.id}</Text>
                {service.sub_services && service.sub_services.length > 0 && (
                  <View style={styles.subServicesContainer}>
                    <Text style={styles.subServicesLabel}>الخدمات الفرعية:</Text>
                    <View style={styles.subServicesList}>
                      {service.sub_services.map((sub, index) => (
                        <View key={index} style={styles.subServiceChip}>
                          <Text style={styles.subServiceText}>{sub}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.badgesContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: service.is_active ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.statusText, { color: service.is_active ? '#10B981' : '#EF4444' }]}>
                      {service.is_active ? 'نشط' : 'معطل'}
                    </Text>
                  </View>
                  {service.is_visible === false && (
                    <View style={[styles.statusBadge, { backgroundColor: '#6B728020' }]}>
                      <Text style={[styles.statusText, { color: '#6B7280' }]}>مخفي</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.serviceActions}>
              {service.type === 'items_service' && service.has_items && (
                <TouchableOpacity
                  style={[styles.itemActionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    navigation.navigate('ItemsServiceScreen', {
                      service_id: service.id,
                      collectionName: service.items_collection,
                      service_name: service.name,
                      serviceColor: service.color,
                      sub_services: service.sub_services || [],
                      isAdmin: true
                    });
                  }}
                >
                  <Ionicons name="list-outline" size={18} color="#FFF" />
                  <Text style={styles.itemActionText}>إدارة الأصناف</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => {
                  setSelectedService(service);
                  setShowOptionsModal(true);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal خيارات الخدمة */}
      <Modal visible={showOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedService?.name}</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => openEditModal(selectedService)}
            >
              <Ionicons name="create-outline" size={24} color="#4F46E5" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>تعديل الخدمة</Text>
                <Text style={styles.modalOptionDesc}>تغيير بيانات الخدمة</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                handleToggleStatus(selectedService);
              }}
            >
              <Ionicons
                name={selectedService?.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'}
                size={24}
                color={selectedService?.is_active ? '#EF4444' : '#10B981'}
              />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>
                  {selectedService?.is_active ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                handleToggleVisibility(selectedService);
              }}
            >
              <Ionicons
                name={selectedService?.is_visible === false ? 'eye-outline' : 'eye-off-outline'}
                size={24}
                color={selectedService?.is_visible === false ? '#10B981' : '#6B7280'}
              />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>
                  {selectedService?.is_visible === false ? 'إظهار الخدمة' : 'إخفاء الخدمة'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.deleteOption]}
              onPress={() => {
                setShowOptionsModal(false);
                handleDeleteService(selectedService);
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>حذف الخدمة</Text>
                <Text style={styles.modalOptionDesc}>لا يمكن التراجع عن هذا الإجراء</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelOptionText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal إضافة/تعديل خدمة */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {!isEditing && (
                <>
                  <Text style={styles.label}>معرف الخدمة</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="restaurant, supermarket, laundry"
                    value={service_id}
                    onChangeText={setServiceId}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.label}>اسم الخدمة</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: مطاعم, سوبر ماركت"
                value={service_name}
                onChangeText={setServiceName}
              />

              <Text style={styles.label}>نوع الخدمة</Text>
              <View style={styles.typeContainer}>
                {SERVICE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      service_type === type.value && styles.typeButtonActive
                    ]}
                    onPress={() => setServiceType(type.value)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      service_type === type.value && styles.typeButtonTextActive
                    ]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {service_type === 'items_service' && (
                <View style={styles.subServicesSection}>
                  <Text style={styles.label}>الخدمات الفرعية</Text>
                  {sub_services.length > 0 && (
                    <View style={styles.subServicesList}>
                      {sub_services.map((sub, index) => (
                        <View key={index} style={styles.subServiceItem}>
                          <Text style={styles.subServiceName}>{sub}</Text>
                          <View style={styles.subServiceActions}>
                            <TouchableOpacity onPress={() => editSubService(index)}>
                              <Ionicons name="create-outline" size={18} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeSubService(index)}>
                              <Ionicons name="close-circle" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.addSubServiceRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="أضف خدمة فرعية"
                      value={currentSubService}
                      onChangeText={setCurrentSubService}
                    />
                    <TouchableOpacity
                      style={styles.addSubServiceButton}
                      onPress={addSubService}
                    >
                      <Ionicons name={editingSubIndex !== null ? 'checkmark' : 'add'} size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.label}>صورة الخدمة</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('service')} disabled={uploading}>
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

              {/* ✅ حقل صورة التتبع */}
              <Text style={styles.label}>صورة تتبع الطلب</Text>
              <Text style={styles.helperText}>هذه الصورة تظهر للعميل أثناء انتظار قبول الطلب</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('tracking')} disabled={uploadingTracking}>
                {trackingImage ? (
                  <Image source={{ uri: trackingImage }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {uploadingTracking ? (
                      <ActivityIndicator size="large" color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>اختر صورة التتبع</Text>
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

              <View style={styles.switchContainer}>
                <Text style={styles.label}>له Pickup (استلام)</Text>
                <Switch
                  value={has_pickup}
                  onValueChange={setHasPickup}
                  trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, (submitting || uploading || uploadingTracking) && styles.disabled]}
                onPress={isEditing ? handleUpdateService : handleAddService}
                disabled={submitting || uploading || uploadingTracking}
              >
                {submitting || uploading || uploadingTracking ? (
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  content: { padding: 16 },

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
  service_name: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  typeBadgeText: { fontSize: 9, fontWeight: '600' },
  service_id: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
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
  itemActionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
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
  modalScrollContent: { paddingVertical: 20 },

  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8, marginTop: 8 },
  helperText: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, marginTop: -4 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
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
  categoryOptionActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  categoryOptionText: { fontSize: 12, color: '#4B5563' },
  categoryOptionTextActive: { color: '#FFF', fontWeight: '600' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
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
  typeButtonActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  typeButtonText: { fontSize: 12, color: '#4B5563' },
  typeButtonTextActive: { color: '#FFF', fontWeight: '600' },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // أنماط الخدمات الفرعية
  subServicesSection: { marginBottom: 15 },
  subServicesList: { marginBottom: 10 },
  subServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  subServiceName: { fontSize: 14, color: '#1F2937' },
  subServiceActions: { flexDirection: 'row', gap: 8 },
  addSubServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
