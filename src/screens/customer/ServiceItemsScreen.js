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
import { getActiveItems } from '../../services/itemService';
import { createOrder } from '../../services/orderService';

export default function ServiceItemsScreen({ route, navigation }) {
  const { serviceId, collectionName, serviceName, subServices = [] } = route.params;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadItems();
    loadSavedData();
  }, []);

  const loadItems = async () => {
    const result = await getActiveItems(collectionName);
    if (result.success) {
      setItems(result.data);
      // تهيئة الكميات
      const initialQtys = {};
      result.data.forEach(item => {
        initialQtys[item.$id] = {};
        subServices.forEach(sub => { initialQtys[item.$id][sub] = 0; });
      });
      setQuantities(initialQtys);
    }
    setLoading(false);
  };

  const loadSavedData = async () => {
    setPhone((await AsyncStorage.getItem('zayed_phone')) || '');
    setAddress((await AsyncStorage.getItem('zayed_address')) || '');
  };

  const updateQty = (itemId, subService, delta) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [subService]: Math.max(0, (prev[itemId]?.[subService] || 0) + delta)
      }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      try {
        const prices = JSON.parse(item.prices);
        prices.forEach(p => {
          const qty = quantities[item.$id]?.[p.subService] || 0;
          total += qty * p.price;
        });
      } catch (e) {}
    });
    return total;
  };

  const sendOrder = async () => {
    if (!phone || !address) { Alert.alert('تنبيه', 'رقم الجوال والعنوان مطلوبان'); return; }
    if (calculateTotal() === 0) { Alert.alert('تنبيه', 'اختر منتجات أولاً'); return; }

    setSending(true);
    try {
      const itemsList = [];
      items.forEach(item => {
        try {
          const prices = JSON.parse(item.prices);
          prices.forEach(p => {
            const qty = quantities[item.$id]?.[p.subService] || 0;
            if (qty > 0) itemsList.push(`${item.name} (${p.subService}) x${qty} = ${qty * p.price}ج`);
          });
        } catch (e) {}
      });

      await createOrder({
        customerPhone: phone,
        customerAddress: address,
        serviceType: serviceId,
        serviceName,
        items: itemsList,
        totalPrice: calculateTotal(),
        notes,
      });

      await AsyncStorage.setItem('zayed_phone', phone);
      await AsyncStorage.setItem('zayed_address', address);
      Alert.alert('✅ تم', 'تم إرسال طلبك', [{ text: 'حسناً', onPress: () => navigation.popToTop() }]);
    } catch (error) {
      Alert.alert('خطأ', 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>{serviceName}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بياناتك</Text>
          <TextInput style={styles.input} placeholder="رقم الجوال" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="العنوان" value={address} onChangeText={setAddress} />
        </View>

        {items.map(item => {
          let prices = [];
          try { prices = JSON.parse(item.prices); } catch (e) {}
          return (
            <View key={item.$id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />}
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              {prices.map(p => (
                <View key={p.subService} style={styles.serviceRow}>
                  <Text style={styles.serviceLabel}>{p.subService} ({p.price}ج)</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity onPress={() => updateQty(item.$id, p.subService, -1)} style={styles.counterBtn}><Ionicons name="remove" size={16} color="#FFF" /></TouchableOpacity>
                    <Text style={styles.counterValue}>{quantities[item.$id]?.[p.subService] || 0}</Text>
                    <TouchableOpacity onPress={() => updateQty(item.$id, p.subService, 1)} style={[styles.counterBtn, styles.plusBtn]}><Ionicons name="add" size={16} color="#FFF" /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الإجمالي:</Text>
          <Text style={styles.totalPrice}>{calculateTotal()} ج</Text>
        </View>

        <TextInput style={[styles.input, styles.notes]} placeholder="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} multiline />

        <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={sendOrder} disabled={sending}>
          {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendButtonText}>إرسال الطلب</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginVertical: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 14 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  itemCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4, paddingHorizontal: 8 },
  serviceLabel: { fontSize: 14, color: '#4B5563' },
  counter: { flexDirection: 'row', alignItems: 'center' },
  counterBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  plusBtn: { backgroundColor: '#10B981' },
  counterValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', minWidth: 20, textAlign: 'center' },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, marginVertical: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: '#F59E0B' },
  sendButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
