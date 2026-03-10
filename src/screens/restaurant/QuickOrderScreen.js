import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Image, Alert, ActivityIndicator, TextInput, ScrollView, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';
import { createOrder } from '../../services/orderService';
import { playSendSound } from '../../utils/SoundHelper';

const RESTAURANTS_COLLECTION = 'restaurants';

export default function QuickOrderScreen({ navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadRestaurants();
    loadSavedData();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        RESTAURANTS_COLLECTION,
        [Query.equal('isActive', true), Query.orderAsc('name')]
      );
      setRestaurants(response.documents);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل المطاعم');
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

  const loadMenuFromPDF = (restaurant) => {
    setSelectedRestaurant(restaurant);
    let items = [];
    if (restaurant.name.includes('بيتزا')) {
      items = [
        { id: '1', name: 'بيتزا مارجريتا', price: 85 },
        { id: '2', name: 'بيتزا بيبروني', price: 95 },
        { id: '3', name: 'باستا ألفريدو', price: 70 },
      ];
    } else if (restaurant.name.includes('سندوتشات')) {
      items = [
        { id: '4', name: 'سندوتش كبدة', price: 40 },
        { id: '5', name: 'سندوتش سجق', price: 45 },
        { id: '6', name: 'ساندوتش كبدة دبل', price: 70 },
      ];
    } else {
      items = [
        { id: '7', name: 'كفتة مشوية', price: 120 },
        { id: '8', name: 'كباب', price: 150 },
        { id: '9', name: 'فراخ مشوية', price: 90 },
      ];
    }
    setMenuItems(items);
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const sendOrder = async () => {
    if (!phone || !address) {
      Alert.alert('تنبيه', 'رقم الجوال والعنوان مطلوبان');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('تنبيه', 'لم تختار أي أصناف');
      return;
    }

    setSending(true);
    try {
      const itemsList = cart.map(item => `${item.name} x${item.quantity} = ${item.price * item.quantity} ج`);
      const total = getTotalPrice();
      const deliveryFee = selectedRestaurant?.deliveryFee || 0;

      const orderData = {
        customerPhone: phone,
        customerAddress: address,
        serviceType: 'restaurant',
        serviceName: `طلب من ${selectedRestaurant.name}`,
        items: itemsList,
        totalPrice: total,
        deliveryFee,
        finalTotal: total + deliveryFee,
        merchantId: selectedRestaurant.merchantId,
        restaurantId: selectedRestaurant.$id,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phone);
        await AsyncStorage.setItem('zayed_address', address);
        await playSendSound();

        Alert.alert(
          '✅ تم إرسال الطلب',
          `الإجمالي: ${total + deliveryFee} ج`,
          [
            { text: 'متابعة التسوق', onPress: () => {
              setCart([]);
              setSelectedRestaurant(null);
              setShowCheckout(false);
            }},
            { text: 'طلباتي', onPress: () => navigation.navigate('MyOrders') }
          ]
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (showCheckout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCheckout(false)}>
            <Ionicons name="arrow-back" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تأكيد الطلب</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 بيانات العميل</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🍽️ الأصناف المختارة</Text>
            {cart.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, -1)}>
                    <Ionicons name="remove-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                  <Text style={styles.cartItemQuantity}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, 1)}>
                    <Ionicons name="add-circle" size={24} color="#10B981" />
                  </TouchableOpacity>
                  <Text style={styles.cartItemPrice}>{item.price * item.quantity} ج</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text>إجمالي الأصناف:</Text>
              <Text style={styles.totalValue}>{getTotalPrice()} ج</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>رسوم التوصيل:</Text>
              <Text style={styles.totalValue}>{selectedRestaurant?.deliveryFee || 0} ج</Text>
            </View>
            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalTotalText}>الإجمالي الكلي:</Text>
              <Text style={styles.finalTotalValue}>
                {getTotalPrice() + (selectedRestaurant?.deliveryFee || 0)} ج
              </Text>
            </View>
          </View>

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
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (selectedRestaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { backgroundColor: '#F59E0B' }]}>
          <TouchableOpacity onPress={() => setSelectedRestaurant(null)}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#FFF' }]}>{selectedRestaurant.name}</Text>
          <TouchableOpacity onPress={() => setShowCheckout(true)}>
            <View>
              <Ionicons name="cart" size={28} color="#FFF" />
              {cart.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          data={menuItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.menuItem} onPress={() => addToCart(item)}>
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemPrice}>{item.price} ج</Text>
              </View>
              <Ionicons name="add-circle-outline" size={28} color="#F59E0B" />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اختر مطعمك</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={item => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => loadMenuFromPDF(item)}
          >
            <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }} style={styles.restaurantImage} />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <Text style={styles.restaurantCuisine}>{item.cuisine?.join(' • ')}</Text>
              <View style={styles.restaurantMeta}>
                <Text>⏱️ {item.deliveryTime} دقيقة</Text>
                <Text>💰 {item.deliveryFee} ج</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  restaurantImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  restaurantInfo: { flex: 1, justifyContent: 'center' },
  restaurantName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  restaurantCuisine: { fontSize: 12, color: '#6B7280', marginVertical: 2 },
  restaurantMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemInfo: { flex: 1 },
  menuItemName: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  menuItemPrice: { fontSize: 14, color: '#F59E0B', marginTop: 4 },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cartItem: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cartItemName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartItemQuantity: { fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  cartItemPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginLeft: 'auto' },
  totalSection: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalValue: { fontWeight: '600' },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: '#F59E0B',
    paddingTop: 8,
    marginTop: 4,
  },
  finalTotalText: { fontSize: 16, fontWeight: 'bold', color: '#92400E' },
  finalTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  sendButton: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
});
