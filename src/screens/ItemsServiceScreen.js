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
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';
import { createOrder } from '../services/orderService';
import { playSendSound } from '../utils/SoundHelper';

const LAUNDRY_ITEMS_COLLECTION = 'laundry_items';

export default function ItemsServiceScreen({ navigation, route }) {
  const { serviceId, serviceName, collectionName } = route.params;
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(0);
  
  // ✅ الكميات: { itemId: { iron: 0, clean: 0 } }
  const [quantities, setQuantities] = useState({});
  
  // ✅ بيانات العميل
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // ✅ حالة الإرسال
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadItems();
    loadSavedData();
    loadMerchantDeliveryFee();
  }, []);

  const loadItems = async () => {
    try {
      const collection = collectionName || LAUNDRY_ITEMS_COLLECTION;
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        collection,
        [
          Query.equal('isActive', true),
          Query.orderAsc('name')
        ]
      );
      setItems(response.documents);
    } catch (error) {
      console.error('خطأ في تحميل الأصناف:', error);
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
    } finally {
      setLoading(false);
    }
  };

  const loadMerchantDeliveryFee = async () => {
    try {
      const merchants = await databases.listDocuments(
        DATABASE_ID,
        'users',
        [
          Query.equal('role', 'merchant'),
          Query.equal('merchantType', serviceId),
          Query.equal('active', true),
          Query.limit(1)
        ]
      );

      if (merchants.documents.length > 0) {
        const merchant = merchants.documents[0];
        const fee = merchant.deliveryFee || 0;
        setDeliveryFee(fee);
        console.log(`✅ رسوم التوصيل: ${fee} ج`);
      }
    } catch (error) {
      console.log('خطأ في تحميل رسوم التوصيل:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('zayed_phone');
      const savedAddress = await AsyncStorage.getItem('zayed_address');
      if (savedPhone) setPhoneNumber(savedPhone);
      if (savedAddress) setAddress(savedAddress);
    } catch (error) {
      console.log('خطأ في تحميل البيانات المحفوظة');
    }
  };

  const saveData = async () => {
    try {
      if (phoneNumber) await AsyncStorage.setItem('zayed_phone', phoneNumber);
      if (address) await AsyncStorage.setItem('zayed_address', address);
    } catch (error) {
      console.log('خطأ في حفظ البيانات');
    }
  };

  // ✅ تحديث كمية نوع معين (كي أو تنظيف)
  const updateQuantity = (itemId, type, delta) => {
    setQuantities(prev => {
      const newQtys = { ...prev };
      if (!newQtys[itemId]) {
        newQtys[itemId] = { iron: 0, clean: 0 };
      }
      const current = newQtys[itemId][type] || 0;
      newQtys[itemId][type] = Math.max(0, current + delta);
      return newQtys;
    });
  };

  // ✅ حساب إجمالي صنف معين
  const getItemTotal = (item) => {
    const itemQtys = quantities[item.$id] || { iron: 0, clean: 0 };
    return (itemQtys.iron * item.ironPrice) + (itemQtys.clean * item.cleanPrice);
  };

  // ✅ حساب إجمالي الطلب (subtotal)
  const getOrderSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  // ✅ حساب الإجمالي الكلي (مع التوصيل)
  const getOrderTotal = () => {
    return getOrderSubtotal() + deliveryFee;
  };

  // ✅ تجهيز عناصر الطلب
  const getOrderDetailsStrings = () => {
    const details = [];
    
    items.forEach(item => {
      const itemQtys = quantities[item.$id] || { iron: 0, clean: 0 };
      
      if (itemQtys.iron > 0) {
        details.push(
          JSON.stringify({
            name: item.name,
            type: 'كي فقط',
            quantity: itemQtys.iron,
            price: item.ironPrice,
            total: itemQtys.iron * item.ironPrice
          })
        );
      }
      
      if (itemQtys.clean > 0) {
        details.push(
          JSON.stringify({
            name: item.name,
            type: 'غسيل وكي',
            quantity: itemQtys.clean,
            price: item.cleanPrice,
            total: itemQtys.clean * item.cleanPrice
          })
        );
      }
    });
    
    return details;
  };

  // ✅ إرسال الطلب
  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم الموبايل');
      return;
    }
    
    if (!address.trim()) {
      Alert.alert('تنبيه', 'أدخل العنوان');
      return;
    }
    
    const subtotal = getOrderSubtotal();
    if (subtotal === 0) {
      Alert.alert('تنبيه', 'لم تختار أي أصناف');
      return;
    }

    setSending(true);

    try {
      const orderDetailsStrings = getOrderDetailsStrings();
      const itemsList = orderDetailsStrings.map(detail => {
        const parsed = JSON.parse(detail);
        return `${parsed.name} - ${parsed.type} (${parsed.quantity} × ${parsed.price}ج) = ${parsed.total}ج`;
      });

      const total = getOrderTotal();

      const orderData = {
        customerPhone: phoneNumber.trim(),
        customerAddress: address.trim(),
        serviceType: serviceId,
        serviceName: serviceName,
        items: itemsList,
        orderDetails: orderDetailsStrings,
        totalPrice: total,
        deliveryFee: deliveryFee,
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      console.log('📦 إرسال طلب مكوجي:', orderData);

      const result = await createOrder(orderData);

      if (result.success) {
        await saveData();
        await playSendSound();

        Alert.alert(
          '✅ تم إرسال طلبك',
          `تم إرسال طلبك للمكوجي\nيمكنك متابعة حالة الطلب من الشاشة الرئيسية`,
          [
            {
              text: 'حسناً',
              onPress: () => {
                setQuantities({});
                setNotes('');
                navigation.popToTop();
              }
            }
          ]
        );
      } else {
        Alert.alert('خطأ', result.error || 'فشل في إرسال الطلب');
      }
    } catch (error) {
      console.error('❌ خطأ في الإرسال:', error);
      Alert.alert('خطأ', 'فشل في إرسال الطلب');
    } finally {
      setSending(false);
    }
  };

  // ✅ دالة عرض الصنف (عمودي محسّن)
  const renderLaundryItem = ({ item }) => {
    const itemQtys = quantities[item.$id] || { iron: 0, clean: 0 };
    const itemTotal = getItemTotal(item);

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
          ) : (
            <View style={[styles.itemImage, styles.placeholderImage]} />
          )}
          <Text style={styles.itemName}>{item.name}</Text>
        </View>

        {/* صف الخيارات */}
        <View style={styles.optionsRow}>
          {/* كي فقط */}
          <View style={styles.optionItem}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>كي فقط</Text>
              <Text style={styles.optionPrice}>{item.ironPrice} ج</Text>
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.$id, 'iron', -1)}
              >
                <Ionicons name="remove" size={18} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{itemQtys.iron}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.$id, 'iron', 1)}
              >
                <Ionicons name="add" size={18} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>

          {/* غسيل وكي */}
          <View style={styles.optionItem}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>غسيل وكي</Text>
              <Text style={styles.optionPrice}>{item.cleanPrice} ج</Text>
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.$id, 'clean', -1)}
              >
                <Ionicons name="remove" size={18} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{itemQtys.clean}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.$id, 'clean', 1)}
              >
                <Ionicons name="add" size={18} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {itemTotal > 0 && (
          <View style={styles.itemTotal}>
            <Text style={styles.itemTotalText}>إجمالي: {itemTotal} ج</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const subtotal = getOrderSubtotal();
  const total = getOrderTotal();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceName}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* الأصناف (عرض عمودي) */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>اختر الأصناف</Text>
          {items.map(item => (
            <View key={item.$id}>
              {renderLaundryItem({ item })}
            </View>
          ))}
        </View>

        {/* بيانات العميل */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>📞 بيانات التوصيل</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#4F46E5" />
            <TextInput
              style={styles.input}
              placeholder="رقم الموبايل"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
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
              multiline
              editable={!sending}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color="#F59E0B" />
            <TextInput
              style={styles.input}
              placeholder="ملاحظات (اختياري)"
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!sending}
            />
          </View>
        </View>

        {/* الفاتورة */}
        {subtotal > 0 && (
          <View style={styles.invoiceSection}>
            <Text style={styles.sectionTitle}>💰 الفاتورة</Text>
            
            {getOrderDetailsStrings().map((detail, index) => {
              const item = JSON.parse(detail);
              return (
                <View key={index} style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>
                    {item.name} - {item.type}
                  </Text>
                  <Text style={styles.invoiceValue}>
                    {item.quantity} × {item.price}ج = {item.total}ج
                  </Text>
                </View>
              );
            })}

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>رسوم التوصيل:</Text>
              <Text style={styles.invoiceValue}>{deliveryFee} ج</Text>
            </View>

            <View style={styles.invoiceTotal}>
              <Text style={styles.totalLabel}>الإجمالي الكلي:</Text>
              <Text style={styles.totalValue}>{total} ج</Text>
            </View>
          </View>
        )}

        {/* زر الإرسال */}
        <TouchableOpacity
          style={[styles.sendButton, (sending || subtotal === 0) && styles.disabled]}
          onPress={sendOrder}
          disabled={sending || subtotal === 0}
        >
          {sending ? (
            <View style={styles.sendingContainer}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.sendingText}>جاري إرسال الطلب...</Text>
            </View>
          ) : (
            <Text style={styles.sendButtonText}>
              {subtotal > 0 ? `إرسال الطلب (${total} ج)` : 'اختر أصناف أولاً'}
            </Text>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 30 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },

  itemsSection: { marginBottom: 20 },
  customerSection: { marginBottom: 20 },

  // ✅ أنماط الكارد المحسّنة (مسافات أقل)
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImage: { width: 40, height: 40, borderRadius: 6, marginRight: 10 },
  placeholderImage: { backgroundColor: '#F3F4F6' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },

  // ✅ صف الخيارات جنب بعض
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 8,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitle: { fontSize: 11, color: '#4B5563' },
  optionPrice: { fontSize: 11, fontWeight: '600', color: '#F59E0B' },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#1F2937', 
    minWidth: 18, 
    textAlign: 'center' 
  },

  itemTotal: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
  },
  itemTotalText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    textAlign: 'right',
  },

  invoiceSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  invoiceLabel: { fontSize: 12, color: '#92400E', flex: 1 },
  invoiceValue: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  invoiceTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F59E0B',
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#F59E0B' },

  sendButton: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
  sendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendingText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});
