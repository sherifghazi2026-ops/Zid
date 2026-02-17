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

// أنواع القطع والأسعار
const ITEM_TYPES = [
  { id: 'shirt', name: 'قميص', price: 10 },
  { id: 'pants', name: 'بنطلون', price: 10 },
  { id: 'blouse', name: 'بلوزة', price: 15 },
  { id: 'suit', name: 'بدلة', price: 70 },
  { id: 'jacket', name: 'جاكت', price: 30 },
  { id: 'dress', name: 'فستان', price: 25 },
];

export default function IroningScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('جنة 2');
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPhoneNumber();
  }, []);

  const loadPhoneNumber = async () => {
    const saved = await AsyncStorage.getItem('zayed_phone');
    if (saved) setPhoneNumber(saved);
  };

  const addItem = () => {
    if (!currentItem) {
      Alert.alert('تنبيه', 'اختر نوع القطعة');
      return;
    }

    const quantity = parseInt(currentQuantity) || 1;

    const newItem = {
      id: Date.now() + Math.random(),
      name: currentItem.name,
      quantity: quantity,
      pricePerItem: currentItem.price,
      totalPrice: currentItem.price * quantity
    };

    setItems([...items, newItem]);
    setCurrentItem(null);
    setCurrentQuantity('1');
  };

  const removeItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const updateQuantity = (itemId, newQuantity) => {
    const qty = parseInt(newQuantity) || 1;
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: qty,
          totalPrice: item.pricePerItem * qty
        };
      }
      return item;
    }));
  };

  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'من فضلك أدخل رقم الموبايل');
      return;
    }
    if (items.length === 0) {
      Alert.alert('تنبيه', 'أضف على الأقل صنف واحد');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('zayed_phone', phoneNumber);

      const itemsList = items.map(item => 
        `${item.name} x${item.quantity} = ${item.totalPrice} ج`
      ).join('\n');

      const orderText = `مكوجي:\n${itemsList}\nالإجمالي: ${calculateTotal()} ج`;
      
      const orderData = {
        phone: phoneNumber,
        address: address,
        items: [orderText],
        serviceName: 'مكوجي', // مهم: ده بيحدد استخدام بوت المكوجي
        notes: notes,
        totalPrice: calculateTotal()
      };

      const response = await fetch(`${SERVER_URL}/send-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ تم',
          'تم إرسال طلب المكوجي بنجاح',
          [
            { 
              text: 'حسناً', 
              onPress: () => navigation.goBack()
            }
          ]
        );
        setItems([]);
        setNotes('');
      } else {
        Alert.alert('⚠️', 'حدث خطأ في الإرسال');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مكوجي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="shirt-outline" size={60} color="#F59E0B" style={styles.icon} />

        {/* رقم الموبايل */}
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="رقم الموبايل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        {/* العنوان */}
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />
        </View>

        {/* اختيار الصنف */}
        <View style={styles.addItemContainer}>
          <Text style={styles.sectionTitle}>إضافة صنف:</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
            {ITEM_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemButton,
                  currentItem?.id === item.id && styles.selectedItemButton,
                ]}
                onPress={() => setCurrentItem(item)}
              >
                <Text style={[
                  styles.itemButtonText,
                  currentItem?.id === item.id && styles.selectedItemButtonText,
                ]}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  {item.price} ج
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>الكمية:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setCurrentQuantity(prev => Math.max(1, parseInt(prev) - 1).toString())}
              >
                <Ionicons name="remove" size={20} color="#F59E0B" />
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                value={currentQuantity}
                onChangeText={setCurrentQuantity}
                keyboardType="numeric"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setCurrentQuantity(prev => (parseInt(prev) + 1).toString())}
              >
                <Ionicons name="add" size={20} color="#F59E0B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Ionicons name="add-circle" size={24} color="#F59E0B" />
              <Text style={styles.addButtonText}>إضافة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* قائمة الأصناف المضافة */}
        {items.length > 0 && (
          <View style={styles.itemsListContainer}>
            <Text style={styles.sectionTitle}>الأصناف المضافة:</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemQuantityRow}>
                    <Text style={styles.itemQuantity}>الكمية:</Text>
                    <View style={styles.itemQuantityControls}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Ionicons name="remove-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                      <Text style={styles.itemQuantityValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Ionicons name="add-circle" size={20} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalPrice}>{item.totalPrice} ج</Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* إجمالي الطلب */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>الإجمالي الكلي:</Text>
              <Text style={styles.totalValue}>{calculateTotal()} ج</Text>
            </View>
          </View>
        )}

        {/* ملاحظات */}
        <View style={styles.notesContainer}>
          <TextInput
            style={styles.notesInput}
            placeholder="ملاحظات إضافية (اختياري)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>

        {/* زر الإرسال */}
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabled]}
          onPress={sendOrder}
          disabled={loading || items.length === 0}
        >
          <Text style={styles.sendButtonText}>
            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    padding: 20,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 20,
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 14,
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  addItemContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
    marginBottom: 20,
  },
  itemsScroll: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  itemButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  selectedItemButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  itemButtonText: {
    fontSize: 12,
    color: '#4B5563',
  },
  itemPrice: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  selectedItemButtonText: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsListContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  itemQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemQuantityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemTotalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  notesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  notesInput: {
    padding: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1F2937',
  },
  sendButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.6,
  },
});
