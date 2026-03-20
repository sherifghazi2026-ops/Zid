import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createPlace, getAllPlaces, deletePlace, updatePlace } from '../../services/placesService';
import { getAllServices } from '../../services/servicesService';

export default function ManagePlacesScreen({ navigation }) {
  const [places, setPlaces] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  const isMounted = useRef(true);

  // فورم الإضافة والتعديل
  const [editingPlace, setEditingPlace] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [typeName, setTypeName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => { isMounted.current = false; };
  }, []);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);

      const [placesRes, servicesRes] = await Promise.all([
        getAllPlaces(),
        getAllServices()
      ]);

      if (!isMounted.current) return;

      if (placesRes.success) setPlaces(placesRes.data);
      if (servicesRes.success) {
        // تصفية الخدمات النشطة والمرئية فقط
        const activeServices = servicesRes.data.filter(s => s.is_active === true && s.is_visible === true);
        const sortedServices = activeServices.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        setServices(sortedServices);
      }
    } catch (error) {
      console.error("Load Error:", error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleSavePlace = async () => {
    if (!name.trim() || !type) {
      Alert.alert('تنبيه', 'برجاء ملء البيانات الأساسية');
      return;
    }

    setSubmitting(true);
    try {
      const placeData = {
        name: name.trim(),
        type,
        address: address.trim(),
        phone: phone.trim()
      };

      let res;
      if (editingPlace) {
        res = await updatePlace(editingPlace.$id || editingPlace.id, placeData);
      } else {
        res = await createPlace(placeData);
      }

      if (res.success) {
        setModalVisible(false);
        resetForm();
        loadData();
        Alert.alert('✅ تم', editingPlace ? 'تم تحديث المكان بنجاح' : 'تم إضافة المكان بنجاح');
      } else {
        Alert.alert('خطأ', res.error);
      }
    } catch (e) {
      Alert.alert('خطأ', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingPlace(null);
    setName('');
    setType('');
    setTypeName('');
    setAddress('');
    setPhone('');
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (place) => {
    setEditingPlace(place);
    setName(place.name || '');
    setType(place.type || '');
    const service = services.find(s => s.id === place.type);
    setTypeName(service ? service.name : place.type);
    setAddress(place.address || '');
    setPhone(place.phone || '');
    setModalVisible(true);
  };

  const selectService = (service) => {
    setType(service.id);
    setTypeName(service.name);
    setTypeModalVisible(false);
  };

  const handleDelete = (id, name) => {
    Alert.alert('حذف', `متأكد من حذف ${name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const res = await deletePlace(id);
        if (res.success) {
          loadData();
          Alert.alert('تم', 'تم حذف المكان');
        } else {
          Alert.alert('خطأ', res.error);
        }
      }}
    ]);
  };

  const getServiceColor = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service?.color || '#EF4444';
  };

  const renderPlace = ({ item }) => {
    const serviceName = services.find(s => s.id === item.type)?.name || item.type;
    const serviceColor = getServiceColor(item.type);

    return (
      <View style={styles.placeCard}>
        <View style={styles.placeHeader}>
          <Text style={styles.placeName}>{item.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: serviceColor + '20' }]}>
            <Text style={[styles.typeText, { color: serviceColor }]}>{serviceName}</Text>
          </View>
        </View>

        {item.address ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>
        ) : null}

        {item.phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
        ) : null}

        <View style={styles.placeFooter}>
          <View style={[styles.statusBadge, { backgroundColor: item.merchant_id ? '#EF444420' : '#10B98120' }]}>
            <Text style={[styles.statusText, { color: item.merchant_id ? '#EF4444' : '#10B981' }]}>
              {item.merchant_id ? 'مرتبط بتاجر' : 'متاح'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <TouchableOpacity onPress={() => openEditModal(item)}>
              <Ionicons name="create-outline" size={22} color="#4F46E5" />
            </TouchableOpacity>

            {!item.merchant_id && (
              <TouchableOpacity onPress={() => handleDelete(item.$id || item.id, item.name)}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
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
        <Text style={styles.headerTitle}>إدارة الأماكن</Text>
        <TouchableOpacity onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={places}
        keyExtractor={item => item.$id || item.id}
        renderItem={renderPlace}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أماكن</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة مكان جديد</Text>
          </View>
        }
      />

      {/* Modal إضافة/تعديل مكان جديد */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingPlace ? 'تعديل المكان' : 'إضافة مكان جديد'}</Text>

              <Text style={styles.label}>اسم المكان *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: مخبز البلدي"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>نوع النشاط *</Text>
              <TouchableOpacity
                style={styles.typeSelector}
                onPress={() => setTypeModalVisible(true)}
              >
                <Text style={type ? styles.typeSelectorText : styles.typeSelectorPlaceholder}>
                  {typeName || '-- اختر نوع النشاط --'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.label}>العنوان (اختياري)</Text>
              <TextInput
                style={styles.input}
                placeholder="العنوان بالتفصيل"
                value={address}
                onChangeText={setAddress}
                multiline
              />

              <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
              <TextInput
                style={styles.input}
                placeholder="01234567890"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.addButton, submitting && styles.disabled]}
                onPress={handleSavePlace}
                disabled={submitting}
              >
                {submitting ?
                  <ActivityIndicator color="#FFF" /> :
                  <Text style={styles.addButtonText}>{editingPlace ? 'حفظ التعديلات' : 'إضافة المكان'}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal اختيار نوع النشاط (من الخدمات التي أضافها الأدمن) */}
      <Modal visible={typeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.typeModalContent}>
            <View style={styles.typeModalHeader}>
              <Text style={styles.typeModalTitle}>اختر نوع النشاط</Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {services.length === 0 ? (
                <View style={styles.emptyServices}>
                  <Ionicons name="alert-circle-outline" size={40} color="#F59E0B" />
                  <Text style={styles.emptyServicesText}>لا توجد خدمات متاحة</Text>
                  <Text style={styles.emptyServicesSub}>أضف خدمات أولاً من شاشة إدارة الخدمات</Text>
                </View>
              ) : (
                services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceItem}
                    onPress={() => selectService(service)}
                  >
                    <View style={[styles.serviceIcon, { backgroundColor: (service.color || '#4F46E5') + '20' }]}>
                      <Ionicons name={service.icon || 'apps-outline'} size={20} color={service.color || '#4F46E5'} />
                    </View>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {type === service.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" style={styles.serviceCheck} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },

  placeCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  placeName: { fontWeight: '600', fontSize: 16, color: '#1F2937', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1 },
  placeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalScrollContent: { paddingBottom: 20, paddingTop: 60 },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  typeSelectorText: { fontSize: 14, color: '#1F2937' },
  typeSelectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  addButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  disabled: { opacity: 0.6 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 10, alignItems: 'center' },
  cancelButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },

  // Modal اختيار الخدمة
  typeModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  typeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  typeModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceName: { fontSize: 16, color: '#1F2937', flex: 1 },
  serviceCheck: { marginLeft: 8 },
  emptyServices: {
    alignItems: 'center',
    padding: 30,
  },
  emptyServicesText: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 8,
  },
  emptyServicesSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});
