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
  RefreshControl,
  Modal,
  Linking,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, startDelivery, completeDelivery, ORDER_STATUS } from '../../services/orderService';
import { updateDriverAvailability } from '../../appwrite/userService';
import CustomDrawer from '../../components/CustomDrawer';
import useInterval from '../../hooks/useInterval';
import { playNotificationSound, stopNotificationSound } from '../../utils/SoundHelper';

export default function DriverDashboard({ navigation }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const lastOrderIds = useRef(new Set());

  // حالات الصوت
  const [playingVoice, setPlayingVoice] = useState(null);
  const [sound, setSound] = useState(null);

  const [isAvailable, setIsAvailable] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    loadDriverData();
  }, []);

  useEffect(() => {
    if (driverData) {
      setIsAvailable(driverData.isAvailable !== false);
      loadOrders();
    }
  }, [driverData, activeTab]);

  useInterval(() => {
    if (driverData && activeTab === 'pending') {
      loadOrders();
    }
  }, 7000);

  const playVoice = async (voiceUrl) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      console.log('🔊 تشغيل الصوت:', voiceUrl);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setPlayingVoice(voiceUrl);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingVoice(null);
        }
      });
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', error);
      Alert.alert('خطأ', 'فشل تشغيل التسجيل الصوتي');
    }
  };

  const loadDriverData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const parsed = JSON.parse(data);
      console.log('✅ بيانات المندوب:', parsed);
      setDriverData(parsed);
    }
  };

  const toggleAvailability = async () => {
    setUpdatingAvailability(true);
    const newStatus = !isAvailable;

    const result = await updateDriverAvailability(driverData.$id, newStatus);

    if (result.success) {
      setIsAvailable(newStatus);
      const updatedData = { ...driverData, isAvailable: newStatus };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
      setDriverData(updatedData);
      Alert.alert('تم', `أنت الآن ${newStatus ? 'متاح' : 'غير متاح'} للتوصيل`);
    } else {
      Alert.alert('خطأ', result.error);
    }
    setUpdatingAvailability(false);
  };

  const loadOrders = async () => {
    try {
      let statusFilter;

      if (activeTab === 'pending') {
        statusFilter = ORDER_STATUS.PREPARING;
      } else if (activeTab === 'active') {
        statusFilter = ORDER_STATUS.ON_THE_WAY;
      } else {
        statusFilter = ORDER_STATUS.DELIVERED;
      }

      const result = await getOrders({
        driverId: driverData?.$id,
        status: statusFilter
      });

      if (result.success) {
        const newOrders = result.data;
        const newOrderIds = new Set(newOrders.map(o => o.$id));

        if (activeTab === 'pending' && newOrders.length > 0) {
          const hasNewOrder = newOrders.some(order => !lastOrderIds.current.has(order.$id));
          if (hasNewOrder) {
            playNotificationSound();
            setTimeout(() => stopNotificationSound(), 20000);
          }
        }

        lastOrderIds.current = newOrderIds;

        if (activeTab === 'pending') {
          setPendingOrders(newOrders);
        } else if (activeTab === 'active') {
          setActiveOrders(newOrders);
        } else {
          setCompletedOrders(newOrders);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartDelivery = async (orderId) => {
    Alert.alert(
      'بدء التوصيل',
      'هل أنت متأكد من بدء التوصيل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'بدء',
          onPress: async () => {
            setUpdatingOrder(orderId);
            stopNotificationSound();

            const result = await startDelivery(orderId);
            if (result.success) {
              setPendingOrders(pendingOrders.filter(o => o.$id !== orderId));
              Alert.alert('تم', 'تم بدء التوصيل');
              setTimeout(() => {
                setActiveTab('active');
                loadOrders();
              }, 500);
            } else {
              Alert.alert('خطأ', result.error);
            }
            setUpdatingOrder(null);
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
            setUpdatingOrder(orderId);

            const result = await completeDelivery(orderId);
            if (result.success) {
              setActiveOrders(activeOrders.filter(o => o.$id !== orderId));
              Alert.alert('تم', 'تم تأكيد التسليم');
              setTimeout(() => {
                setActiveTab('completed');
                loadOrders();
              }, 500);
            } else {
              Alert.alert('خطأ', result.error);
            }
            setUpdatingOrder(null);
          }
        }
      ]
    );
  };

  const makePhoneCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case ORDER_STATUS.PREPARING: return '#8B5CF6';
      case ORDER_STATUS.ON_THE_WAY: return '#3B82F6';
      case ORDER_STATUS.DELIVERED: return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case ORDER_STATUS.PREPARING: return 'جاهز للتوصيل';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      case ORDER_STATUS.DELIVERED: return 'تم التسليم';
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
  };

  useEffect(() => {
    return () => {
      stopNotificationSound();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>مرحباً، {driverData?.name || 'مندوب'}</Text>
          <Text style={styles.headerSub}>{driverData?.serviceArea || 'منطقة الخدمة'}</Text>
        </View>

        <View style={styles.availabilityContainer}>
          {updatingAvailability ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <>
              <Text style={[styles.availabilityText, { color: isAvailable ? '#10B981' : '#EF4444' }]}>
                {isAvailable ? 'متاح' : 'غير متاح'}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={isAvailable ? '#FFF' : '#F3F4F6'}
                style={styles.availabilitySwitch}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            جاهزة ({pendingOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            جاري التوصيل ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            تم التسليم ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.ordersContainer}
      >
        {activeTab === 'pending' && (
          pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bicycle-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات جاهزة</Text>
            </View>
          ) : (
            pendingOrders.map((order) => (
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
                    <Text style={styles.detailText}>العميل: {order.customerPhone}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => makePhoneCall(order.merchantPhone)}
                  >
                    <Ionicons name="business-outline" size={16} color="#F59E0B" />
                    <Text style={styles.detailText}>التاجر: {order.merchantName}</Text>
                  </TouchableOpacity>

                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{order.customerAddress}</Text>
                  </View>

                  {order.voiceUrl && (
                    <TouchableOpacity
                      style={styles.voiceButton}
                      onPress={() => playVoice(order.voiceUrl)}
                    >
                      <Ionicons
                        name={playingVoice === order.voiceUrl ? "pause" : "play"}
                        size={20}
                        color="#FFF"
                      />
                      <Text style={styles.voiceButtonText}>
                        {playingVoice === order.voiceUrl ? 'جاري التشغيل' : 'استمع للتسجيل'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {order.totalPrice > 0 && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>قيمة الطلب:</Text>
                      <Text style={styles.priceValue}>{order.totalPrice} ج</Text>
                      {order.deliveryFee > 0 && (
                        <>
                          <Text style={styles.priceLabel}>+ توصيل:</Text>
                          <Text style={styles.priceValue}>{order.deliveryFee} ج</Text>
                        </>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleStartDelivery(order.$id)}
                  disabled={updatingOrder === order.$id}
                >
                  {updatingOrder === order.$id ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="bicycle-outline" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>بدء التوصيل</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )
        )}

        {activeTab === 'active' && (
          activeOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات جاري توصيلها</Text>
            </View>
          ) : (
            activeOrders.map((order) => (
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
                    <Text style={styles.detailText}>العميل: {order.customerPhone}</Text>
                  </TouchableOpacity>

                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{order.customerAddress}</Text>
                  </View>

                  {order.voiceUrl && (
                    <TouchableOpacity
                      style={styles.voiceButton}
                      onPress={() => playVoice(order.voiceUrl)}
                    >
                      <Ionicons
                        name={playingVoice === order.voiceUrl ? "pause" : "play"}
                        size={20}
                        color="#FFF"
                      />
                      <Text style={styles.voiceButtonText}>
                        {playingVoice === order.voiceUrl ? 'جاري التشغيل' : 'استمع للتسجيل'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {order.totalPrice > 0 && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>قيمة الطلب:</Text>
                      <Text style={styles.priceValue}>{order.totalPrice} ج</Text>
                      {order.deliveryFee > 0 && (
                        <Text style={styles.priceValue}> + {order.deliveryFee} ج</Text>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => handleCompleteDelivery(order.$id)}
                  disabled={updatingOrder === order.$id}
                >
                  {updatingOrder === order.$id ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>تم التسليم</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )
        )}

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

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomDrawer
              userData={driverData}
              onClose={() => setDrawerVisible(false)}
              navigation={navigation}
            />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: { padding: 4 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  availabilitySwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },

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
  activeTab: { backgroundColor: '#3B82F6' },
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
  voiceButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  voiceButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  priceLabel: { fontSize: 14, color: '#4B5563' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

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

  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '80%',
    overflow: 'hidden',
  },
});
