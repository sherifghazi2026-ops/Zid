import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOrder, SERVICE_TYPES } from '../../services/orderService';
import { playSendSound } from '../../utils/SoundHelper';

export default function RestaurantOrderScreen({ navigation, route }) {
  const { restaurantId, restaurantName, selectedItems } = route.params || {};
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  // حساب الإجمالي (مؤقت)
  const totalPrice = selectedItems?.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) || 0;

  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم الموبايل');
      return;
    }
    if (!address.trim()) {
      Alert.alert('تنبيه', 'أدخل العنوان');
      return;
    }

    setSending(true);
    try {
      // تحويل الأصناف المختارة إلى نص
      const itemsList = selectedItems?.map(item => 
        `${item.name} x${item.quantity || 1} - ${item.price * (item.quantity || 1)} ج`
      ) || [];

      const orderData = {
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: SERVICE_TYPES.RESTAURANT,
        serviceName: `طلب من ${restaurantName}`,
        items: itemsList,
        rawText: `طلب من مطعم ${restaurantName}`,
        totalPrice: totalPrice,
        notes: notes,
        // merchantId: restaurantId, // ربط بالتاجر
      };

      const result = await createOrder(orderData);
      
      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await playSendSound();
        Alert.alert(
          '✅ تم إرسال طلبك',
          'سيتم التواصل معك قريباً',
          [{ text: 'حسناً', onPress: () => navigation.popToTop() }]
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال الطلب');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تأكيد الطلب</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>

        {selectedItems && selectedItems.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>الأصناف المختارة</Text>
            {selectedItems.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>x{item.quantity || 1}</Text>
                <Text style={styles.itemPrice}>{item.price * (item.quantity || 1)} ج</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>الإجمالي</Text>
              <Text style={styles.totalPrice}>{totalPrice} ج</Text>
            </View>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.label}>رقم الموبايل</Text>
          <TextInput
            style={styles.input}
            placeholder="01xxxxxxxxx"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!sending}
          />

          <Text style={styles.label}>عنوان التوصيل</Text>
          <TextInput
            style={styles.input}
            placeholder="العنوان بالتفصيل"
            value={address}
            onChangeText={setAddress}
            editable={!sending}
          />

          <Text style={styles.label}>ملاحظات (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="أي ملاحظات إضافية..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={!sending}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.disabled]}
          onPress={sendOrder}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>تأكيد الطلب</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  restaurantInfo: { marginBottom: 20 },
  restaurantName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', textAlign: 'center' },
  itemsSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 14, color: '#1F2937', flex: 2 },
  itemQuantity: { fontSize: 14, color: '#6B7280', width: 50, textAlign: 'center' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', width: 70, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  totalText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  formSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16 },
  sendButton: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
