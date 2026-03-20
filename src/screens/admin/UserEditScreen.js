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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { getAllServices } from '../../services/servicesService';

const MERCHANT_TYPES = [
  { label: 'مطاعم', value: 'restaurant' },
  { label: 'شيف منزلي', value: 'home_chef' },
  { label: 'سوبر ماركت', value: 'supermarket' },
  { label: 'صيدلية', value: 'pharmacy' },
  { label: 'مغسلة', value: 'laundry' },
  { label: 'مخبز', value: 'bakery' },
  { label: 'مشروبات', value: 'drinks' },
  { label: 'منتجات ألبان', value: 'milk' },
  { label: 'كهربائي', value: 'electrician' },
  { label: 'سباك', value: 'plumber' },
  { label: 'نجار', value: 'carpenter' },
];

const SPECIALTIES = ['مصري', 'إيطالي', 'صيني', 'هندي', 'مشاوي', 'حلويات', 'مأكولات بحرية', 'صحية', 'نباتي'];

export default function UserEditScreen({ navigation, route }) {
  const { userId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [services, setServices] = useState([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [merchantType, setMerchantType] = useState('');
  const [is_active, setIsActive] = useState(true);
  const [showMerchantTypePicker, setShowMerchantTypePicker] = useState(false);

  const [serviceArea, setServiceArea] = useState('');
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('10');
  const [isAvailable, setIsAvailable] = useState(true);

  const [specialties, setSpecialties] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [deliveryRadius, setDeliveryRadius] = useState('10');
  const [healthCertUrl, setHealthCertUrl] = useState('');

  useEffect(() => {
    loadUserData();
    loadServices();
  }, []);

  const loadServices = async () => {
    const result = await getAllServices();
    if (result.success) setServices(result.data);
  };

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserData(data);
      setName(data.full_name || data.name || '');
      setPhone(data.phone || '');
      setRole(data.role || '');
      setMerchantType(data.merchant_type || '');
      setIsActive(data.active !== false);

      if (data.merchant_type === 'home_chef') {
        setSpecialties(data.specialties || []);
        setDeliveryFee(String(data.delivery_fee || '0'));
        setDeliveryRadius(String(data.delivery_radius || '10'));
        setHealthCertUrl(data.health_cert_url || '');
      }

      if (data.role === 'driver') {
        setServiceArea(data.service_area || '');
        setMaxDeliveryRadius(String(data.max_delivery_radius || '10'));
        setIsAvailable(data.is_available !== false);
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
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
        full_name: name,
        phone,
        active: is_active,
        updated_at: new Date().toISOString(),
      };

      if (role === 'merchant') {
        updateData.merchant_type = merchantType;
        if (merchantType === 'home_chef') {
          updateData.specialties = specialties;
          updateData.delivery_fee = parseFloat(deliveryFee);
          updateData.delivery_radius = parseFloat(deliveryRadius);
          updateData.health_cert_url = healthCertUrl;
        }
      }

      if (role === 'driver') {
        updateData.service_area = serviceArea;
        updateData.max_delivery_radius = parseFloat(maxDeliveryRadius);
        updateData.is_available = isAvailable;
      }

      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('✅ تم', 'تم تحديث بيانات المستخدم بنجاح', [{ text: 'حسناً', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('خطأ في تحديث المستخدم:', error);
      Alert.alert('خطأ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialty = (specialty) => {
    if (specialties.includes(specialty)) {
      setSpecialties(specialties.filter(s => s !== specialty));
    } else {
      setSpecialties([...specialties, specialty]);
    }
  };

  const renderMerchantTypePicker = () => (
    <Modal visible={showMerchantTypePicker} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>اختر نوع النشاط</Text>
            <TouchableOpacity onPress={() => setShowMerchantTypePicker(false)}><Ionicons name="close" size={24} color="#EF4444" /></TouchableOpacity>
          </View>
          <FlatList
            data={MERCHANT_TYPES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, merchantType === item.value && styles.pickerItemSelected]} onPress={() => { setMerchantType(item.value); setShowMerchantTypePicker(false); }}>
                <Text style={[styles.pickerItemText, merchantType === item.value && styles.pickerItemTextSelected]}>{item.label}</Text>
                {merchantType === item.value && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={28} color="#1F2937" /></TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل المستخدم</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>الاسم الكامل</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="الاسم" />

          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="01xxxxxxxxx" keyboardType="phone-pad" />

          <View style={styles.infoRow}>
            <Text style={styles.label}>الدور: </Text>
            <Text style={styles.roleText}>{role === 'merchant' ? 'تاجر' : role === 'driver' ? 'مندوب' : role === 'admin' ? 'أدمن' : 'عميل'}</Text>
          </View>

          {role === 'merchant' && (
            <>
              <Text style={styles.label}>نوع النشاط التجاري</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowMerchantTypePicker(true)}>
                <Text style={merchantType ? styles.selectorText : styles.selectorPlaceholder}>
                  {MERCHANT_TYPES.find(t => t.value === merchantType)?.label || '-- اختر النشاط --'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>

              {merchantType === 'home_chef' && (
                <>
                  <Text style={styles.label}>التخصصات</Text>
                  <View style={styles.specialtiesContainer}>
                    {SPECIALTIES.map((item) => (
                      <TouchableOpacity key={item} style={[styles.specialtyChip, specialties.includes(item) && styles.specialtyChipActive]} onPress={() => toggleSpecialty(item)}>
                        <Text style={[styles.specialtyText, specialties.includes(item) && styles.specialtyTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.row}>
                    <View style={styles.half}><Text style={styles.label}>رسوم التوصيل (ج)</Text><TextInput style={styles.input} value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="numeric" placeholder="0" /></View>
                    <View style={styles.half}><Text style={styles.label}>نطاق التوصيل (كم)</Text><TextInput style={styles.input} value={deliveryRadius} onChangeText={setDeliveryRadius} keyboardType="numeric" placeholder="10" /></View>
                  </View>
                </>
              )}
            </>
          )}

          {role === 'driver' && (
            <>
              <Text style={styles.label}>منطقة الخدمة</Text>
              <TextInput style={styles.input} value={serviceArea} onChangeText={setServiceArea} placeholder="مثال: الشيخ زايد" />
              <Text style={styles.label}>أقصى مسافة توصيل (كم)</Text>
              <TextInput style={styles.input} value={maxDeliveryRadius} onChangeText={setMaxDeliveryRadius} keyboardType="numeric" placeholder="10" />
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.label}>الحساب نشط</Text>
            <Switch value={is_active} onValueChange={setIsActive} trackColor={{ false: '#E5E7EB', true: '#4F46E5' }} />
          </View>

          {role === 'driver' && (
            <View style={styles.switchContainer}>
              <Text style={styles.label}>متاح للتوصيل</Text>
              <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: '#E5E7EB', true: '#4F46E5' }} />
            </View>
          )}

          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>حفظ التغييرات</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderMerchantTypePicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20 },
  form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingVertical: 5 },
  roleText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 15 },
  selectorText: { fontSize: 14, color: '#1F2937', flex: 1, marginLeft: 8 },
  selectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  saveButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerItemSelected: { backgroundColor: '#EEF2FF' },
  pickerItemText: { fontSize: 16, color: '#1F2937' },
  pickerItemTextSelected: { color: '#4F46E5', fontWeight: '600' },
  specialtiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  specialtyChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  specialtyChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  specialtyText: { fontSize: 12, color: '#4B5563' },
  specialtyTextActive: { color: '#FFF', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
