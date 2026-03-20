import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../../context/CartContext';
import { createOrder } from '../../services/orderService';
import { playSendSound } from '../../utils/SoundHelper';

export default function CartScreen({ navigation }) {
  const { cartItems, currentMerchant, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();

  const [userData, setUserData] = useState(null);
  const [notes, setNotes] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadUserData(); loadSavedData(); }, [cartItems]);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) setUserData(JSON.parse(data));
  };

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setPhoneNumber(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  };

  const saveData = async () => {
    if (phoneNumber) await AsyncStorage.setItem('zayed_phone', phoneNumber);
    if (address) await AsyncStorage.setItem('zayed_address', address);
  };

  const getTotalWithDelivery = () => getTotalPrice() + (currentMerchant?.delivery_fee || 10);

  const sendOrder = async () => {
    if (cartItems.length === 0) { Alert.alert('تنبيه', 'السلة فارغة'); return; }
    if (!phoneNumber.trim()) { Alert.alert('تنبيه', 'أدخل رقم الموبايل'); return; }
    if (!address.trim()) { Alert.alert('تنبيه', 'أدخل العنوان'); return; }
    setSending(true);
    try {
      const itemsList = cartItems.map(i => `${i.name} x${i.quantity || 1} = ${i.price * (i.quantity || 1)} ج`);
      const subtotal = getTotalPrice();
      const finalDeliveryFee = currentMerchant?.delivery_fee || 10;
      const total = subtotal + finalDeliveryFee;
      const orderData = {
        customer_name: userData?.name || userData?.full_name || 'عميل',
        customer_phone: phoneNumber,
        customer_address: address,
        service_type: cartItems[0]?.serviceType || 'products',
        service_name: currentMerchant?.place_name || currentMerchant?.name || 'التاجر',
        merchant_id: currentMerchant?.id ? String(currentMerchant.id) : null,
        merchant_name: currentMerchant?.name,
        merchant_place: currentMerchant?.place_name,
        items: itemsList,
        total_price: subtotal,
        delivery_fee: finalDeliveryFee,
        final_total: total,
        notes,
        payment_method: 'cash_on_delivery',
        status: 'pending',
      };
      const result = await createOrder(orderData);
      if (result.success) {
        await saveData();
        await playSendSound();
        Alert.alert('✅ تم إرسال طلبك', `تم إرسال طلبك إلى ${orderData.service_name}\nرقم الطلب: ${result.data.id?.slice(-6) || '...'}`, [{ text: 'حسناً', onPress: () => { clearCart(); navigation.popToTop(); } }]);
      } else Alert.alert('خطأ', result.error || 'فشل في إرسال الطلب');
    } catch (error) { Alert.alert('خطأ', 'فشل في إرسال الطلب'); }
    finally { setSending(false); }
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={28} color="#1F2937" /></TouchableOpacity><Text style={styles.headerTitle}>سلة التسوق</Text><View style={{ width: 28 }} /></View>
        <View style={styles.emptyContainer}><Ionicons name="cart-outline" size={80} color="#E5E7EB" /><Text style={styles.emptyText}>السلة فارغة</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={28} color="#1F2937" /></TouchableOpacity>
        <Text style={styles.headerTitle}>سلة التسوق</Text>
        <TouchableOpacity onPress={clearCart}><Ionicons name="trash-outline" size={24} color="#EF4444" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {currentMerchant && <View style={styles.merchantInfo}><Ionicons name="storefront-outline" size={20} color="#4F46E5" /><Text style={styles.merchantName}>{currentMerchant.place_name ? `${currentMerchant.place_name} (${currentMerchant.name})` : currentMerchant.name}</Text></View>}
        {userData && <View style={styles.customerInfo}><Ionicons name="person-outline" size={20} color="#4F46E5" /><Text style={styles.customerName}>العميل: {userData.name || userData.full_name}</Text></View>}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>المنتجات المختارة ({cartItems.length})</Text>
          {cartItems.map((item) => (
            <View key={item.cartItemId} style={styles.cartItem}>
              <Image source={{ uri: item.image_url || 'https://via.placeholder.com/60' }} style={styles.itemImage} />
              <View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemPrice}>{item.price} ج × {item.quantity || 1}</Text><Text style={styles.itemTotal}>{item.price * (item.quantity || 1)} ج</Text></View>
              <View style={styles.quantityControls}>
                <TouchableOpacity onPress={() => updateQuantity(item.cartItemId, -1)}><Ionicons name="remove-circle" size={28} color="#EF4444" /></TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity || 1}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.cartItemId, 1)}><Ionicons name="add-circle" size={28} color="#10B981" /></TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromCart(item.cartItemId)}><Ionicons name="close-circle" size={28} color="#9CA3AF" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بيانات التوصيل</Text>
          <View style={styles.inputContainer}><Ionicons name="call-outline" size={20} color="#4F46E5" /><TextInput style={styles.input} placeholder="رقم الموبايل" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" editable={!sending} /></View>
          <View style={styles.inputContainer}><Ionicons name="location-outline" size={20} color="#EF4444" /><TextInput style={styles.input} placeholder="العنوان بالتفصيل" value={address} onChangeText={setAddress} multiline editable={!sending} /></View>
          <View style={styles.inputContainer}><Ionicons name="document-text-outline" size={20} color="#F59E0B" /><TextInput style={styles.input} placeholder="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} multiline editable={!sending} /></View>
        </View>
        <View style={styles.invoiceSection}>
          <Text style={styles.sectionTitle}>💰 الفاتورة</Text>
          <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>إجمالي المنتجات:</Text><Text style={styles.invoiceValue}>{getTotalPrice()} ج</Text></View>
          <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>رسوم التوصيل:</Text><Text style={styles.invoiceValue}>{currentMerchant?.delivery_fee || 10} ج</Text></View>
          <View style={styles.invoiceTotal}><Text style={styles.totalLabel}>الإجمالي الكلي:</Text><Text style={styles.totalValue}>{getTotalWithDelivery()} ج</Text></View>
          <View style={styles.paymentMethod}><Ionicons name="cash-outline" size={20} color="#10B981" /><Text style={styles.paymentText}>الدفع عند الاستلام</Text></View>
        </View>
        <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={sendOrder} disabled={sending}>
          {sending ? <View style={styles.sendingContainer}><ActivityIndicator color="#FFF" /><Text style={styles.sendingText}>جاري إرسال الطلب...</Text></View> : <Text style={styles.sendButtonText}>تأكيد الطلب</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  content: { padding: 16, paddingBottom: 30 },
  merchantInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 8, gap: 8 },
  merchantName: { fontSize: 14, color: '#4F46E5', fontWeight: '600', flex: 1 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  customerName: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
  section: { marginBottom: 20 },
  itemsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  cartItem: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  itemImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemPrice: { fontSize: 12, color: '#4B5563', marginBottom: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityText: { fontSize: 16, fontWeight: '600', color: '#1F2937', minWidth: 20, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, gap: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, textAlign: 'right' },
  invoiceSection: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, marginBottom: 20 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceLabel: { fontSize: 14, color: '#92400E' },
  invoiceValue: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  invoiceTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F59E0B', gap: 8 },
  paymentText: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  sendButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
  sendingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sendingText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
