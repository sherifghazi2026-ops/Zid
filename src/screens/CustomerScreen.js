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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VoiceRecorder from '../components/VoiceRecorder';
import CameraCapture from '../components/CameraCapture';
import { createOrder } from '../services/orderService';
import { getCurrentLocation } from '../utils/permissions';

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
  { id: 'supermarket', name: 'سوبر ماركت', image: images.supermarket, color: '#4F46E5', type: 'voice' },
  { id: 'restaurant', name: 'مطاعم', image: images.restaurant, color: '#10B981', type: 'restaurant' },
  { id: 'pharmacy', name: 'صيدليات', image: images.pharmacy, color: '#F59E0B', type: 'camera' },
  { id: 'plumbing', name: 'سباكة', image: images.plumbing, color: '#3B82F6', type: 'camera' },
  { id: 'carpentry', name: 'نجارة', image: images.carpentry, color: '#8B5CF6', type: 'camera' },
  { id: 'marble', name: 'رخام', image: images.marble, color: '#EC4899', type: 'camera' },
];

export default function CustomerScreen({ navigation }) {
  const [selectedService, setSelectedService] = useState(null);
  const [orderText, setOrderText] = useState('');
  const [orderImage, setOrderImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const location = await getCurrentLocation();
      setUserLocation(location);
    })();
  }, []);

  const handleServicePress = (service) => {
    if (service.id === 'restaurant') {
      // 🍽️ فتح شاشة المطاعم المنفصلة
      navigation.navigate('Restaurant');
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

  const submitOrder = async () => {
    if (!selectedService) return Alert.alert('تنبيه', 'اختر الخدمة أولاً');
    if (selectedService.type === 'voice' && !orderText) return Alert.alert('تنبيه', 'سجل طلبك بالصوت');
    if (selectedService.type === 'camera' && !orderImage) return Alert.alert('تنبيه', 'صور المشكلة');

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await createOrder({
        service: selectedService.id,
        serviceName: selectedService.name,
        text: orderText,
        image: orderImage,
        customerId: 'user-' + Date.now(),
        location,
        address: 'الشيخ زايد',
      });
      Alert.alert('🎉 تم', 'طلبك في الطريق');
      handleBackPress();
    } catch (error) {
      Alert.alert('خطأ', 'حصل مشكلة، حاول تاني');
    }
    setLoading(false);
  };

  if (!selectedService) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { backgroundColor: '#4F46E5' }]}>
          <Text style={styles.title}>ZAYED ID</Text>
          <Text style={styles.subtitle}>دوس على الخدمة اللي عايزها</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    height: 200,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  headerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  orderContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  orderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  resultText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 10,
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
