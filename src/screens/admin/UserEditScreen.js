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
import { databases, DATABASE_ID } from '../../appwrite/config';
import { ID, Query } from 'appwrite';

// قائمة أنواع النشاط التجاري
const MERCHANT_TYPES = [
  { label: 'مطاعم', value: 'restaurants' },
  { label: 'سوبر ماركت', value: 'supermarket' },
  { label: 'صيدلية', value: 'pharmacy' },
  { label: 'مغسلة', value: 'laundry' },
  { label: 'كهربائي', value: 'electrician' },
  { label: 'سباك', value: 'plumber' },
  { label: 'نجار', value: 'carpenter' },
];

// قائمة أماكن كل نوع نشاط
const PLACE_TYPES = {
  restaurants: { collection: 'restaurants', label: 'مطعم', icon: 'restaurant-outline' },
  supermarket: { collection: 'supermarkets', label: 'سوبر ماركت', icon: 'cart-outline' },
  pharmacy: { collection: 'pharmacies', label: 'صيدلية', icon: 'medical-outline' },
  laundry: { collection: 'laundries', label: 'مغسلة', icon: 'water-outline' },
  electrician: { collection: 'electricians', label: 'كهربائي', icon: 'flash-outline' },
  plumber: { collection: 'plumbers', label: 'سباك', icon: 'water-outline' },
  carpenter: { collection: 'carpenters', label: 'نجار', icon: 'hammer-outline' },
};

export default function UserEditScreen({ navigation, route }) {
  const { userId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // حقول التعديل
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [merchantType, setMerchantType] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // ربط المكان
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  
  // حقول المندوب
  const [serviceArea, setServiceArea] = useState('');
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('10');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (merchantType) {
      loadPlaces(merchantType);
    }
  }, [merchantType]);

  const loadUserData = async () => {
    try {
      const user = await databases.getDocument(
        DATABASE_ID,
        'users',
        userId
      );
      
      setUserData(user);
      setName(user.name || '');
      setPhone(user.phone || '');
      setRole(user.role || '');
      setMerchantType(user.merchantType || '');
      setIsActive(user.active !== false);
      
      // تحميل المكان المرتبط إذا وجد
      if (user.placeId) {
        setSelectedPlace({
          $id: user.placeId,
          name: user.placeName || '',
        });
      }
      
      // حقول المندوب
      if (user.role === 'driver') {
        setServiceArea(user.serviceArea || '');
        setMaxDeliveryRadius(String(user.maxDeliveryRadius || '10'));
        setIsAvailable(user.isAvailable !== false);
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaces = async (type) => {
    const placeInfo = PLACE_TYPES[type];
    if (!placeInfo) return;
    
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        placeInfo.collection,
        [Query.equal('isActive', true)]
      );
      setPlaces(response.documents);
    } catch (error) {
      console.error(`خطأ في جلب ${placeInfo.label}:`, error);
    }
  };

  const handleSave = async () => {
    if (!name || !phone) {
      Alert.alert('تنبيه', 'الاسم ورقم الهاتف مطلوبان');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name,
        phone,
        active: isActive,
      };

      // إذا كان تاجر، نضيف نوع النشاط
      if (role === 'merchant') {
        updateData.merchantType = merchantType;
        
        // إذا اختار مكان، نضيف بياناته
        if (selectedPlace) {
          updateData.placeId = selectedPlace.$id;
          updateData.placeName = selectedPlace?.name;
        } else {
          // إذا ألغى الربط، نمسح البيانات القديمة
          updateData.placeId = null;
          updateData.placeName = null;
        }
      }

      // إذا كان مندوب، نضيف البيانات الخاصة
      if (role === 'driver') {
        updateData.serviceArea = serviceArea;
        updateData.maxDeliveryRadius = parseFloat(maxDeliveryRadius);
        updateData.isAvailable = isAvailable;
      }

      await databases.updateDocument(
        DATABASE_ID,
        'users',
        userId,
        updateData
      );

      Alert.alert('✅ تم', 'تم تحديث بيانات المستخدم بنجاح', [
        { text: 'حسناً', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('خطأ في تحديث المستخدم:', error);
      Alert.alert('خطأ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderPlacePicker = () => {
    if (!merchantType || role !== 'merchant') return null;
    
    const placeInfo = PLACE_TYPES[merchantType];
    if (!placeInfo) return null;

    return (
      <>
        <Text style={styles.label}>ربط بـ {placeInfo.label}</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowPlacePicker(true)}
        >
          {selectedPlace ? (
            <View style={styles.selectedPlace}>
              <Ionicons name={placeInfo.icon} size={20} color="#4F46E5" />
              <Text style={styles.selectorText}>{selectedPlace?.name}</Text>
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>-- اختر {placeInfo.label} --</Text>
          )}
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>

        {selectedPlace && (
          <TouchableOpacity
            style={styles.unlinkButton}
            onPress={() => setSelectedPlace(null)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.unlinkText}>إلغاء الربط</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderPlacePickerModal = () => (
    <Modal visible={showPlacePicker} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              اختر {PLACE_TYPES[merchantType]?.label}
            </Text>
            <TouchableOpacity onPress={() => setShowPlacePicker(false)}>
              <Ionicons name="close" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {places.length === 0 ? (
            <View style={styles.emptyPlaces}>
              <Ionicons name="alert-circle-outline" size={50} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد {PLACE_TYPES[merchantType]?.label} متاحة</Text>
            </View>
          ) : (
            <FlatList
              data={places}
              keyExtractor={(item) => item.$id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.placeItem,
                    selectedPlace?.$id === item.$id && styles.placeItemSelected
                  ]}
                  onPress={() => {
                    setSelectedPlace(item);
                    setShowPlacePicker(false);
                  }}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.placeImage} />
                  ) : (
                    <View style={[styles.placeImage, styles.placeholderImage]}>
                      <Ionicons name={PLACE_TYPES[merchantType]?.icon} size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.placeInfo}>
<Text style={styles.placeName}>{item?.name}</Text>
                    {item.address && (
                      <Text style={styles.placeAddress}>{item.address}</Text>
                    )}
                  </View>
                  {selectedPlace?.$id === item.$id && (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

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
        <Text style={styles.headerTitle}>تعديل المستخدم</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          {/* حقول أساسية */}
          <Text style={styles.label}>الاسم الكامل</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="الاسم"
          />

          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="01xxxxxxxxx"
            keyboardType="phone-pad"
          />

          <View style={styles.infoRow}>
            <Text style={styles.label}>الدور: </Text>
            <Text style={styles.roleText}>
              {role === 'merchant' ? 'تاجر' : 
               role === 'driver' ? 'مندوب' : 
               role === 'admin' ? 'أدمن' : 'عميل'}
            </Text>
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>الحساب نشط</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          {/* حقول التاجر */}
          {role === 'merchant' && (
            <>
              <Text style={styles.label}>نوع النشاط التجاري</Text>
              <View style={styles.merchantTypeContainer}>
                {MERCHANT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.merchantTypeChip,
                      merchantType === type.value && styles.merchantTypeChipActive
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

              {/* ربط المكان */}
              {renderPlacePicker()}
            </>
          )}

          {/* حقول المندوب */}
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

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderPlacePickerModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  roleText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    marginBottom: 8,
  },
  selectorText: { fontSize: 14, color: '#1F2937', marginLeft: 8 },
  selectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  selectedPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 15,
    gap: 4,
  },
  unlinkText: { fontSize: 12, color: '#EF4444' },
  merchantTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  merchantTypeChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  merchantTypeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  merchantTypeText: { fontSize: 12, color: '#4B5563' },
  merchantTypeTextActive: { color: '#FFF', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Modal
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
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  placeItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  placeImage: { width: 40, height: 40, borderRadius: 8 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  placeInfo: { flex: 1 },
  placeName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  placeAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  emptyPlaces: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
});
