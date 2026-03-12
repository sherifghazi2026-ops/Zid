import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { ORDER_STATUS } from '../../services/orderService';
import { fontFamily } from '../../utils/fonts';

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [sound, setSound] = useState(null);
  
  // ✅ useRef للتحقق من أن المكون لا يزال مثبتاً
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    
    // ✅ تنظيف الصوت عند الخروج من الشاشة
    return () => {
      isMounted.current = false;
      clearInterval(interval);
      if (sound) {
        console.log('🧹 تفريغ الصوت من الذاكرة...');
        sound.unloadAsync().catch(e => console.log('خطأ في تفريغ الصوت:', e));
      }
    };
  }, [sound]);

  const loadOrder = async () => {
    try {
      const doc = await databases.getDocument(
        DATABASE_ID,
        'orders',
        orderId
      );
      if (isMounted.current) {
        setOrder(doc);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلب:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const makePhoneCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const playVoice = async (voiceUrl) => {
    try {
      // ✅ إيقاف أي صوت سابق
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true }
      );
      
      if (isMounted.current) {
        setSound(newSound);
        setPlayingVoice(voiceUrl);
      }
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish && isMounted.current) {
          setPlayingVoice(null);
        }
      });
    } catch (error) {
      Alert.alert('خطأ', 'فشل تشغيل التسجيل الصوتي');
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      [ORDER_STATUS.PENDING]: 'time-outline',
      [ORDER_STATUS.ACCEPTED]: 'checkmark-circle-outline',
      [ORDER_STATUS.PREPARING]: 'restaurant-outline',
      [ORDER_STATUS.READY]: 'checkmark-done-circle-outline',
      [ORDER_STATUS.DRIVER_ASSIGNED]: 'person-outline',
      [ORDER_STATUS.ON_THE_WAY]: 'bicycle-outline',
      [ORDER_STATUS.DELIVERED]: 'checkmark-done-circle-outline',
      [ORDER_STATUS.CANCELLED]: 'close-circle-outline',
    };
    return icons[status] || 'help-outline';
  };

  const getStatusColor = (status) => {
    const colors = {
      [ORDER_STATUS.PENDING]: '#F59E0B',
      [ORDER_STATUS.ACCEPTED]: '#3B82F6',
      [ORDER_STATUS.PREPARING]: '#8B5CF6',
      [ORDER_STATUS.READY]: '#10B981',
      [ORDER_STATUS.DRIVER_ASSIGNED]: '#3B82F6',
      [ORDER_STATUS.ON_THE_WAY]: '#3B82F6',
      [ORDER_STATUS.DELIVERED]: '#10B981',
      [ORDER_STATUS.CANCELLED]: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusText = (status) => {
    const texts = {
      [ORDER_STATUS.PENDING]: 'في انتظار تاجر',
      [ORDER_STATUS.ACCEPTED]: '✅ تم قبول الطلب',
      [ORDER_STATUS.PREPARING]: '🔧 جاري تجهيز الطلب',
      [ORDER_STATUS.READY]: '📦 طلبك جاهز للاستلام',
      [ORDER_STATUS.DRIVER_ASSIGNED]: '🚚 تم تعيين مندوب',
      [ORDER_STATUS.ON_THE_WAY]: '🚲 المندوب في الطريق',
      [ORDER_STATUS.DELIVERED]: '🎉 تم الاستلام',
      [ORDER_STATUS.CANCELLED]: '❌ تم الإلغاء',
    };
    return texts[status] || status;
  };

  const getStepNumber = (status) => {
    const steps = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.ON_THE_WAY,
      ORDER_STATUS.DELIVERED,
    ];
    const index = steps.indexOf(status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>الطلب غير موجود</Text>
      </View>
    );
  }

  const currentStep = getStepNumber(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: fontFamily.arabic }]}>تتبع الطلب</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* حالة الطلب الحالية */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Ionicons name={getStatusIcon(order.status)} size={50} color={getStatusColor(order.status)} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { fontFamily: fontFamily.arabic, color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
            <Text style={[styles.orderId, { fontFamily: fontFamily.arabic }]}>طلب #{order.$id.slice(-6)}</Text>
          </View>
        </View>

        {/* شريط التقدم */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineRow}>
            <View style={styles.stepWrapper}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepDot,
                  currentStep >= 1 && styles.stepDotCompleted,
                  currentStep === 1 && styles.stepDotCurrent
                ]}>
                  {currentStep > 1 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[
                  styles.stepLabel,
                  currentStep >= 1 && styles.stepLabelActive,
                  { fontFamily: fontFamily.arabic }
                ]}>قبول</Text>
              </View>
              {currentStep > 1 && <View style={[styles.stepLine, styles.stepLineActive]} />}
              {currentStep === 1 && <View style={styles.stepLine} />}
              {currentStep < 1 && <View style={styles.stepLine} />}
            </View>

            <View style={styles.stepWrapper}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepDot,
                  currentStep >= 2 && styles.stepDotCompleted,
                  currentStep === 2 && styles.stepDotCurrent
                ]}>
                  {currentStep > 2 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[
                  styles.stepLabel,
                  currentStep >= 2 && styles.stepLabelActive,
                  { fontFamily: fontFamily.arabic }
                ]}>تجهيز الطلب</Text>
              </View>
              {currentStep > 2 && <View style={[styles.stepLine, styles.stepLineActive]} />}
              {currentStep === 2 && <View style={styles.stepLine} />}
              {currentStep < 2 && <View style={styles.stepLine} />}
            </View>

            <View style={styles.stepWrapper}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepDot,
                  currentStep >= 3 && styles.stepDotCompleted,
                  currentStep === 3 && styles.stepDotCurrent
                ]}>
                  {currentStep > 3 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[
                  styles.stepLabel,
                  currentStep >= 3 && styles.stepLabelActive,
                  { fontFamily: fontFamily.arabic }
                ]}>جاهز للاستلام</Text>
              </View>
              {currentStep > 3 && <View style={[styles.stepLine, styles.stepLineActive]} />}
              {currentStep === 3 && <View style={styles.stepLine} />}
              {currentStep < 3 && <View style={styles.stepLine} />}
            </View>

            <View style={styles.stepWrapper}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepDot,
                  currentStep >= 4 && styles.stepDotCompleted,
                  currentStep === 4 && styles.stepDotCurrent
                ]}>
                  {currentStep > 4 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[
                  styles.stepLabel,
                  currentStep >= 4 && styles.stepLabelActive,
                  { fontFamily: fontFamily.arabic }
                ]}>المندوب في الطريق</Text>
              </View>
              {currentStep > 4 && <View style={[styles.stepLine, styles.stepLineActive]} />}
              {currentStep === 4 && <View style={styles.stepLine} />}
              {currentStep < 4 && <View style={styles.stepLine} />}
            </View>

            <View style={styles.stepWrapper}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepDot,
                  currentStep >= 5 && styles.stepDotCompleted,
                  currentStep === 5 && styles.stepDotCurrent
                ]}>
                  {currentStep > 5 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[
                  styles.stepLabel,
                  currentStep >= 5 && styles.stepLabelActive,
                  { fontFamily: fontFamily.arabic }
                ]}>تم الاستلام</Text>
              </View>
            </View>
          </View>
        </View>

        {/* معلومات العميل */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>معلومات التوصيل</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.infoRow} onPress={() => makePhoneCall(order.customerPhone)}>
              <Ionicons name="call-outline" size={20} color="#4F46E5" />
              <Text style={[styles.infoLabel, { fontFamily: fontFamily.arabic }]}>رقم الهاتف:</Text>
              <Text style={[styles.infoValue, styles.phoneLink, { fontFamily: fontFamily.arabic }]}>{order.customerPhone}</Text>
            </TouchableOpacity>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#EF4444" />
              <Text style={[styles.infoLabel, { fontFamily: fontFamily.arabic }]}>العنوان:</Text>
              <Text style={[styles.infoValue, { fontFamily: fontFamily.arabic }]}>{order.customerAddress}</Text>
            </View>
          </View>
        </View>

        {/* المنتجات */}
        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>المنتجات</Text>
            <View style={styles.itemsCard}>
              {order.items.map((item, index) => (
                <Text key={index} style={[styles.itemText, { fontFamily: fontFamily.arabic }]}>• {item}</Text>
              ))}
            </View>
          </View>
        )}

        {/* الصور المرفقة */}
        {order.imageUrls && order.imageUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>🖼️ الصور المرفقة</Text>
            <ScrollView horizontal style={styles.imagesContainer}>
              {order.imageUrls.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.thumbnail} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* التسجيل الصوتي */}
        {order.voiceUrl && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>🎤 التسجيل الصوتي</Text>
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => playVoice(order.voiceUrl)}
            >
              <Ionicons
                name={playingVoice === order.voiceUrl ? "pause" : "play"}
                size={24}
                color="#FFF"
              />
              <Text style={[styles.voiceButtonText, { fontFamily: fontFamily.arabic }]}>
                {playingVoice === order.voiceUrl ? 'جاري التشغيل' : 'استمع للتسجيل'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* معلومات التاجر */}
        {order.merchantName && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>التاجر</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="business-outline" size={20} color="#F59E0B" />
                <Text style={[styles.contactName, { fontFamily: fontFamily.arabic }]}>{order.merchantName}</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => makePhoneCall(order.merchantPhone)}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={[styles.contactButtonText, { fontFamily: fontFamily.arabic }]}>اتصل بالتاجر</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* معلومات المندوب */}
        {order.driverName && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>المندوب</Text>
            <View style={[styles.contactCard, { borderColor: '#3B82F6' }]}>
              <View style={styles.contactRow}>
                <Ionicons name="bicycle-outline" size={20} color="#3B82F6" />
                <Text style={[styles.contactName, { fontFamily: fontFamily.arabic }]}>{order.driverName}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.contactButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => makePhoneCall(order.driverPhone)}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={[styles.contactButtonText, { fontFamily: fontFamily.arabic }]}>اتصل بالمندوب</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* الفاتورة */}
        {order.totalPrice > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>💰 الفاتورة</Text>
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, { fontFamily: fontFamily.arabic }]}>قيمة الطلب:</Text>
                <Text style={[styles.invoiceValue, { fontFamily: fontFamily.arabic }]}>{order.totalPrice} ج</Text>
              </View>
              {order.deliveryFee > 0 && (
                <View style={styles.invoiceRow}>
                  <Text style={[styles.invoiceLabel, { fontFamily: fontFamily.arabic }]}>توصيل:</Text>
                  <Text style={[styles.invoiceValue, { fontFamily: fontFamily.arabic }]}>{order.deliveryFee} ج</Text>
                </View>
              )}
              <View style={styles.invoiceTotal}>
                <Text style={[styles.totalLabel, { fontFamily: fontFamily.arabic }]}>الإجمالي:</Text>
                <Text style={[styles.totalValue, { fontFamily: fontFamily.arabic }]}>{order.finalTotal || order.totalPrice} ج</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Text style={[styles.paymentLabel, { fontFamily: fontFamily.arabic }]}>طريقة الدفع:</Text>
                <Text style={[styles.paymentValue, { fontFamily: fontFamily.arabic }]}>الدفع عند الاستلام</Text>
              </View>
            </View>
          </View>
        )}

        {/* تاريخ الطلب */}
        <View style={styles.section}>
          <Text style={[styles.dateText, { fontFamily: fontFamily.arabic }]}>
            تاريخ الطلب: {new Date(order.createdAt).toLocaleString('ar-EG')}
          </Text>
          {order.deliveredAt && (
            <Text style={[styles.dateText, { fontFamily: fontFamily.arabic }]}>
              تم الاستلام: {new Date(order.deliveredAt).toLocaleString('ar-EG')}
            </Text>
          )}
        </View>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  errorText: { fontSize: 16, color: '#EF4444' },
  content: { padding: 16 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusInfo: { marginLeft: 16, flex: 1 },
  statusText: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  orderId: { fontSize: 14, color: '#6B7280' },

  timelineContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepContent: {
    alignItems: 'center',
    width: '100%',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepDotCurrent: {
    backgroundColor: '#4F46E5',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  stepLabelActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 13,
    right: -50,
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },

  infoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  infoValue: { fontSize: 14, color: '#1F2937', flex: 1 },
  phoneLink: { color: '#3B82F6', textDecorationLine: 'underline' },

  itemsCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  itemText: { fontSize: 14, color: '#4B5563', marginBottom: 6 },

  imagesContainer: { flexDirection: 'row', marginBottom: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },

  voiceButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  voiceButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  contactCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  contactButton: { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  contactButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  invoiceCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceLabel: { fontSize: 14, color: '#92400E' },
  invoiceValue: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  invoiceTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#92400E' },
  paymentMethod: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F59E0B' },
  paymentLabel: { fontSize: 14, color: '#92400E' },
  paymentValue: { fontSize: 14, fontWeight: '600', color: '#10B981' },

  dateText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
});
