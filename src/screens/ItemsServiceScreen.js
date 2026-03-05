import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServiceItems } from '../services/itemsService';
import { createOrder } from '../services/orderService';

export default function ItemsServiceScreen({ navigation, route }) {
  const { serviceId, serviceName, serviceColor } = route.params;
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    loadItems();
    loadSavedData();
  }, []);

  const loadItems = async () => {
    const result = await getServiceItems(serviceId);
    if (result.success) {
      setItems(result.data);
    }
    setLoading(false);
  };

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setPhoneNumber(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.$id);
    if (existing) {
      setCart(cart.map(i => 
        i.id === item.$id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { 
        id: item.$id, 
        name: item.name, 
        price: item.price, 
        quantity: 1 
      }]);
    }
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(i => i.id !== itemId));
    } else {
      setCart(cart.map(i => 
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const sendOrder = async () => {
    if (!phoneNumber || !address) {
      Alert.alert('تنبيه', 'الرجاء إدخال رقم الجوال والعنوان');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('تنبيه', 'لم يتم اختيار أي أصناف');
      return;
    }

    const itemsList = cart.map(item => `${item.name} x${item.quantity} = ${item.price * item.quantity} ج`);
    const orderData = {
      customerPhone: phoneNumber,
      customerAddress: address,
      serviceType: serviceId,
      serviceName: serviceName,
      items: itemsList,
      totalPrice: getTotalPrice(),
    };

    const result = await createOrder(orderData);
    if (result.success) {
      await AsyncStorage.setItem('zayed_phone', phoneNumber);
      await AsyncStorage.setItem('zayed_address', address);
      Alert.alert('✅ تم', 'تم إرسال طلبك');
      navigation.goBack();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={serviceColor || '#4F46E5'} />
      </View>
    );
  }

  if (showCheckout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { backgroundColor: serviceColor || '#4F46E5' }]}>
          <TouchableOpacity onPress={() => setShowCheckout(false)}>
            <Ionicons name="arrow-forward" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تأكيد الطلب</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>📞 رقم الجوال</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="05xxxxxxxx"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>📍 العنوان</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="العنوان بالتفصيل"
              multiline
            />
          </View>

          <View style={styles.cartSummary}>
            <Text style={styles.summaryTitle}>الأصناف المختارة:</Text>
            {cart.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <Text style={styles.cartItemName}>{item.name} x{item.quantity}</Text>
                <Text style={styles.cartItemPrice}>{item.price * item.quantity} ج</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الإجمالي:</Text>
              <Text style={styles.totalPrice}>{getTotalPrice()} ج</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={sendOrder}>
            <Text style={styles.confirmButtonText}>تأكيد الطلب</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: serviceColor || '#4F46E5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceName}</Text>
        <TouchableOpacity onPress={() => setShowCheckout(true)}>
          <Ionicons name="cart" size={24} color="#FFF" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard} onPress={() => addToCart(item)}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.placeholderImage]}>
                <Ionicons name="cube-outline" size={30} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price} ج</Text>
            </View>
            <View style={styles.quantityControl}>
              {cart.find(i => i.id === item.$id) ? (
                <View style={styles.quantityButtons}>
                  <TouchableOpacity 
                    style={styles.quantityBtn}
                    onPress={() => {
                      const cartItem = cart.find(i => i.id === item.$id);
                      updateQuantity(item.$id, cartItem.quantity - 1);
                    }}
                  >
                    <Text style={styles.quantityBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>
                    {cart.find(i => i.id === item.$id)?.quantity || 0}
                  </Text>
                  <TouchableOpacity 
                    style={styles.quantityBtn}
                    onPress={() => {
                      const cartItem = cart.find(i => i.id === item.$id);
                      updateQuantity(item.$id, cartItem.quantity + 1);
                    }}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => addToCart(item)}
                >
                  <Ionicons name="add" size={24} color={serviceColor || '#4F46E5'} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
          </View>
        }
      />
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
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  itemPrice: { fontSize: 14, color: '#F59E0B' },
  quantityControl: { marginLeft: 8 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 20,
    textAlign: 'center',
  },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  cartSummary: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartItemName: { fontSize: 14, color: '#1F2937' },
  cartItemPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  confirmButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
