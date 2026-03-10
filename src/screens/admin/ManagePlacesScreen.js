import React, { useState, useEffect } from 'react';
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
import { createPlace, getAllPlaces, deletePlace } from '../../services/placesService';
import { getAllServices } from '../../services/servicesService';

export default function ManagePlacesScreen({ navigation }) {
  const [places, setPlaces] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // جلب الأماكن
      const placesResult = await getAllPlaces();
      if (placesResult.success) {
        setPlaces(placesResult.data);
      }

      // جلب الخدمات اللي ليها أصناف
      const servicesResult = await getAllServices();
      if (servicesResult.success) {
        const servicesWithItems = servicesResult.data.filter(s => 
          s.hasItems || s.id === 'restaurant' || s.id === 'home_chef'
        );
        setServices(servicesWithItems);
      }
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddPlace = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'اسم المكان مطلوب');
      return;
    }

    if (!type) {
      Alert.alert('تنبيه', 'نوع النشاط مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createPlace({
        name: name.trim(),
        type,
        address: address.trim(),
        phone: phone.trim(),
      });

      if (result.success) {
        Alert.alert('✅ تم', 'تم إضافة المكان بنجاح');
        setModalVisible(false);
        resetForm();
        loadData();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlace = (place) => {
    if (place.merchantId && place.merchantId !== '') {
      Alert.alert('لا يمكن الحذف', 'هذا المكان مرتبط بتاجر حالياً');
      return;
    }

    Alert.alert(
      'حذف المكان',
      `هل أنت متأكد من حذف ${place.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePlace(place.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف المكان');
              loadData();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setName('');
    setType('');
    setAddress('');
    setPhone('');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
        <Text style={styles.headerTitle}>إدارة الأماكن</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={places}
        keyExtractor={item => item.$id}
        renderItem={({ item }) => (
          <View style={styles.placeCard}>
            <View style={styles.placeHeader}>
              <Text style={styles.placeName}>{item.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: item.type === 'restaurant' ? '#F59E0B20' : '#EF444420' }]}>
                <Text style={[styles.typeText, { color: item.type === 'restaurant' ? '#F59E0B' : '#EF4444' }]}>
                  {services.find(s => s.id === item.type)?.name || item.type}
                </Text>
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
              <View style={[styles.statusBadge, { backgroundColor: item.merchantId ? '#EF444420' : '#10B98120' }]}>
                <Text style={[styles.statusText, { color: item.merchantId ? '#EF4444' : '#10B981' }]}>
                  {item.merchantId ? 'مرتبط بتاجر' : 'متاح'}
                </Text>
              </View>

              {!item.merchantId && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePlace(item)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أماكن</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة مكان جديد</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>إضافة مكان جديد</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>اسم المكان <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="مثال: مخبز البلدي - فرع الشيخ زايد"
              />

              <Text style={styles.label}>نوع النشاط <Text style={styles.required}>*</Text></Text>
              <View style={styles.typesContainer}>
                {services.map(service => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.typeChip,
                      type === service.id && styles.typeChipActive
                    ]}
                    onPress={() => setType(service.id)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      type === service.id && styles.typeChipTextActive
                    ]}>{service.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>العنوان (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="العنوان بالتفصيل"
                multiline
              />

              <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="01234567890"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.addButton, submitting && styles.disabled]}
                onPress={handleAddPlace}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.addButtonText}>إضافة المكان</Text>
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
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },

  placeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 12, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1 },
  placeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  deleteButton: { padding: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: { paddingBottom: 20, paddingTop: 60 },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeChipText: { fontSize: 12, color: '#4B5563' },
  typeChipTextActive: { color: '#FFF', fontWeight: '600' },
  addButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
