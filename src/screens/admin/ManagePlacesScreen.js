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
import { createPlace, getAllPlaces, deletePlace } from '../../services/placesService';
import { getAllServices } from '../../services/servicesService';

export default function ManagePlacesScreen({ navigation }) {
  const [places, setPlaces] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // لضمان عدم تحديث الـ State بعد قفل الصفحة
  const isMounted = useRef(true);

  // فورم الإضافة
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // 1. تحميل البيانات مرة واحدة عند الفتح
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
        // تصفية الخدمات المهمة فقط
        const filtered = servicesRes.data.filter(s => 
          s.hasItems || s.id === 'restaurant' || s.id === 'home_chef'
        );
        setServices(filtered);
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

  const handleAddPlace = async () => {
    if (!name.trim() || !type) {
      Alert.alert('تنبيه', 'برجاء ملء البيانات الأساسية');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await createPlace({ 
        name: name.trim(), 
        type, 
        address: address.trim(), 
        phone: phone.trim() 
      });
      
      if (res.success) {
        setModalVisible(false);
        setName(''); setType(''); setAddress(''); setPhone('');
        loadData();
        Alert.alert('✅ تم', 'تم إضافة المكان بنجاح');
      }
    } catch (e) { 
      Alert.alert('خطأ', e.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('حذف', `متأكد من حذف ${name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const res = await deletePlace(id);
        if (res.success) {
          loadData();
          Alert.alert('تم', 'تم حذف المكان');
        }
      }}
    ]);
  };

  const renderPlace = ({ item }) => {
    const serviceName = services.find(s => s.id === item.type)?.name || item.type;
    const isRestaurant = item.type === 'restaurant';
    const badgeColor = isRestaurant ? '#F59E0B20' : '#EF444420';
    const textColor = isRestaurant ? '#F59E0B' : '#EF4444';

    return (
      <View style={styles.placeCard}>
        <View style={styles.placeHeader}>
          <Text style={styles.placeName}>{item.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.typeText, { color: textColor }]}>{serviceName}</Text>
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
            <TouchableOpacity onPress={() => handleDelete(item.$id, item.name)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
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
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={places}
        keyExtractor={item => item.$id}
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة مكان جديد</Text>
              
              <Text style={styles.label}>اسم المكان *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="مثال: مخبز البلدي" 
                value={name} 
                onChangeText={setName} 
              />

              <Text style={styles.label}>نوع النشاط *</Text>
              <View style={styles.typesContainer}>
                {services.map(s => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[styles.typeChip, type === s.id && styles.typeChipActive]}
                    onPress={() => setType(s.id)}
                  >
                    <Text style={[styles.typeChipText, type === s.id && styles.typeChipTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                onPress={handleAddPlace} 
                disabled={submitting}
              >
                {submitting ? 
                  <ActivityIndicator color="#FFF" /> : 
                  <Text style={styles.addButtonText}>إضافة المكان</Text>
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
  typesContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    marginBottom: 10 
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
    marginTop: 20 
  },
  disabled: { opacity: 0.6 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 10, alignItems: 'center' },
  cancelButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
