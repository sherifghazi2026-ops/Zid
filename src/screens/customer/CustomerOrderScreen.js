import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItems } from '../../services/itemService';
import { createOrder } from '../../services/orderService';

export default function CustomerOrderScreen({ navigation, route }) {
  const { collectionName, serviceName } = route.params;
  const isLaundry = collectionName === 'laundry_items';

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
    setLoading(true);
    const result = await getItems(collectionName);
    if (result.success) {
      // عرض الأصناف النشطة فقط
      const activeItems = result.data.filter(item => item.isActive !== false);
      setItems(activeItems);
      
      // تهيئة الكميات
      const initialQtys = {};
      activeItems.forEach(item => {
        if (isLaundry) {
          initialQtys[item.$id] = { iron: 0, clean: 0 };
        } else {
          initialQtys[item.$id] = 0;
        }
      });
      setQuantities(initialQtys);
    }
    setLoading(false);
  };

  const loadSavedData = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('zayed_phone');
      const savedAddress = await AsyncStorage.getItem('zayed_address');
      if (savedPhone) setPhone(savedPhone);
      if (savedAddress) setAddress(savedAddress);
    } catch (error) {
      console.log('خطأ في تحميل البيانات المحفوظة');
    }
  };

  // تحديث كمية صنف المكوجي
  const updateLaundryQty = (itemId, type, delta) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: Math.max(0, (prev[itemId]?.[type] || 0) + delta)
      }
    }));
  };

  // تحديث كمية الصنف العادي
  const updateNormalQty = (itemId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  // حساب الإجمالي
  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      if (isLaundry) {
        const qty = quantities[item.$id] || { iron: 0, clean: 0 };
        total += (qty.iron * (item.ironPrice || 0)) + (qty.clean * (item.cleanPrice || 0));
      } else {
        total += (quantities[item.$id] || 0) * (item.price || 0);
      }
    });
    return total;
  };

  // إرسال الطلب
  const sendOrder = async () => {
    if (!phone || !address) {
      Alert.alert('تنبيه', 'رقم الجوال والعنوان مطلوبان');
      return;
    }
    
    if (calculateTotal() === 0) {
      Alert.alert('تنبيه', 'اختر منتجات أولاً');
      return;
    }

    setSending(true);
    try {
      // تجهيز قائمة الطلب
      const itemsList = [];
      items.forEach(item => {
        if (isLaundry) {
          const qty = quantities[item.$id] || { iron: 0, clean: 0 };
          if (qty.iron > 0) itemsList.push(`${item.name} (كي فقط) x${qty.iron} = ${qty.iron * item.ironPrice}ج`);
          if (qty.clean > 0) itemsList.push(`${item.name} (غسيل وكوي) x${qty.clean} = ${qty.clean * item.cleanPrice}ج`);
        } else {
          const qty = quantities[item.$id] || 0;
          if (qty > 0) itemsList.push(`${item.name} x${qty} = ${qty * item.price}ج`);
        }
      });

      const result = await createOrder({
        customerPhone: phone,
        customerAddress: address,
        serviceType: collectionName,
        serviceName: serviceName || 'طلب',
        items: itemsList,
        totalPrice: calculateTotal(),
        notes,
      });

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phone);
        await AsyncStorage.setItem('zayed_address', address);
        
        Alert.alert('✅ تم', 'تم إرسال طلبك بنجاح', [
          { text: 'حسناً', onPress: () => navigation.popToTop() }
        ]);
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل الإرسال');
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>{serviceName || 'طلب'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بياناتك</Text>
          <TextInput
            style={styles.input}
            placeholder="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {items.map(item => (
          <View key={item.$id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              )}
              <Text style={styles.itemName}>{item.name}</Text>
            </View>

            {isLaundry ? (
              <>
                <View style={styles.serviceRow}>
                  <Text style={styles.serviceLabel}>كي فقط ({item.ironPrice}ج)</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity
                      onPress={() => updateLaundryQty(item.$id, 'iron', -1)}
                      style={styles.counterBtn}
                    >
                      <Ionicons name="remove" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>
                      {quantities[item.$id]?.iron || 0}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateLaundryQty(item.$id, 'iron', 1)}
                      style={[styles.counterBtn, styles.plusBtn]}
                    >
                      <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.serviceRow}>
                  <Text style={styles.serviceLabel}>غسيل وكوي ({item.cleanPrice}ج)</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity
                      onPress={() => updateLaundryQty(item.$id, 'clean', -1)}
                      style={styles.counterBtn}
                    >
                      <Ionicons name="remove" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>
                      {quantities[item.$id]?.clean || 0}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateLaundryQty(item.$id, 'clean', 1)}
                      style={[styles.counterBtn, styles.plusBtn]}
                    >
                      <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>{item.price} ج</Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() => updateNormalQty(item.$id, -1)}
                    style={styles.counterBtn}
                  >
                    <Ionicons name="remove" size={16} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>
                    {quantities[item.$id] || 0}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateNormalQty(item.$id, 1)}
                    style={[styles.counterBtn, styles.plusBtn]}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الإجمالي:</Text>
          <Text style={styles.totalPrice}>{calculateTotal()} ج</Text>
        </View>

        <TextInput
          style={[styles.input, styles.notes]}
          placeholder="ملاحظات (اختياري)"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

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
  content: { padding: 16 },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginVertical: 16,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  serviceLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  plusBtn: {
    backgroundColor: '#10B981',
  },
  counterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 20,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  disabled: { opacity: 0.6 },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
