import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useCart } from '../../context/CartContext';
import { createOrder, uploadFile } from '../../services/orderService';

export default function CartScreen({ navigation }) {
  const { cartItems, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();
  const [notes, setNotes] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('zayed_phone');
      const savedAddress = await AsyncStorage.getItem('zayed_address');
      if (savedPhone) setPhoneNumber(savedPhone);
      if (savedAddress) setAddress(savedAddress);
    } catch (error) {
      console.log('خطأ في تحميل البيانات المحفوظة:', error);
    }
  };

  const sendOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('تنبيه', 'السلة فارغة');
      return;
    }

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
      let voiceFileUrl = null;

      if (recordedUri) {
        setUploadingVoice(true);
        const fileInfo = await FileSystem.getInfoAsync(recordedUri);
        if (!fileInfo.exists) {
          throw new Error('الملف الصوتي غير موجود');
        }

        const uploadResult = await uploadFile(recordedUri, `voice_${Date.now()}.m4a`, 'voice');

        setUploadingVoice(false);

        if (uploadResult.success) {
          voiceFileUrl = uploadResult.fileUrl;
        } else {
          Alert.alert(
            'تنبيه',
            `فشل رفع التسجيل الصوتي: ${uploadResult.error}. سيتم إرسال الطلب بدون صوت.`,
            [{ text: 'حسناً' }]
          );
        }
      }

      const itemsList = cartItems.map(item => `${item.name} x${item.quantity} = ${item.price * item.quantity} ج`);
      const total = getTotalPrice();

      const firstItem = cartItems[0];
      const merchantId = firstItem.providerId;
      const merchantName = firstItem.providerName;
      const serviceType = firstItem.providerType;

      const orderData = {
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: serviceType,
        serviceName: `طلب من ${merchantName}`,
        items: itemsList,
        totalPrice: total,
        notes,
        voiceUrl: voiceFileUrl,
        merchantId,
        merchantName,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);

        if (recordedUri) {
          try {
            await FileSystem.deleteAsync(recordedUri);
          } catch (e) { }
        }

        Alert.alert('✅ تم', 'تم إرسال طلبك بنجاح', [
          {
            text: 'حسناً', onPress: () => {
              clearCart();
              navigation.popToTop();
            }
          }
        ]);
      } else {
        Alert.alert('خطأ', `فشل في إرسال الطلب: ${result.error || 'خطأ غير معروف'}`);
      }
    } catch (error) {
      Alert.alert('خطأ', `فشل في إرسال الطلب: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setSending(false);
      setUploadingVoice(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>سلة التسوق</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyText}>السلة فارغة</Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.continueButtonText}>متابعة التسوق</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سلة التسوق</Text>
        <TouchableOpacity onPress={clearCart}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {cartItems.map(item => (
          <View key={item.id} style={styles.cartItem}>
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/60' }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price} ج</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity onPress={() => updateQuantity(item.id, -1)}>
                  <Ionicons name="remove-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.id, 1)}>
                  <Ionicons name="add-circle" size={24} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.id)}
                  style={{ marginLeft: 'auto' }}
                >
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.label}>📞 رقم الموبايل</Text>
          <TextInput
            style={styles.input}
            placeholder="01xxxxxxxxx"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!sending}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>📍 العنوان</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="العنوان بالتفصيل"
            value={address}
            onChangeText={setAddress}
            multiline
            editable={!sending}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>📝 ملاحظات إضافية (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="أي ملاحظات..."
            value={notes}
            onChangeText={setNotes}
            multiline
            editable={!sending}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>🎤 تسجيل صوتي (اختياري)</Text>
          <TouchableOpacity style={styles.voiceButton}>
            <Ionicons name="mic" size={24} color="#4F46E5" />
            <Text style={styles.voiceButtonText}>اضغط للتسجيل</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الإجمالي:</Text>
          <Text style={styles.totalPrice}>{getTotalPrice()} ج</Text>
        </View>

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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF', marginBottom: 20 },
  continueButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  content: { padding: 16 },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  itemImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  itemPrice: { fontSize: 14, color: '#F59E0B', marginBottom: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityText: { fontSize: 16, fontWeight: '600', color: '#1F2937', minWidth: 20, textAlign: 'center' },
  section: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  voiceButtonText: { fontSize: 14, color: '#4F46E5' },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginTop: 8,
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: '#92400E' },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: '#F59E0B' },
  sendButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
});
