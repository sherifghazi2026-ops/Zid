import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { getOrders, acceptOrder, ORDER_STATUS } from '../../services/orderService';
import { playNotificationSound, stopNotificationSound } from '../../utils/SoundHelper';
import useInterval from '../../hooks/useInterval';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MerchantOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const lastOrderIds = useRef(new Set());
  const [activeTab, setActiveTab] = useState('pending');
  const [sound, setSound] = useState(null);
  const soundTimeout = useRef(null);

  useEffect(() => {
    loadUserData();
    return () => {
      stopNotificationSound();
      if (soundTimeout.current) clearTimeout(soundTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (userData) {
      console.log('👤 بيانات التاجر:', userData);
      console.log('📌 merchantType:', userData.merchantType);
      loadOrders();
      playSoundForPendingOrders();
    }
  }, [userData]);

  // التحقق من الطلبات الجديدة كل 3 ثواني
  useInterval(() => {
    if (userData) {
      checkForNewOrders();
    }
  }, 3000);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const user = JSON.parse(data);
      setUserData(user);
    }
  };

  // ✅ تشغيل الصوت للطلبات المعلقة عند فتح الشاشة
  const playSoundForPendingOrders = async () => {
    try {
      const result = await getOrders({ status: ORDER_STATUS.PENDING });
      if (result.success) {
        const pendingForMerchant = result.data.filter(order => 
          order.serviceType === userData?.merchantType
        );
        
        if (pendingForMerchant.length > 0) {
          console.log('🔔 طلبات معلقة، تشغيل التنبيه');
          playLoopingSound();
        }
      }
    } catch (error) {
      console.error('خطأ في التحقق من الطلبات المعلقة:', error);
    }
  };

  // ✅ تشغيل الصوت في حلقة لمدة 20 ثانية
  const playLoopingSound = async () => {
    try {
      // إيقاف أي صوت سابق
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      console.log('🔊 تشغيل صوت التنبيه في حلقة لمدة 20 ثانية');
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/notification.wav'),
        { shouldPlay: true, isLooping: true }
      );
      
      setSound(newSound);

      // إيقاف الصوت بعد 20 ثانية
      if (soundTimeout.current) clearTimeout(soundTimeout.current);
      soundTimeout.current = setTimeout(async () => {
        console.log('⏹️ إيقاف صوت التنبيه بعد 20 ثانية');
        if (newSound) {
          await newSound.stopAsync();
          await newSound.unloadAsync();
        }
        setSound(null);
      }, 20000);

    } catch (error) {
      console.error('❌ خطأ في تشغيل الصوت:', error);
    }
  };

  // ✅ إيقاف الصوت
  const stopLoopingSound = async () => {
    if (sound) {
      console.log('⏹️ إيقاف صوت التنبيه');
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    if (soundTimeout.current) {
      clearTimeout(soundTimeout.current);
      soundTimeout.current = null;
    }
  };

  const checkForNewOrders = async () => {
    try {
      const result = await getOrders({ status: ORDER_STATUS.PENDING });
      console.log('📦 جميع الطلبات المعلقة:', result.data.length);

      if (result.success) {
        const merchantOrders = result.data.filter(order => {
          const match = order.serviceType === userData?.merchantType ||
                        order.serviceType === userData?.serviceType;
          console.log(`🔍 طلب ${order.$id}: serviceType=${order.serviceType}, match=${match}`);
          return match;
        });

        console.log('✅ طلبات التاجر:', merchantOrders.length);

        // التحقق من وجود طلبات جديدة
        const newOrderIds = new Set(merchantOrders.map(o => o.$id));
        const hasNewOrder = [...newOrderIds].some(id => !lastOrderIds.current.has(id));

        if (hasNewOrder && merchantOrders.length > 0) {
          console.log('🔔 تم اكتشاف طلب جديد، تشغيل notification.wav');
          playLoopingSound();
        }

        lastOrderIds.current = newOrderIds;

        if (activeTab === 'pending') {
          setOrders(merchantOrders);
        }
      }
    } catch (error) {
      console.error('خطأ في التحقق من الطلبات:', error);
    }
  };

  const loadOrders = async () => {
    try {
      let statusFilter;
      switch(activeTab) {
        case 'pending':
          statusFilter = ORDER_STATUS.PENDING;
          break;
        case 'active':
          statusFilter = [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.ON_THE_WAY];
          break;
        case 'completed':
          statusFilter = ORDER_STATUS.DELIVERED;
          break;
        default:
          statusFilter = ORDER_STATUS.PENDING;
      }

      console.log(`📥 جلب الطلبات للحالة: ${statusFilter}`);
      const result = await getOrders({ status: statusFilter });

      if (result.success) {
        console.log(`📦 إجمالي الطلبات من Appwrite: ${result.data.length}`);

        const merchantOrders = result.data.filter(order => {
          const match = order.serviceType === userData?.merchantType ||
                        order.serviceType === userData?.serviceType;
          console.log(`🔍 طلب ${order.$id}: serviceType=${order.serviceType}, match=${match}`);
          return match;
        });

        console.log(`✅ طلبات التاجر بعد الفلترة: ${merchantOrders.length}`);

        if (activeTab === 'pending') {
          // تحديث lastOrderIds للطلبات المعلقة
          lastOrderIds.current = new Set(merchantOrders.map(o => o.$id));
        }

        setOrders(merchantOrders);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
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
              userData.$id,
              userData.name,
              userData.phone
            );
            if (result.success) {
              // ✅ إيقاف الصوت فوراً عند قبول الطلب
              stopLoopingSound();
              loadOrders();
              Alert.alert('✅ تم', 'تم قبول الطلب بنجاح');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
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

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetailsScreen', { orderId: item.$id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>طلب #{item.$id.slice(-6)}</Text>
          <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleTimeString('ar-EG')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color="#4F46E5" />
          <Text style={styles.infoText}>{item.customerPhone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#EF4444" />
          <Text style={styles.infoText} numberOfLines={1}>{item.customerAddress}</Text>
        </View>
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsTitle}>المنتجات:</Text>
          {item.items.map((itm, idx) => (
            <Text key={idx} style={styles.itemText}>• {itm}</Text>
          ))}
        </View>
      )}

      {item.totalPrice > 0 && (
        <Text style={styles.totalPrice}>الإجمالي: {item.totalPrice} ج</Text>
      )}

      {item.status === ORDER_STATUS.PENDING && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptOrder(item)}
        >
          <Text style={styles.acceptButtonText}>قبول الطلب</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>الطلبات</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* التبويبات */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            معلقة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            نشطة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            منتهية
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد طلبات</Text>
          </View>
        }
      />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // التبويبات
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeTab: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#FFF', fontWeight: '600' },

  list: { padding: 16 },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  orderTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  customerInfo: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1 },
  itemsContainer: { marginVertical: 8, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
  itemsTitle: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  totalPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginTop: 4 },
  acceptButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});
