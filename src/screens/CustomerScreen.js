import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VoiceRecorder from '../components/VoiceRecorder';
import CameraCapture from '../components/CameraCapture';
import { createOrder } from '../services/orderService';
import { getCurrentLocation } from '../utils/permissions';
import OrderTracking from '../components/OrderTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

const images = {
  supermarket: require('../../assets/icons/supermarket-8k.png'),
  restaurant: require('../../assets/icons/restaurant-8k.png'),
  pharmacy: require('../../assets/icons/pharmacy-8k.png'),
  plumbing: require('../../assets/icons/plumbing-8k.png'),
  carpentry: require('../../assets/icons/carpentry-8k.png'),
  marble: require('../../assets/icons/marble-8k.png'),
};

const SERVICES = [
  { id: 'supermarket', name: 'سوبر ماركت', image: images.supermarket, color: '#F59E0B', type: 'voice' },
  { id: 'restaurant', name: 'مطاعم', image: images.restaurant, color: '#10B981', type: 'restaurant' },
  { id: 'pharmacy', name: 'صيدليات', image: images.pharmacy, color: '#F59E0B', type: 'camera' },
  { id: 'plumbing', name: 'سباكة', image: images.plumbing, color: '#3B82F6', type: 'camera' },
  { id: 'carpentry', name: 'نجارة', image: images.carpentry, color: '#8B5CF6', type: 'camera' },
  { id: 'marble', name: 'رخام', image: images.marble, color: '#EC4899', type: 'camera' },
];

// ==================== رابط البوت API (غير ده كل ما يتغير رابط serveo) ====================
const BOT_API_URL = 'https://ce07153ba4795e75-196-130-86-171.serveousercontent.com';

export default function CustomerScreen({ navigation }) {
  const [selectedService, setSelectedService] = useState(null);
  const [orderText, setOrderText] = useState('');
  const [orderImage, setOrderImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoadingOrders(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      
      const savedPhone = await AsyncStorage.getItem('zayed_phone');
      if (savedPhone) setPhoneNumber(savedPhone);
      
      await loadRecentOrders();
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem('user_orders');
      if (savedOrders) {
        const orders = JSON.parse(savedOrders);
        const lastThree = orders.slice(-3).reverse();
        setRecentOrders(lastThree);
      }
    } catch (error) {
      console.error('خطأ في تحميل الطلبات السابقة:', error);
    }
  };

  const handleServicePress = (service) => {
    if (service.id === 'restaurant') {
      navigation.navigate('Restaurant');
    } else if (service.id === 'supermarket') {
      navigation.navigate('Grocery');
    } else {
      setSelectedService(service);
      setOrderText('');
      setOrderImage(null);
    }
  };

  const handleVoiceComplete = (result) => {
    setOrderText(result.text);
  };

  const handleImageCapture = (uri) => {
    setOrderImage(uri);
  };

  const handleBackPress = () => {
    setSelectedService(null);
    setOrderText('');
    setOrderImage(null);
  };

  // ==================== إرسال الطلب للبوت ====================
  const sendOrderToBot = async (orderData) => {
    try {
      console.log('إرسال للبوت:', orderData);
      const response = await fetch(`${BOT_API_URL}/api/new-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      const data = await response.json();
      console.log('رد البوت:', data);
      return data.success;
    } catch (error) {
      console.error('خطأ في إرسال الطلب للبوت:', error);
      return false;
    }
  };

  const submitOrder = async () => {
    if (!selectedService) return Alert.alert('تنبيه', 'اختر الخدمة أولاً');
    if (selectedService.type === 'voice' && !orderText) return Alert.alert('تنبيه', 'سجل طلبك بالصوت');
    if (selectedService.type === 'camera' && !orderImage) return Alert.alert('تنبيه', 'صور المشكلة');

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      
      const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
      
      // تحويل نص الطلب إلى مصفوفة
      const itemsArray = orderText ? orderText.split(/[،,]/).map(i => i.trim()).filter(i => i) : ['طلب بدون تفاصيل'];
      const itemsList = itemsArray.join('، ');
      
      const orderData = {
        orderId,
        phone: phoneNumber || 'غير معروف',
        address: 'جنة 2',
        items: itemsList,
        fullText: orderText || 'طلب بدون تفاصيل',
        customerChatId: phoneNumber,
        serviceType: selectedService.id,
        serviceName: selectedService.name,
      };
      
      const botSent = await sendOrderToBot(orderData);
      
      if (!botSent) {
        Alert.alert('تحذير', 'تم استلام طلبك لكن فشل إرسال الإشعار');
      }
      
      const savedOrders = await AsyncStorage.getItem('user_orders');
      const orders = savedOrders ? JSON.parse(savedOrders) : [];
      
      const newOrder = {
        id: orderId,
        service: selectedService.id,
        serviceName: selectedService.name,
        text: orderText || 'طلب بدون تفاصيل',
        image: orderImage,
        date: new Date().toLocaleString('ar-EG'),
        status: 'جديد',
        phone: phoneNumber,
        address: 'جنة 2',
      };
      
      orders.push(newOrder);
      await AsyncStorage.setItem('user_orders', JSON.stringify(orders));
      
      const lastThree = orders.slice(-3).reverse();
      setRecentOrders(lastThree);
      
      Alert.alert(
        '🎉 تم', 
        'طلبك في الطريق',
        [
          { 
            text: 'تتبع الطلب', 
            onPress: () => {
              setCurrentOrderId(orderId);
              setShowTracking(true);
            } 
          },
          { text: 'حسناً', style: 'cancel' }
        ]
      );
      
      handleBackPress();
    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      Alert.alert('خطأ', 'حصل مشكلة، حاول تاني');
    }
    setLoading(false);
  };

  const trackOrder = (orderId) => {
    setCurrentOrderId(orderId);
    setShowTracking(true);
  };

  if (!selectedService) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { backgroundColor: '#4F46E5' }]}>
          <Text style={styles.title}>ZAYED ID</Text>
          <Text style={styles.subtitle}>دوس على الخدمة اللي عايزها</Text>
        </View>

        <View style={styles.recentOrdersSection}>
          <Text style={styles.recentOrdersTitle}>🕒 طلباتك السابقة</Text>
          
          {loadingOrders ? (
            <View style={styles.loadingRecent}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loadingRecentText}>جاري تحميل الطلبات...</Text>
            </View>
          ) : recentOrders.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentOrdersScroll}>
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.recentOrderCard, 
                    { borderLeftColor: order.service === 'supermarket' ? '#F59E0B' : 
                                       order.service === 'pharmacy' ? '#F59E0B' : 
                                       order.service === 'plumbing' ? '#3B82F6' : 
                                       order.service === 'carpentry' ? '#8B5CF6' : 
                                       order.service === 'marble' ? '#EC4899' : '#10B981' }
                  ]}
                  onPress={() => trackOrder(order.id)}
                >
                  <Ionicons 
                    name={
                      order.service === 'supermarket' ? 'cart' :
                      order.service === 'pharmacy' ? 'medical' :
                      order.service === 'plumbing' ? 'water' :
                      order.service === 'carpentry' ? 'hammer' :
                      order.service === 'marble' ? 'apps' : 'restaurant'
                    } 
                    size={24} 
                    color={
                      order.service === 'supermarket' ? '#F59E0B' :
                      order.service === 'pharmacy' ? '#F59E0B' :
                      order.service === 'plumbing' ? '#3B82F6' :
                      order.service === 'carpentry' ? '#8B5CF6' :
                      order.service === 'marble' ? '#EC4899' : '#10B981'
                    } 
                  />
                  <View style={styles.recentOrderInfo}>
                    <Text style={styles.recentOrderId}>طلب #{order.id.slice(-6)}</Text>
                    <Text style={styles.recentOrderService}>{order.serviceName}</Text>
                  </View>
                  <View style={[styles.recentOrderStatus, { 
                    backgroundColor: order.status === 'جديد' ? '#F59E0B' : 
                                    order.status === 'جاري التوصيل' ? '#3B82F6' : '#10B981' 
                  }]}>
                    <Text style={styles.recentOrderStatusText}>{order.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRecent}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyRecentText}>لا توجد طلبات سابقة</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
          {SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.card, { width: CARD_SIZE }]}
              onPress={() => handleServicePress(service)}
              activeOpacity={0.8}
            >
              <Image source={service.image} style={styles.cardImage} />
              <View style={styles.textOverlay}>
                <Text style={styles.cardTitle}>{service.name}</Text>
              </View>
              <View style={styles.badgeOverlay}>
                <Ionicons
                  name={
                    service.type === 'restaurant' ? 'restaurant' :
                    service.type === 'voice' ? 'mic' : 'camera'
                  }
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <OrderTracking
          visible={showTracking}
          onClose={() => setShowTracking(false)}
          orderId={currentOrderId}
          phoneNumber={phoneNumber}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.serviceHeader, { backgroundColor: selectedService.color }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Image source={selectedService.image} style={styles.headerImage} />
        <Text style={styles.headerTitle}>{selectedService.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.orderContainer}>
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>
            {selectedService.type === 'voice'
              ? '🎤 دوس على الميكروفون وسجل طلبك'
              : selectedService.id === 'pharmacy'
              ? '📸 دوس على الكاميرا وصور الروشتة'
              : '📸 دوس على الكاميرا وصور المشكلة'}
          </Text>

          {selectedService.type === 'voice' ? (
            <VoiceRecorder onRecordingComplete={handleVoiceComplete} />
          ) : (
            <CameraCapture onImageCaptured={handleImageCapture} />
          )}

          {orderText ? (
            <View style={styles.resultBox}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.resultText}>تم تسجيل الطلب</Text>
            </View>
          ) : null}

          {orderImage ? (
            <View style={styles.resultBox}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.resultText}>تم التصوير بنجاح</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabled]}
            onPress={submitOrder}
            disabled={loading}
          >
            <View style={[styles.submitGradient, { backgroundColor: selectedService.color }]}>
              <Text style={styles.submitText}>
                {loading ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <OrderTracking
        visible={showTracking}
        onClose={() => setShowTracking(false)}
        orderId={currentOrderId}
        phoneNumber={phoneNumber}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  recentOrdersSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentOrdersTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  loadingRecent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  loadingRecentText: { fontSize: 14, color: '#6B7280' },
  emptyRecent: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyRecentText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  recentOrdersScroll: { flexDirection: 'row' },
  recentOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 200,
  },
  recentOrderInfo: { flex: 1, marginLeft: 8, marginRight: 8 },
  recentOrderId: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  recentOrderService: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  recentOrderStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  recentOrderStatusText: { fontSize: 10, color: '#FFFFFF', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16 },
  card: { height: 200, marginBottom: 16, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  textOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  badgeOverlay: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.3)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  serviceHeader: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
  headerImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFFFFF', marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  orderContainer: { padding: 20 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  orderLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  resultBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, marginTop: 16 },
  resultText: { fontSize: 14, color: '#1F2937', marginLeft: 10, flex: 1 },
  submitButton: { marginTop: 24, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  submitGradient: { paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
