import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { createOrder } from '../services/orderService';
import { playSendSound } from '../utils/SoundHelper';

const LAUNDRY_ITEMS_TABLE = 'laundry_items';

export default function IroningScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('20');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadItems();
    loadSavedData();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from(LAUNDRY_ITEMS_TABLE)
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setItems(data || []);
      const initialQtys = {};
      (data || []).forEach(item => {
        initialQtys[item.id] = { iron: 0, clean: 0 };
      });
      setQuantities(initialQtys);
    } catch (error) {
      console.error('خطأ في تحميل الأصناف:', error);
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setPhone(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  };

  const updateQty = (itemId, type, delta) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: Math.max(0, (prev[itemId]?.[type] || 0) + delta)
      }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      const qty = quantities[item.id] || { iron: 0, clean: 0 };
      total += (qty.iron * (item.iron_price || 0)) + (qty.clean * (item.clean_price || 0));
    });
    return total;
  };

  const getTotalWithDelivery = () => {
    return calculateTotal() + parseFloat(deliveryFee || 0);
  };

  const sendOrder = async () => {
    if (!phone.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم الموبايل');
      return;
    }
    if (!address.trim()) {
      Alert.alert('تنبيه', 'أدخل العنوان');
      return;
    }

    const totalPrice = calculateTotal();
    if (totalPrice === 0) {
      Alert.alert('تنبيه', 'اختر منتجات أولاً');
      return;
    }

    setSending(true);

    try {
      const itemsList = [];
      items.forEach(item => {
        const qty = quantities[item.id] || { iron: 0, clean: 0 };
        if (qty.iron > 0) itemsList.push(`${item.name} (كي فقط) x${qty.iron} = ${qty.iron * (item.iron_price || 0)}ج`);
        if (qty.clean > 0) itemsList.push(`${item.name} (غسيل وكوي) x${qty.clean} = ${qty.clean * (item.clean_price || 0)}ج`);
      });

      const finalDeliveryFee = parseFloat(deliveryFee || 0);
      const finalTotal = totalPrice + finalDeliveryFee;

      const orderData = {
        customer_phone: phone,
        customer_address: address,
        service_type: 'laundry',
        service_name: 'مكوجي',
        items: itemsList,
        total_price: totalPrice,
        delivery_fee: finalDeliveryFee,
        final_total: finalTotal,
        notes: notes,
        payment_method: 'cash_on_delivery',
        status: 'pending',
      };

      const result = await createOrder(orderData);

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phone);
        await AsyncStorage.setItem('zayed_address', address);
        await playSendSound();

        Alert.alert(
          '✅ تم إرسال طلبك',
          `تم إرسال طلبك إلى المكوجي\nالإجمالي: ${finalTotal} ج`,
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );

        setQuantities({});
        setNotes('');
      } else {
        Alert.alert('خطأ', result.error || 'فشل في إرسال الطلب');
      }
    } catch (error) {
      console.error('خطأ في الإرسال:', error);
      Alert.alert('خطأ', 'فشل في إرسال الطلب');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مكوجي</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* بيانات العميل */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بيانات العميل</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#4F46E5" />
            <TextInput
              style={styles.input}
              placeholder="رقم الموبايل"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!sending}
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#EF4444" />
            <TextInput
              style={styles.input}
              placeholder="العنوان"
              value={address}
              onChangeText={setAddress}
              editable={!sending}
            />
          </View>
        </View>

        {/* الأصناف */}
        <Text style={styles.sectionTitle}>👕 الأصناف</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              {item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              )}
              <Text style={styles.itemName}>{item.name}</Text>
            </View>

            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>كي فقط ({item.iron_price || 0}ج)</Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => updateQty(item.id, 'iron', -1)}
                  style={styles.counterBtn}
                  disabled={sending}
                >
                  <Ionicons name="remove" size={16} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>
                  {quantities[item.id]?.iron || 0}
                </Text>
                <TouchableOpacity
                  onPress={() => updateQty(item.id, 'iron', 1)}
                  style={[styles.counterBtn, styles.plusBtn]}
                  disabled={sending}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>غسيل وكوي ({item.clean_price || 0}ج)</Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => updateQty(item.id, 'clean', -1)}
                  style={styles.counterBtn}
                  disabled={sending}
                >
                  <Ionicons name="remove" size={16} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>
                  {quantities[item.id]?.clean || 0}
                </Text>
                <TouchableOpacity
                  onPress={() => updateQty(item.id, 'clean', 1)}
                  style={[styles.counterBtn, styles.plusBtn]}
                  disabled={sending}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* ملاحظات */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 ملاحظات إضافية</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="أي ملاحظات..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!sending}
          />
        </View>

        {/* الفاتورة */}
        <View style={styles.invoiceCard}>
          <Text style={styles.sectionTitle}>💰 الفاتورة</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>إجمالي الأصناف:</Text>
            <Text style={styles.invoiceValue}>{calculateTotal()} ج</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>رسوم التوصيل:</Text>
            <TextInput
              style={styles.deliveryInput}
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              keyboardType="numeric"
              editable={!sending}
            />
            <Text style={styles.invoiceValue}>ج</Text>
          </View>
          <View style={styles.invoiceTotal}>
            <Text style={styles.totalLabel}>الإجمالي:</Text>
            <Text style={styles.totalValue}>{getTotalWithDelivery()} ج</Text>
          </View>
        </View>

        {/* زر الإرسال */}
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.disabled]}
          onPress={sendOrder}
          disabled={sending}
        >
          {sending ? (
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemImage: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  serviceLabel: { fontSize: 14, color: '#4B5563' },
  counter: { flexDirection: 'row', alignItems: 'center' },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  plusBtn: { backgroundColor: '#10B981' },
  counterValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', minWidth: 20, textAlign: 'center' },
  invoiceCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLabel: { fontSize: 14, color: '#92400E' },
  invoiceValue: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  deliveryInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    width: 70,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  invoiceTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F59E0B',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  sendButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
