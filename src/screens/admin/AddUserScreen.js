import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createUserByAdmin } from '../../appwrite/userService';
import { uploadToImageKit } from '../../services/uploadService';
import { getAllServices } from '../../services/servicesService';

const ROLES = [
  { label: 'عميل', value: 'customer' },
  { label: 'تاجر', value: 'merchant' },
  { label: 'مندوب', value: 'driver' },
  { label: 'أدمن', value: 'admin' },
];

const SPECIALTIES = [
  'مصري', 'إيطالي', 'صيني', 'هندي', 'مشاوي', 'حلويات', 'مأكولات بحرية', 'صحية', 'نباتي'
];

export default function AddUserScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [merchantType, setMerchantType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showMerchantTypePicker, setShowMerchantTypePicker] = useState(false);

  // حقول الأماكن
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const [serviceArea, setServiceArea] = useState('');
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('10');
  const [isAvailable, setIsAvailable] = useState(true);

  const [specialties, setSpecialties] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [deliveryRadius, setDeliveryRadius] = useState('10');
  const [healthCert, setHealthCert] = useState(null);
  const [healthCertUrl, setHealthCertUrl] = useState('');

  useEffect(() => {
    loadAvailableServices();
  }, []);

  // ✅ تعديل: جلب الأماكن فقط إذا كان نوع النشاط ليس home_chef
  useEffect(() => {
    if (role === 'merchant' && merchantType && merchantType !== 'home_chef') {
      loadPlacesByType(merchantType);
    } else {
      setPlaces([]); // إفراغ الأماكن لـ home_chef
    }
  }, [merchantType, role]);

  const loadAvailableServices = async () => {
    setLoadingServices(true);
    try {
      const result = await getAllServices();
      if (result.success) {
        const activeServices = result.data.filter(s => s.isActive && s.isVisible);
        setAvailableServices(activeServices);
        console.log(`✅ تم جلب ${activeServices.length} خدمة متاحة`);
      }
    } catch (error) {
      console.error('خطأ في جلب الخدمات:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadPlacesByType = async (type) => {
    setLoadingPlaces(true);
    try {
      const { getAvailablePlacesByType } = await import('../../services/placesService');
      const result = await getAvailablePlacesByType(type);
      
      if (result.success) {
        setPlaces(result.data);
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error('خطأ في جلب الأماكن:', error);
      setPlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const getMerchantTypes = () => {
    return availableServices.map(service => ({
      label: service.name,
      value: service.id,
      icon: service.icon || 'apps-outline',
      serviceData: service
    }));
  };

  const pickHealthCert = async () => {
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
        setHealthCert(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const toggleSpecialty = (specialty) => {
    if (specialties.includes(specialty)) {
      setSpecialties(specialties.filter(s => s !== specialty));
    } else {
      setSpecialties([...specialties, specialty]);
    }
  };

  const handleAddUser = async () => {
    if (!name || !phone || !password) {
      Alert.alert('تنبيه', 'الرجاء إدخال الاسم ورقم الهاتف وكلمة المرور');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('تنبيه', 'رقم الهاتف غير صحيح');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let healthCertUrlFinal = null;
      if (healthCert) {
        const uploadResult = await uploadToImageKit(healthCert, `cert_${Date.now()}.jpg`, 'certificates');
        if (uploadResult.success) {
          healthCertUrlFinal = uploadResult.fileUrl;
        }
      }

      const userData = {
        name,
        phone,
        password,
        role,
        active: isActive,
      };

      if (role === 'merchant') {
        userData.merchantType = merchantType;

        if (merchantType === 'home_chef') {
          userData.specialties = specialties;
          userData.deliveryFee = parseFloat(deliveryFee);
          userData.deliveryRadius = parseFloat(deliveryRadius);
          userData.healthCertUrl = healthCertUrlFinal;
        }
        
        // ✅ إضافة المكان المختار فقط إذا كان موجوداً وليس home_chef
        if (selectedPlace && merchantType !== 'home_chef') {
          userData.selectedPlace = selectedPlace;
        }
      }

      if (role === 'driver') {
        userData.serviceArea = serviceArea;
        userData.maxDeliveryRadius = parseFloat(maxDeliveryRadius);
        userData.isAvailable = isAvailable;
      }

      const result = await createUserByAdmin(userData);

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة المستخدم بنجاح');
        navigation.goBack();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('AdminHome');
    }
  };

  const renderPicker = (visible, setVisible, items, selectedValue, onSelect, title) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedValue === item.value && styles.pickerItemSelected
                ]}
                onPress={() => {
                  onSelect(item.value);
                  setVisible(false);
                }}
              >
                {item.icon && (
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={selectedValue === item.value ? '#4F46E5' : '#6B7280'}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={[
                  styles.pickerItemText,
                  selectedValue === item.value && styles.pickerItemTextSelected
                ]}>{item.label}</Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={20} color="#4F46E5" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  if (loadingServices) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>جاري تحميل الخدمات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const merchantTypes = getMerchantTypes();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة مستخدم جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>الاسم الكامل</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: أحمد محمد"
          />

          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="01xxxxxxxxx"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="********"
          />

          <Text style={styles.label}>الدور</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowRolePicker(true)}
          >
            <Text style={role ? styles.selectorText : styles.selectorPlaceholder}>
              {ROLES.find(r => r.value === role)?.label || 'اختر الدور'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {role === 'merchant' && (
            <>
              <Text style={styles.label}>اختر نوع النشاط التجاري</Text>
              {merchantTypes.length > 0 ? (
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowMerchantTypePicker(true)}
                >
                  <Text style={merchantType ? styles.selectorText : styles.selectorPlaceholder}>
                    {merchantTypes.find(t => t.value === merchantType)?.label || 'اختر النشاط'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyServices}>
                  <Text style={styles.emptyServicesText}>لا توجد خدمات متاحة</Text>
                </View>
              )}

              {/* ✅ حقل المكان يظهر فقط إذا كان النشاط ليس home_chef */}
              {merchantType && merchantType !== 'home_chef' && (
                <>
                  <Text style={styles.label}>اختر المكان</Text>
                  {loadingPlaces ? (
                    <ActivityIndicator size="small" color="#4F46E5" style={styles.loader} />
                  ) : places.length > 0 ? (
                    <TouchableOpacity
                      style={styles.selector}
                      onPress={() => setShowPlacePicker(true)}
                    >
                      <Text style={selectedPlace ? styles.selectorText : styles.selectorPlaceholder}>
                        {selectedPlace ? selectedPlace.name : '-- اختر المكان --'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.emptyPlaces}>
                      <Text style={styles.emptyPlacesText}>لا توجد أماكن متاحة لهذا النشاط</Text>
                      <Text style={styles.emptyPlacesSub}>برجاء إضافة مكان أولاً من شاشة إدارة الأماكن</Text>
                    </View>
                  )}
                </>
              )}

              {merchantType === 'home_chef' && (
                <>
                  <Text style={styles.label}>التخصصات</Text>
                  <View style={styles.specialtiesContainer}>
                    {SPECIALTIES.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.specialtyChip,
                          specialties.includes(item) && styles.specialtyChipActive
                        ]}
                        onPress={() => toggleSpecialty(item)}
                      >
                        <Text style={[
                          styles.specialtyText,
                          specialties.includes(item) && styles.specialtyTextActive
                        ]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.label}>رسوم التوصيل (ج)</Text>
                      <TextInput
                        style={styles.input}
                        value={deliveryFee}
                        onChangeText={setDeliveryFee}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.label}>نطاق التوصيل (كم)</Text>
                      <TextInput
                        style={styles.input}
                        value={deliveryRadius}
                        onChangeText={setDeliveryRadius}
                        keyboardType="numeric"
                        placeholder="10"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>الشهادة الصحية</Text>
                  <TouchableOpacity style={styles.certPicker} onPress={pickHealthCert}>
                    {healthCert ? (
                      <Image source={{ uri: healthCert }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.certPlaceholder}>
                        <Ionicons name="document-text" size={40} color="#9CA3AF" />
                        <Text style={styles.certPlaceholderText}>رفع الشهادة الصحية</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {role === 'driver' && (
            <>
              <Text style={styles.label}>منطقة الخدمة</Text>
              <TextInput
                style={styles.input}
                value={serviceArea}
                onChangeText={setServiceArea}
                placeholder="مثال: الشيخ زايد"
              />

              <Text style={styles.label}>أقصى مسافة توصيل (كم)</Text>
              <TextInput
                style={styles.input}
                value={maxDeliveryRadius}
                onChangeText={setMaxDeliveryRadius}
                keyboardType="numeric"
                placeholder="10"
              />

              <View style={styles.switchContainer}>
                <Text style={styles.label}>متاح للتوصيل</Text>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                />
              </View>
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.label}>الحساب نشط</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, (loading || uploading) && styles.disabled]}
            onPress={handleAddUser}
            disabled={loading || uploading}
          >
            {(loading || uploading) ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.addButtonText}>إضافة المستخدم</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderPicker(showRolePicker, setShowRolePicker, ROLES, role, setRole, 'اختر الدور')}
      {merchantTypes.length > 0 && renderPicker(showMerchantTypePicker, setShowMerchantTypePicker, merchantTypes, merchantType, setMerchantType, 'اختر النشاط')}
      
      {/* ✅ Picker اختيار المكان - يظهر فقط إذا كان هناك أماكن */}
      <Modal visible={showPlacePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر المكان</Text>
              <TouchableOpacity onPress={() => setShowPlacePicker(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={places}
              keyExtractor={(item) => item.$id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedPlace?.$id === item.$id && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedPlace(item);
                    setShowPlacePicker(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.pickerItemText,
                      selectedPlace?.$id === item.$id && styles.pickerItemTextSelected
                    ]}>{item.name}</Text>
                    {item.address ? (
                      <Text style={styles.placeAddress}>{item.address}</Text>
                    ) : null}
                  </View>
                  {selectedPlace?.$id === item.$id && (
                    <Ionicons name="checkmark" size={20} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
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
  content: { padding: 20 },
  form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  selectorText: { fontSize: 14, color: '#1F2937', flex: 1, marginLeft: 8 },
  selectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  emptyServices: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  emptyServicesText: { fontSize: 14, color: '#92400E' },
  emptyPlaces: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  emptyPlacesText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyPlacesSub: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  loader: { marginVertical: 10 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  specialtyChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  specialtyChipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  specialtyText: { fontSize: 12, color: '#4B5563' },
  specialtyTextActive: { color: '#FFF', fontWeight: '600' },
  certPicker: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  certPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  certPlaceholderText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: { backgroundColor: '#EEF2FF' },
  pickerItemText: { fontSize: 16, color: '#1F2937', flex: 1 },
  pickerItemTextSelected: { color: '#4F46E5', fontWeight: '600' },
  placeAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
