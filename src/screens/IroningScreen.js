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

// أنواع القطع مع أيقونات مناسبة
const ITEM_TYPES = [
  { 
    id: 'shirt', 
    name: 'قميص', 
    icon: 'shirt-outline',
    price: 10,
    color: '#3B82F6' 
  },
  { 
    id: 'suit', 
    name: 'بدلة', 
    icon: 'shirt-outline', 
    price: 70,
    color: '#8B5CF6',
    style: { transform: [{ scaleX: 1.2 }] } // تكبير أفقي
  },
  { 
    id: 'pants', 
    name: 'بنطلون', 
    icon: 'shirt-outline', 
    price: 10,
    color: '#10B981',
    style: { transform: [{ rotate: '90deg' }] } // تدوير 90 درجة
  },
  { 
    id: 'dress', 
    name: 'فستان', 
    icon: 'woman-outline', 
    price: 25,
    color: '#EC4899' 
  },
  { 
    id: 'jacket', 
    name: 'جاكت', 
    icon: 'shirt-outline', 
    price: 30,
    color: '#F59E0B',
    style: { transform: [{ scaleY: 1.2 }] } // تطويل رأسي
  },
  { 
    id: 'blouse', 
    name: 'بلوزة', 
    icon: 'shirt-outline', 
    price: 15,
    color: '#EF4444',
    style: { transform: [{ rotate: '10deg' }] } // إمالة بسيطة
  },
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
      icon: currentItem.icon,
      color: currentItem.color,
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
        serviceName: 'مكوجي',
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

  // دالة لعرض الأيقونة مع التنسيقات الخاصة
  const renderItemIcon = (item, isSelected) => {
    const color = isSelected ? '#F59E0B' : item.color;
    
    return (
      <View style={[
        styles.iconContainer,
        item.style && item.style
      ]}>
        <Ionicons 
          name={item.icon} 
          size={32} 
          color={color} 
        />
      </View>
    );
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

        {/* اختيار الصنف بأيقونات */}
        <View style={styles.addItemContainer}>
          <Text style={styles.sectionTitle}>اختر نوع القطعة:</Text>
          
          <View style={styles.itemsGrid}>
            {ITEM_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  currentItem?.id === item.id && styles.selectedItemCard,
                ]}
                onPress={() => setCurrentItem(item)}
              >
                {renderItemIcon(item, currentItem?.id === item.id)}
                <Text style={[
                  styles.itemName,
                  currentItem?.id === item.id && styles.selectedItemName,
                ]}>
                  {item.name}
                </Text>
                <Text style={[
                  styles.itemPrice,
                  currentItem?.id === item.id && styles.selectedItemPrice,
                ]}>
                  {item.price} ج
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* الكمية وزر الإضافة */}
          {currentItem && (
            <View style={styles.quantitySection}>
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
                <Ionicons name="add-circle" size={24} color="#FFF" />
                <Text style={styles.addButtonText}>إضافة للقائمة</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* قائمة الأصناف المضافة */}
        {items.length > 0 && (
          <View style={styles.itemsListContainer}>
            <Text style={styles.sectionTitle}>الأصناف المضافة:</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listItemIcon}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.listItemDetails}>
                  <Text style={styles.listItemName}>{item.name}</Text>
                  <View style={styles.listItemQuantity}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Ionicons name="remove-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                    <Text style={styles.listItemQuantityValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Ionicons name="add-circle" size={20} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.listItemTotal}>
                  <Text style={styles.listItemTotalPrice}>{item.totalPrice} ج</Text>
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
    marginBottom: 15,
  },
  addItemContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 20,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  itemCard: {
    width: '31%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedItemCard: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FEF3C7',
  },
  iconContainer: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  selectedItemName: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  selectedItemPrice: {
    color: '#F59E0B',
  },
  quantitySection: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  quantityBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 60,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 10,
  },
  addButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsListContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItemIcon: {
    width: 40,
    alignItems: 'center',
  },
  listItemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  listItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemQuantityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 30,
    textAlign: 'center',
  },
  listItemTotal: {
    alignItems: 'flex-end',
    gap: 4,
  },
  listItemTotalPrice: {
    fontSize: 16,
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
    fontSize: 24,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.6,
  },
});
