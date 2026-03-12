import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { 
  setOrderPrice, assignDriver, startDelivery, completeDelivery,
  updateOrderStatus, ORDER_STATUS 
} from '../../services/orderService';
import { getAvailableDrivers } from '../../services/driverService';
import { fontFamily } from '../../utils/fonts';

const { width, height } = Dimensions.get('window');

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [showDriversModal, setShowDriversModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [price, setPrice] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [playingVoice, setPlayingVoice] = useState(null);
  const [sound, setSound] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // ✅ useRef للتحقق من أن المكون لا يزال مثبتاً
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadOrder();
    loadDrivers();
    
    // ✅ تنظيف الصوت عند الخروج من الشاشة بطريقة آمنة
    return () => {
      isMounted.current = false;
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
      if (isMounted.current) {
        Alert.alert('خطأ', 'فشل في تحميل الطلب');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const loadDrivers = async () => {
    const result = await getAvailableDrivers();
    if (result.success && isMounted.current) {
      setDrivers(result.data);
    }
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

  const openImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleSetPrice = async () => {
    if (!price || isNaN(parseFloat(price))) {
      Alert.alert('تنبيه', 'السعر مطلوب');
      return;
    }
    const result = await setOrderPrice(
      orderId,
      parseFloat(price),
      deliveryFee ? parseFloat(deliveryFee) : 0
    );
    if (result.success && isMounted.current) {
      setShowPriceModal(false);
      loadOrder();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleAssignDriver = (driver) => {
    Alert.alert(
      'تعيين مندوب',
      `هل تريد تعيين ${driver.name} لهذا الطلب؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تعيين',
          onPress: async () => {
            const result = await assignDriver(
              orderId,
              driver.$id,
              driver.name,
              driver.phone
            );
            if (result.success && isMounted.current) {
              setShowDriversModal(false);
              loadOrder();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleStartDelivery = async () => {
    const result = await startDelivery(orderId);
    if (result.success && isMounted.current) loadOrder();
    else Alert.alert('خطأ', result.error);
  };

  const handleCompleteDelivery = async () => {
    const result = await completeDelivery(orderId);
    if (result.success && isMounted.current) loadOrder();
    else Alert.alert('خطأ', result.error);
  };

  const makePhoneCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
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
      [ORDER_STATUS.PENDING]: 'معلق',
      [ORDER_STATUS.ACCEPTED]: 'تم القبول',
      [ORDER_STATUS.PREPARING]: 'جاري التجهيز',
      [ORDER_STATUS.READY]: 'جاهز للتسليم',
      [ORDER_STATUS.DRIVER_ASSIGNED]: 'تم تعيين مندوب',
      [ORDER_STATUS.ON_THE_WAY]: 'في الطريق',
      [ORDER_STATUS.DELIVERED]: 'تم التوصيل',
      [ORDER_STATUS.CANCELLED]: 'ملغي',
    };
    return texts[status] || status;
  };

  const renderActionButtons = () => {
    if (!order) return null;

    switch(order.status) {
      case ORDER_STATUS.ACCEPTED:
        return (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => updateOrderStatus(orderId, ORDER_STATUS.PREPARING).then(loadOrder)}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamily.arabic }]}>بدء التجهيز</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.priceButton]}
              onPress={() => setShowPriceModal(true)}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamily.arabic }]}>تحديد السعر</Text>
            </TouchableOpacity>
          </View>
        );

      case ORDER_STATUS.PREPARING:
        return (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowPriceModal(true)}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamily.arabic }]}>تحديد السعر</Text>
            </TouchableOpacity>
          </View>
        );

      case ORDER_STATUS.READY:
        return (
          <View>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>اختيار طريقة التوصيل:</Text>
            <View style={styles.deliveryOptions}>
              <TouchableOpacity 
                style={[styles.deliveryOption, styles.selfDelivery]}
                onPress={handleStartDelivery}
              >
                <Ionicons name="person-outline" size={30} color="#FFF" />
                <Text style={[styles.deliveryOptionText, { fontFamily: fontFamily.arabic }]}>توصيل بنفسي</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deliveryOption, styles.driverDelivery]}
                onPress={() => setShowDriversModal(true)}
              >
                <Ionicons name="bicycle-outline" size={30} color="#FFF" />
                <Text style={[styles.deliveryOptionText, { fontFamily: fontFamily.arabic }]}>مندوب</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case ORDER_STATUS.DRIVER_ASSIGNED:
        return (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleStartDelivery}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamily.arabic }]}>بدء التوصيل</Text>
            </TouchableOpacity>
          </View>
        );

      case ORDER_STATUS.ON_THE_WAY:
        return (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteDelivery}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamily.arabic }]}>تم التوصيل</Text>
            </TouchableOpacity>
          </View>
        );

      case ORDER_STATUS.DELIVERED:
        return (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.reviewButton]}
              onPress={() => navigation.navigate('RateOrderScreen', {
                orderId: order.$id,
                providerId: order.merchantId,
                customerId: order.customerPhone,
                providerName: order.merchantName,
              })}
            >
              <Ionicons name="star-outline" size={20} color="#FFF" />
              <Text style={[styles.actionButtonText, { fontFamily: fontFamily.arabic }]}>تقييم الخدمة</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: fontFamily.arabic }]}>تفاصيل الطلب</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* حالة الطلب */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Ionicons name="information-circle" size={40} color={getStatusColor(order.status)} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { fontFamily: fontFamily.arabic, color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
            <Text style={[styles.orderId, { fontFamily: fontFamily.arabic }]}>طلب #{order.$id.slice(-6)}</Text>
          </View>
        </View>

        {/* معلومات العميل */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>معلومات العميل</Text>
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

        {/* وصف الطلب */}
        {order.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>📝 وصف الطلب</Text>
            <View style={styles.descriptionCard}>
              <Text style={[styles.descriptionText, { fontFamily: fontFamily.arabic }]}>{order.description}</Text>
            </View>
          </View>
        )}

        {/* المنتجات */}
        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>📋 المنتجات</Text>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {order.imageUrls.map((url, index) => (
                <TouchableOpacity key={index} onPress={() => openImage(url)}>
                  <Image source={{ uri: url }} style={styles.thumbnail} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ✅ التسجيل الصوتي - مع إمكانية الإيقاف */}
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
                  <Text style={[styles.invoiceLabel, { fontFamily: fontFamily.arabic }]}>تكلفة التوصيل:</Text>
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

        {/* معلومات المندوب */}
        {order.driverName && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic }]}>🚚 معلومات المندوب</Text>
            <View style={styles.driverCard}>
              <View style={styles.driverRow}>
                <Ionicons name="person-outline" size={20} color="#3B82F6" />
                <Text style={[styles.driverName, { fontFamily: fontFamily.arabic }]}>{order.driverName}</Text>
              </View>
              <TouchableOpacity style={styles.driverRow} onPress={() => makePhoneCall(order.driverPhone)}>
                <Ionicons name="call-outline" size={20} color="#3B82F6" />
                <Text style={[styles.driverPhone, styles.phoneLink, { fontFamily: fontFamily.arabic }]}>{order.driverPhone}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* أزرار الإجراءات */}
        {renderActionButtons()}
      </ScrollView>

      {/* Modal عرض الصورة */}
      <Modal visible={showImageModal} transparent animationType="fade">
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.closeImageButton} onPress={() => setShowImageModal(false)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Modal اختيار مندوب */}
      <Modal visible={showDriversModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: fontFamily.arabic }]}>اختر مندوب</Text>
              <TouchableOpacity onPress={() => setShowDriversModal(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={drivers}
              keyExtractor={item => item.$id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.driverItem}
                  onPress={() => handleAssignDriver(item)}
                >
                  <Ionicons name="person-circle-outline" size={40} color="#4F46E5" />
                  <View style={styles.driverItemInfo}>
                    <Text style={[styles.driverItemName, { fontFamily: fontFamily.arabic }]}>{item.name}</Text>
                    <Text style={[styles.driverItemPhone, { fontFamily: fontFamily.arabic }]}>{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { fontFamily: fontFamily.arabic }]}>لا يوجد مندوبين متاحين</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal تحديد السعر */}
      <Modal visible={showPriceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.priceModalContent}>
            <Text style={[styles.modalTitle, { fontFamily: fontFamily.arabic }]}>تحديد السعر</Text>
            
            <Text style={[styles.inputLabel, { fontFamily: fontFamily.arabic }]}>قيمة الطلب *</Text>
            <TextInput
              style={[styles.priceInput, { fontFamily: fontFamily.arabic }]}
              placeholder="مثال: 150"
              placeholderTextColor="#9CA3AF"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { fontFamily: fontFamily.arabic }]}>تكلفة التوصيل (اختياري)</Text>
            <TextInput
              style={[styles.priceInput, { fontFamily: fontFamily.arabic }]}
              placeholder="مثال: 20"
              placeholderTextColor="#9CA3AF"
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPriceModal(false)}>
                <Text style={[styles.cancelButtonText, { fontFamily: fontFamily.arabic }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleSetPrice}>
                <Text style={[styles.confirmButtonText, { fontFamily: fontFamily.arabic }]}>تأكيد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },

  infoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  infoValue: { fontSize: 14, color: '#1F2937', flex: 1 },
  phoneLink: { color: '#3B82F6', textDecorationLine: 'underline' },

  descriptionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  descriptionText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  itemsCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  itemText: { fontSize: 13, color: '#4B5563', marginBottom: 2 },

  imagesContainer: { flexDirection: 'row', marginBottom: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },

  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },

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

  driverCard: { backgroundColor: '#DBEAFE', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#3B82F6' },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1E40AF' },
  driverPhone: { fontSize: 14, color: '#1E40AF' },

  actions: { marginTop: 10, marginBottom: 30 },
  actionButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  priceButton: { backgroundColor: '#F59E0B' },
  completeButton: { backgroundColor: '#10B981' },
  reviewButton: { backgroundColor: '#F59E0B' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  deliveryOptions: { flexDirection: 'row', gap: 12 },
  deliveryOption: { flex: 1, alignItems: 'center', padding: 20, borderRadius: 12, gap: 8 },
  selfDelivery: { backgroundColor: '#F59E0B' },
  driverDelivery: { backgroundColor: '#3B82F6' },
  deliveryOptionText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  priceModalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, margin: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  driverItemInfo: { marginLeft: 12, flex: 1 },
  driverItemName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  driverItemPhone: { fontSize: 12, color: '#6B7280' },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 12 },
  priceInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center' },
  cancelButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', padding: 20 },
});
