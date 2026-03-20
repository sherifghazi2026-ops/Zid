import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';

export default function EditMerchantScreen({ navigation, route }) {
  const { merchant } = route.params;

  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (merchant) {
      setName(merchant.name || merchant.full_name || '');
      setPhone(merchant.phone || '');
      setPlaceName(merchant.place_name || '');
      setDeliveryFee(String(merchant.delivery_fee || merchant.deliveryFee || '0'));
      setDeliveryTime(String(merchant.delivery_time || merchant.deliveryTime || '30'));
    }
  }, [merchant]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('تنبيه', 'الاسم ورقم الهاتف مطلوبان');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        full_name: name.trim(),
        phone: phone.trim(),
        delivery_fee: parseFloat(deliveryFee) || 0,
        delivery_time: parseInt(deliveryTime) || 30,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update(updates)
        .eq('id', merchant.id || merchant.$id);

      if (error) throw error;

      const updatedMerchant = {
        ...merchant,
        ...updates,
        delivery_fee: updates.delivery_fee,
        delivery_time: updates.delivery_time
      };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedMerchant));

      Alert.alert('✅ تم', 'تم تحديث البيانات بنجاح');
      navigation.goBack();
    } catch (error) {
      console.error('خطأ في التحديث:', error);
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل البيانات</Text>
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

          <Text style={styles.label}>اسم المكان (للعرض)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#F3F4F6' }]}
            value={placeName}
            editable={false}
            placeholder="يربط من شاشة الأماكن"
          />
          <Text style={styles.hint}>يمكن تغيير المكان من خلال الأدمن فقط</Text>

          <Text style={styles.label}>رسوم التوصيل (ج)</Text>
          <TextInput
            style={styles.input}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            keyboardType="numeric"
            placeholder="0"
          />

          <Text style={styles.label}>وقت التوصيل (دقائق)</Text>
          <TextInput
            style={styles.input}
            value={deliveryTime}
            onChangeText={setDeliveryTime}
            keyboardType="numeric"
            placeholder="30"
          />

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
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
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: -10,
    marginBottom: 10,
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
