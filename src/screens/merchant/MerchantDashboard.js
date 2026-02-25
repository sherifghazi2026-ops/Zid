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
  RefreshControl,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, acceptOrder, setOrderPrice, startDelivery, completeDelivery, assignDriver, ORDER_STATUS } from '../../services/orderService';
import { getUsersByRoleAndType } from '../../appwrite/userService';
import BUSINESS_TYPES, { getBusinessName } from '../../constants/businessTypes';
import { playNotificationSound, stopNotificationSound } from '../../utils/SoundHelper';
import useInterval from '../../hooks/useInterval';

export default function MerchantDashboard({ navigation }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [merchantData, setMerchantData] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [lastOrderIds, setLastOrderIds] = useState(new Set());
  
  // حالات تحديد السعر
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [totalPrice, setTotalPrice] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('10');
  
  // حالات التوصيل
  const [drivers, setDrivers] = useState([]);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  useEffect(() => {
    loadMerchantData();
  }, []);

  useEffect(() => {
    if (merchantData) {
      loadOrders();
      loadDriversByType();
    }
  }, [merchantData, activeTab]);

  useInterval(() => {
    if (merchantData && activeTab === 'pending') {
      loadOrders();
    }
  }, 7000);

  const loadMerchantData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        console.log('✅ بيانات التاجر:', parsed);
        setMerchantData(parsed);
      } else {
        navigation.replace('ServiceProvider');
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات التاجر:', error);
    }
  };

  const loadDriversByType = async () => {
    try {
      if (!merchantData?.merchantType) return;
      
      const result = await getUsersByRoleAndType('driver', merchantData.merchantType);
      if (result.success) {
        const availableDrivers = result.data.filter(driver => driver.isAvailable === true);
        setDrivers(availableDrivers);
      }
    } catch (error) {
      console.error('خطأ في جلب المناديب:', error);
    }
  };

  const loadOrders = async () => {
    try {
      let serviceType = merchantData?.merchantType;
      let statusFilter;
      
      if (activeTab === 'pending') {
        statusFilter = ORDER_STATUS.PENDING;
      } else if (activeTab === 'active') {
        statusFilter = [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.ON_THE_WAY];
      } else {
        statusFilter = ORDER_STATUS.DELIVERED;
      }
      
      const result = await getOrders({ 
        serviceType: serviceType,
        status: statusFilter
      });
      
      if (result.success) {
        const newOrders = result.data;
        const newOrderIds = new Set(newOrders.map(o => o.$id));
        
        if (activeTab === 'pending' && newOrders.length > 0) {
          const hasNewOrder = newOrders.some(order => !lastOrderIds.has(order.$id));
          if (hasNewOrder) {
            playNotificationSound();
            setTimeout(() => stopNotificationSound(), 20000);
          }
        }
        
        if (activeTab === 'pending') {
          setPendingOrders(newOrders);
        } else if (activeTab === 'active') {
          setActiveOrders(newOrders);
        } else {
          setCompletedOrders(newOrders);
        }
        
        setLastOrderIds(newOrderIds);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptOrder = async (order) => {
    Alert.alert(
      'قبول الطلب',
      'هل أنت متأكد من قبول هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول',
          onPress: async () => {
            const result = await acceptOrder(
              order.$id, 
              merchantData.$id, 
              merchantData.name, 
              merchantData.phone
            );
            
            if (result.success) {
              stopNotificationSound();
              setPendingOrders(pendingOrders.filter(o => o.$id !== order.$id));
              
              const acceptedOrder = { 
                ...order, 
                status: ORDER_STATUS.ACCEPTED,
                merchantId: merchantData.$id,
                merchantName: merchantData.name,
                merchantPhone: merchantData.phone,
                acceptedAt: new Date().toISOString()
              };
              
              setActiveOrders(prev => [acceptedOrder, ...prev]);
              
              Alert.alert('تم', 'تم قبول الطلب');
              setActiveTab('active');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleSetPrice = async () => {
    if (!totalPrice || parseFloat(totalPrice) <= 0) {
      Alert.alert('تنبيه', 'الرجاء إدخال سعر صحيح');
      return;
    }

    const result = await setOrderPrice(
      selectedOrder.$id, 
      parseFloat(totalPrice), 
      parseFloat(deliveryFee)
    );

    if (result.success) {
      setPriceModalVisible(false);
      
      setActiveOrders(prev => 
        prev.map(order => 
          order.$id === selectedOrder.$id 
            ? { 
                ...order, 
                totalPrice: parseFloat(totalPrice), 
                deliveryFee: parseFloat(deliveryFee),
                finalTotal: parseFloat(totalPrice) + parseFloat(deliveryFee),
                status: ORDER_STATUS.ACCEPTED
              }
            : order
        )
      );
      
      setSelectedOrder(null);
      setTotalPrice('');
      setDeliveryFee('10');
      
      Alert.alert('تم', 'تم تحديد السعر بنجاح');
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleStartDelivery = async (orderId) => {
    Alert.alert(
      'بدء التوصيل',
      'هل بدأت في توصيل الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم',
          onPress: async () => {
            const result = await startDelivery(orderId);
            if (result.success) {
              setActiveOrders(prev => 
                prev.map(order => 
                  order.$id === orderId 
                    ? { ...order, status: ORDER_STATUS.ON_THE_WAY }
                    : order
                )
              );
              Alert.alert('تم', 'تم بدء التوصيل');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleCompleteDelivery = async (orderId) => {
    Alert.alert(
      'تأكيد التسليم',
      'هل تم تسليم الطلب للعميل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، تم',
          onPress: async () => {
            const result = await completeDelivery(orderId);
            if (result.success) {
              const completedOrder = activeOrders.find(o => o.$id === orderId);
              setActiveOrders(prev => prev.filter(o => o.$id !== orderId));
              setCompletedOrders(prev => [{ ...completedOrder, status: ORDER_STATUS.DELIVERED }, ...prev]);
              Alert.alert('تم', 'تم تأكيد التسليم');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriver) {
      Alert.alert('تنبيه', 'الرجاء اختيار مندوب');
      return;
    }

    const result = await assignDriver(
      selectedOrder.$id, 
      selectedDriver.$id, 
      selectedDriver.name, 
      selectedDriver.phone
    );

    if (result.success) {
      setDriverModalVisible(false);
      
      setActiveOrders(prev => 
        prev.map(order => 
          order.$id === selectedOrder.$id 
            ? { 
                ...order, 
                driverId: selectedDriver.$id,
                driverName: selectedDriver.name,
                driverPhone: selectedDriver.phone,
                status: ORDER_STATUS.PREPARING
              }
            : order
        )
      );
      
      setSelectedOrder(null);
      setSelectedDriver(null);
      Alert.alert('تم', 'تم تعيين المندوب بنجاح');
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const makePhoneCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return '#F59E0B';
      case ORDER_STATUS.ACCEPTED: return '#3B82F6';
      case ORDER_STATUS.PREPARING: return '#8B5CF6';
      case ORDER_STATUS.ON_THE_WAY: return '#3B82F6';
      case ORDER_STATUS.DELIVERED: return '#10B981';
      case ORDER_STATUS.CANCELLED: return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return 'معلق';
      case ORDER_STATUS.ACCEPTED: return 'تم القبول';
      case ORDER_STATUS.PREPARING: return 'قيد التجهيز';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      case ORDER_STATUS.DELIVERED: return 'تم التسليم';
      case ORDER_STATUS.CANCELLED: return 'ملغي';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
    loadDriversByType();
  };

  useEffect(() => {
    return () => {
      stopNotificationSound();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{merchantData?.name || 'مرحباً بك'}</Text>
          <Text style={styles.headerSub}>
            {getBusinessName(merchantData?.merchantType) || 'نشاط تجاري'}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* ثلاثة تبويبات */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            جديدة ({pendingOrders.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            نشطة ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            سابقة ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.ordersContainer}
      >
        {/* ========== طلبات جديدة ========== */}
        {activeTab === 'pending' && (
          pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات جديدة</Text>
            </View>
          ) : (
            pendingOrders.map((order) => (
              <View key={order.$id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>طلب جديد</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <TouchableOpacity 
                    style={styles.detailRow}
                    onPress={() => makePhoneCall(order.customerPhone)}
                  >
                    <Ionicons name="call-outline" size={16} color="#3B82F6" />
                    <Text style={styles.detailText}>{order.customerPhone}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{order.customerAddress}</Text>
                  </View>
                  
                  <View style={styles.itemsContainer}>
                    <Text style={styles.itemsTitle}>الطلبات:</Text>
                    {order.items?.map((item, index) => (
                      <Text key={index} style={styles.itemText}>• {item}</Text>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptOrder(order)}
                >
                  <Text style={styles.acceptButtonText}>قبول الطلب</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}

        {/* ========== طلبات نشطة ========== */}
        {activeTab === 'active' && (
          activeOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات نشطة</Text>
            </View>
          ) : (
            activeOrders.map((order) => {
              const isPriceSet = order.totalPrice && order.totalPrice > 0;
              
              return (
                <View key={order.$id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <TouchableOpacity 
                      style={styles.detailRow}
                      onPress={() => makePhoneCall(order.customerPhone)}
                    >
                      <Ionicons name="call-outline" size={16} color="#3B82F6" />
                      <Text style={styles.detailText}>{order.customerPhone}</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{order.customerAddress}</Text>
                    </View>

                    {order.items && order.items.length > 0 && (
                      <View style={styles.itemsPreview}>
                        <Text style={styles.itemsPreviewText} numberOfLines={1}>
                          {order.items.slice(0, 2).join(' • ')}
                          {order.items.length > 2 && ` +${order.items.length - 2}`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* قسم تحديد السعر - يظهر إذا لم يتم تحديد السعر */}
                  {!isPriceSet && (
                    <View style={styles.priceSection}>
                      <Text style={styles.priceSectionTitle}>💰 يجب تحديد السعر أولاً</Text>
                      <TouchableOpacity
                        style={styles.setPriceButton}
                        onPress={() => {
                          setSelectedOrder(order);
                          setTotalPrice('');
                          setDeliveryFee('10');
                          setPriceModalVisible(true);
                        }}
                      >
                        <Ionicons name="pricetag-outline" size={20} color="#FFF" />
                        <Text style={styles.setPriceButtonText}>تحديد السعر والتوصيل</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* بعد تحديد السعر، تظهر خيارات التوصيل */}
                  {isPriceSet && (
                    <View style={styles.deliverySection}>
                      <View style={styles.priceDisplay}>
                        <Text style={styles.priceDisplayText}>
                          💰 قيمة الطلب: {order.totalPrice} ج
                          {order.deliveryFee > 0 && ` (توصيل: ${order.deliveryFee} ج)`}
                        </Text>
                      </View>

                      <View style={styles.deliveryButtons}>
                        {/* التوصيل بنفسي - يظهر إذا لم يبدأ التوصيل بعد */}
                        {(order.status === ORDER_STATUS.ACCEPTED || order.status === ORDER_STATUS.PREPARING) && !order.driverId && (
                          <TouchableOpacity
                            style={[styles.deliveryButton, styles.selfDeliveryButton]}
                            onPress={() => handleStartDelivery(order.$id)}
                          >
                            <Ionicons name="bicycle-outline" size={20} color="#FFF" />
                            <Text style={styles.deliveryButtonText}>توصيل بنفسي</Text>
                          </TouchableOpacity>
                        )}

                        {/* تعيين مندوب - يظهر إذا لم يتم تعيين مندوب بعد */}
                        {(order.status === ORDER_STATUS.ACCEPTED) && !order.driverId && drivers.length > 0 && (
                          <TouchableOpacity
                            style={[styles.deliveryButton, styles.driverButton]}
                            onPress={() => {
                              setSelectedOrder(order);
                              setSelectedDriver(null);
                              setDriverModalVisible(true);
                            }}
                          >
                            <Ionicons name="people-outline" size={20} color="#FFF" />
                            <Text style={styles.deliveryButtonText}>تعيين مندوب</Text>
                          </TouchableOpacity>
                        )}

                        {/* عرض بيانات المندوب إذا تم تعيينه */}
                        {order.driverName && (
                          <View style={styles.driverInfo}>
                            <Ionicons name="person-circle-outline" size={20} color="#10B981" />
                            <Text style={styles.driverInfoText}>مندوب: {order.driverName}</Text>
                          </View>
                        )}

                        {/* تأكيد التسليم - يظهر عندما يكون الطلب في الطريق */}
                        {order.status === ORDER_STATUS.ON_THE_WAY && (
                          <TouchableOpacity
                            style={[styles.deliveryButton, styles.completeButton]}
                            onPress={() => handleCompleteDelivery(order.$id)}
                          >
                            <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
                            <Text style={styles.deliveryButtonText}>تم التسليم</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )
        )}

        {/* ========== طلبات سابقة ========== */}
        {activeTab === 'completed' && (
          completedOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات سابقة</Text>
            </View>
          ) : (
            completedOrders.map((order) => (
              <View key={order.$id} style={styles.completedCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.statusText, { color: '#10B981' }]}>تم التسليم</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.completedService}>{order.serviceName}</Text>
                  <Text style={styles.completedAddress}>{order.customerAddress}</Text>
                  <Text style={styles.completedDate}>
                    {formatDate(order.deliveredAt || order.createdAt)}
                  </Text>
                  
                  {order.totalPrice > 0 && (
                    <Text style={styles.completedPrice}>
                      الإجمالي: {order.totalPrice + (order.deliveryFee || 0)} ج
                    </Text>
                  )}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Modal تحديد السعر */}
      <Modal visible={priceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تحديد سعر الطلب</Text>
            
            <Text style={styles.label}>قيمة الطلب (جنيه)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: 150"
              value={totalPrice}
              onChangeText={setTotalPrice}
              keyboardType="numeric"
            />

            <Text style={styles.label}>تكلفة التوصيل (جنيه)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10"
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setPriceModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleSetPrice}
              >
                <Text style={styles.confirmButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal تعيين مندوب */}
      <Modal visible={driverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>اختر مندوب</Text>
            
            <ScrollView style={styles.driversList}>
              {drivers.length === 0 ? (
                <View style={styles.noDriversContainer}>
                  <Text style={styles.noDriversText}>لا يوجد مناديب متاحون في هذا القسم</Text>
                </View>
              ) : (
                drivers.map((driver) => (
                  <TouchableOpacity
                    key={driver.$id}
                    style={[
                      styles.driverItem,
                      selectedDriver?.$id === driver.$id && styles.selectedDriverItem
                    ]}
                    onPress={() => setSelectedDriver(driver)}
                  >
                    <Ionicons name="person-circle-outline" size={40} color="#4F46E5" />
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <Text style={styles.driverArea}>{driver.serviceArea || 'غير محدد'}</Text>
                      <Text style={styles.driverPhone}>{driver.phone}</Text>
                    </View>
                    {driver.isAvailable && (
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>متاح</Text>
                      </View>
                    )}
                    {selectedDriver?.$id === driver.$id && (
                      <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setDriverModalVisible(false);
                  setSelectedDriver(null);
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  (!selectedDriver || drivers.length === 0) && styles.disabledButton
                ]} 
                onPress={handleAssignDriver}
                disabled={!selectedDriver || drivers.length === 0}
              >
                <Text style={styles.confirmButtonText}>تأكيد</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  refreshButton: { padding: 4 },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 2,
  },
  activeTab: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 12, color: '#6B7280' },
  activeTabText: { color: '#FFFFFF', fontWeight: '600' },
  
  ordersContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  detailText: { fontSize: 14, color: '#4B5563', flex: 1 },
  itemsContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  itemsTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  itemsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsPreviewText: { fontSize: 13, color: '#6B7280' },
  
  acceptButton: { backgroundColor: '#4F46E5', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  acceptButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  
  // قسم تحديد السعر
  priceSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  setPriceButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  setPriceButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  
  // قسم التوصيل
  deliverySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceDisplay: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  priceDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  deliveryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deliveryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: 120,
  },
  selfDeliveryButton: { backgroundColor: '#3B82F6' },
  driverButton: { backgroundColor: '#8B5CF6' },
  completeButton: { backgroundColor: '#10B981' },
  deliveryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  driverInfoText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  
  completedCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completedService: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  completedAddress: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
  completedDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  completedPrice: { fontSize: 14, fontWeight: '600', color: '#10B981', marginTop: 4 },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  confirmButton: { backgroundColor: '#4F46E5' },
  disabledButton: { backgroundColor: '#9CA3AF', opacity: 0.5 },
  cancelButtonText: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  
  // Driver list
  driversList: { maxHeight: 400 },
  noDriversContainer: { 
    padding: 20, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDriversText: { 
    textAlign: 'center', 
    color: '#6B7280', 
    fontSize: 14,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedDriverItem: {
    borderColor: '#4F46E5',
    borderWidth: 2,
    backgroundColor: '#EEF2FF',
  },
  driverInfo: { marginLeft: 12, flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  driverArea: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  driverPhone: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  availableBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  availableText: { color: '#10B981', fontSize: 10, fontWeight: '600' },
});
