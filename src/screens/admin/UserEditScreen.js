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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';

export default function UserEditScreen({ navigation, route }) {
  const { userId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);

  // حقول التعديل الأساسية
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [merchantType, setMerchantType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(''); // ✅ للمكوجي فقط

  useEffect(() => {
    loadUserData();
  }, []);

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
      setDeliveryFee(user.deliveryFee?.toString() || '');
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
        name,
        phone,
        active: isActive,
      };

      // إذا كان تاجر
      if (role === 'merchant') {
        updateData.merchantType = merchantType;
        
        // ✅ إضافة رسوم التوصيل إذا كانت موجودة
        if (deliveryFee) {
          updateData.deliveryFee = parseFloat(deliveryFee);
        }
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

          {role === 'merchant' && merchantType === 'laundry' && (
            <>
              <Text style={styles.label}>نوع النشاط: مكوجي</Text>
              <Text style={styles.label}>رسوم التوصيل (جنيه)</Text>
              <TextInput
                style={styles.input}
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                placeholder="مثال: 15"
                keyboardType="numeric"
              />
            </>
          )}

          {role === 'merchant' && merchantType && merchantType !== 'laundry' && (
            <Text style={styles.label}>نوع النشاط: {merchantType}</Text>
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
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
