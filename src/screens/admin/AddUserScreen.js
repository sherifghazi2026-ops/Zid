import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import BUSINESS_TYPES from '../../constants/businessTypes';

export default function AddUserScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('merchant');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [businessModalVisible, setBusinessModalVisible] = useState(false);
  const [serviceArea, setServiceArea] = useState('');
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('10');
  const [active, setActive] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAddUser = async () => {
    if (!name || !phone || !password) {
      Alert.alert('تنبيه', 'الرجاء إدخال جميع البيانات الأساسية');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('تنبيه', 'رقم الهاتف غير صحيح');
      return;
    }

    if (role === 'merchant' && !selectedBusiness) {
      Alert.alert('تنبيه', 'الرجاء اختيار نوع النشاط التجاري');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 التحقق من رقم الهاتف:', phone);
      
      const existing = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('phone', phone)]
      );

      if (existing.documents.length > 0) {
        Alert.alert('خطأ', 'رقم الهاتف موجود بالفعل');
        setLoading(false);
        return;
      }

      const userData = {
        name,
        phone,
        password,
        role,
        active,
        profileCompleted: false,
        createdAt: new Date().toISOString(),
      };

      if (role === 'merchant') {
        userData.merchantType = selectedBusiness.id;
      } 
      
      if (role === 'driver') {
        userData.merchantType = selectedBusiness ? selectedBusiness.id : 'delivery'; // ربط المندوب بنفس نوع النشاط
        userData.serviceArea = serviceArea || 'الشيخ زايد';
        userData.maxDeliveryRadius = parseFloat(maxDeliveryRadius) || 10;
        userData.isAvailable = isAvailable;
      }

      console.log('📤 إنشاء مستخدم جديد:', userData);

      const response = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        userData
      );

      console.log('✅ تم إنشاء المستخدم:', response.$id);

      Alert.alert(
        'تم بنجاح', 
        `تم إضافة ${role === 'merchant' ? 'التاجر' : 'المندوب'} بنجاح`,
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('❌ خطأ في إضافة المستخدم:', error);
      Alert.alert('خطأ', error.message || 'فشل في إضافة المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const renderBusinessItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.businessItem,
        selectedBusiness?.id === item.id && styles.selectedBusinessItem
      ]}
      onPress={() => {
        setSelectedBusiness(item);
        setBusinessModalVisible(false);
      }}
    >
      <Ionicons name={item.icon} size={24} color={item.color} />
      <View style={styles.businessInfo}>
        <Text style={styles.businessName}>{item.name}</Text>
        <Text style={styles.businessId}>{item.id}</Text>
      </View>
      {selectedBusiness?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إضافة مستخدم جديد</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="الاسم الكامل"
          />

          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="رقم الهاتف"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="كلمة المرور"
            secureTextEntry
          />

          <Text style={styles.label}>نوع المستخدم</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'merchant' && styles.roleButtonActive]}
              onPress={() => setRole('merchant')}
            >
              <Text style={[styles.roleText, role === 'merchant' && styles.roleTextActive]}>
                تاجر
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.roleButton, role === 'driver' && styles.roleButtonActive]}
              onPress={() => setRole('driver')}
            >
              <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>
                مندوب
              </Text>
            </TouchableOpacity>
          </View>

          {/* اختيار نوع النشاط - للتاجر والمندوب معاً */}
          <Text style={styles.label}>نوع النشاط</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setBusinessModalVisible(true)}
          >
            <Text style={selectedBusiness ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedBusiness ? selectedBusiness.name : 'اختر نوع النشاط'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {role === 'driver' && (
            <>
              <Text style={styles.label}>منطقة الخدمة (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={serviceArea}
                onChangeText={setServiceArea}
                placeholder="مثال: الشيخ زايد"
              />

              <Text style={styles.label}>أقصى مسافة توصيل (كم) - اختياري</Text>
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
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                />
              </View>
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.label}>الحساب نشط</Text>
            <Switch 
              value={active} 
              onValueChange={setActive}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.disabled]}
            onPress={handleAddUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.addButtonText}>إضافة المستخدم</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

      <Modal
        visible={businessModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر نوع النشاط</Text>
              <TouchableOpacity onPress={() => setBusinessModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={BUSINESS_TYPES}
              renderItem={renderBusinessItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.businessList}
            />
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
  content: { padding: 20 },
  form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  roleContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  roleButton: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleButtonActive: { 
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleText: { fontSize: 14, color: '#4B5563' },
  roleTextActive: { color: '#FFF', fontWeight: '600' },
  pickerButton: {
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
  pickerText: { fontSize: 14, color: '#1F2937' },
  pickerPlaceholder: { fontSize: 14, color: '#9CA3AF' },
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  businessList: { padding: 16 },
  businessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedBusinessItem: {
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  businessInfo: { flex: 1, marginLeft: 12 },
  businessName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  businessId: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
