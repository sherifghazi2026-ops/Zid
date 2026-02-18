import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'https://zayedid-production.up.railway.app';

// أسماء الخدمات بالعربي
const serviceNames = {
  winch: 'ونش',
  electrician: 'كهربائي',
  moving: 'نقل اثاث',
  marble: 'رخام',
  plumbing: 'سباكة',
  carpentry: 'نجارة',
  kitchen: 'مطابخ',
};

// أيقونات الخدمات
const serviceIcons = {
  winch: 'car',
  electrician: 'flash',
  moving: 'cube',
  marble: 'apps',
  plumbing: 'water',
  carpentry: 'hammer',
  kitchen: 'restaurant',
};

// ألوان الخدمات
const serviceColors = {
  winch: '#EF4444',
  electrician: '#F59E0B',
  moving: '#10B981',
  marble: '#EC4899',
  plumbing: '#3B82F6',
  carpentry: '#8B5CF6',
  kitchen: '#10B981',
};

export default function ServiceScreen({ route, navigation }) {
  const { serviceType } = route.params || { serviceType: 'winch' };
  const serviceName = serviceNames[serviceType] || 'خدمة';
  const iconName = serviceIcons[serviceType] || 'construct';
  const color = serviceColors[serviceType] || '#F59E0B';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('جنة 2');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    if (savedPhone) setPhoneNumber(savedPhone);
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedAddress) setAddress(savedAddress);
  };

  const sendOrder = async () => {
    if (!phoneNumber) return Alert.alert('تنبيه', 'أدخل رقم الموبايل');
    if (!description) return Alert.alert('تنبيه', 'اكتب وصف الطلب');

    setLoading(true);
    try {
      const orderData = {
        phone: phoneNumber,
        address: address,
        items: [description],
        rawText: description,
        serviceName: serviceName,
        isServiceRequest: true,
      };

      console.log(`📤 إرسال طلب ${serviceName}:`, orderData);

      const response = await fetch(`${SERVER_URL}/send-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);

        Alert.alert(
          '✅ تم بنجاح',
          'تم إرسال طلبك، سيتم التواصل معك خلال 24 ساعة',
          [{ text: 'ممتاز', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('⚠️', 'حدث خطأ في الإرسال');
      }
    } catch (e) {
      console.error('❌ خطأ:', e);
      Alert.alert('خطأ', 'فشل الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Ionicons name={iconName} size={40} color="#FFF" />
        <Text style={styles.headerTitle}>{serviceName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            هذا طلب خدمي. سيتم التواصل معك خلال 24 ساعة لتحديد موعد الزيارة.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="call" size={20} color={color} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="رقم الموبايل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="location" size={20} color={color} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.textAreaContainer}>
          <Text style={[styles.label, { color }]}>📝 وصف الطلب</Text>
          <TextInput
            style={styles.textArea}
            placeholder="اكتب تفاصيل الطلب هنا..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: color }]}
          onPress={sendOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>إرسال الطلب</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    gap: 10,
  },
  backButton: { marginRight: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', flex: 1 },
  content: { padding: 20 },
  infoCard: {
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 14, color: '#1F2937' },
  textAreaContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
