import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomerDrawer from '../components/CustomerDrawer';
import { getOrders, ORDER_STATUS } from '../services/orderService';
import { getAllServices } from '../services/servicesService'; // تغيير من getActiveServices إلى getAllServices

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 64) / 2;

const appIcon = require('../../assets/icons/Zidicon.png');

const images = {
  supermarket: require('../../assets/icons/supermarket-8k.png'),
  restaurant: require('../../assets/icons/restaurant-8k.png'),
  pharmacy: require('../../assets/icons/pharmacy-8k.png'),
  ironing: require('../../assets/icons/ironing-8k.png'),
  plumbing: require('../../assets/icons/plumbing-8k.png'),
  kitchen: require('../../assets/icons/Kitchen.png'),
  carpentry: require('../../assets/icons/carpentry-8k.png'),
  marble: require('../../assets/icons/marble-8k.png'),
  winch: require('../../assets/icons/winch-8k.png'),
  electrician: require('../../assets/icons/electrician-8k.png'),
  moving: require('../../assets/icons/moving-8k.png'),
};

export default function CustomerScreen({ navigation }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const [activeOrders, setActiveOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    checkLoginStatus();
    loadServices();
    fetchActiveOrders();
  }, []);

  const checkLoginStatus = async () => {
    const data = await AsyncStorage.getItem('userData');
    const phone = await AsyncStorage.getItem('userPhone');
    if (data) {
      setUserData(JSON.parse(data));
      setIsLoggedIn(true);
    }
    if (phone) setUserPhone(phone || '');
  };

  const loadServices = async () => {
    const result = await getAllServices(); // جلب كل الخدمات (نشطة وغير نشطة)
    if (result.success) {
      setServices(result.data);
    }
  };

  const fetchActiveOrders = async () => {
    if (!isLoggedIn || !userPhone) return;

    setLoading(true);
    try {
      const result = await getOrders({ 
        customerPhone: userPhone,
        status: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.ON_THE_WAY]
      });

      if (result.success) {
        setActiveOrders(result.data);
      }
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
    fetchActiveOrders();
  };

  const navigateToService = (serviceScreen, serviceId) => {
    navigation.navigate('MainTabs', {
      screen: 'طلب',
      params: {
        screen: serviceScreen,
        params: { serviceType: serviceId }
      }
    });
  };

  const handleLoginPress = () => {
    navigation.navigate('CustomerAuth');
  };

  const handleAdminAccess = () => {
    const SECRET_ADMIN_PASSWORD = "admin2026";
    if (adminPassword === SECRET_ADMIN_PASSWORD) {
      setAdminModalVisible(false);
      setAdminPassword('');
      navigation.navigate('AdminHome');
    } else {
      Alert.alert('خطأ', 'كلمة المرور غير صحيحة');
      setAdminPassword('');
    }
  };

  const openAdminModal = () => {
    setAdminModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return '#F59E0B';
      case ORDER_STATUS.ACCEPTED: return '#3B82F6';
      case ORDER_STATUS.PREPARING: return '#8B5CF6';
      case ORDER_STATUS.ON_THE_WAY: return '#3B82F6';
      case ORDER_STATUS.DELIVERED: return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return 'معلق';
      case ORDER_STATUS.ACCEPTED: return 'تم القبول';
      case ORDER_STATUS.PREPARING: return 'قيد التجهيز';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      default: return status;
    }
  };

  // تجميع الخدمات في أزواج للعرض
  const servicePairs = [];
  for (let i = 0; i < services.length; i += 2) {
    servicePairs.push({
      left: services[i],
      right: services[i + 1] || null
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => setDrawerVisible(true)} 
            style={styles.menuButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="menu" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Image source={appIcon} style={styles.logo} />
        </View>
        
        <View style={styles.headerRight}>
          {!isLoggedIn ? (
            <TouchableOpacity 
              onPress={handleLoginPress} 
              style={styles.registerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-in-outline" size={20} color="#4F46E5" />
              <Text style={styles.registerText}>تسجيل الدخول</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => setDrawerVisible(true)} 
              style={styles.profileButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>
                  {userData?.name?.charAt(0) || 'م'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoggedIn && (
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>مرحباً، {userData?.name || 'عميلنا العزيز'}</Text>
        </View>
      )}

      {!isLoggedIn && (
        <View style={styles.promoSection}>
          <Text style={styles.promoText}>✨ سجل الآن لتستفيد بتجربة أفضل ومتابعة طلباتك</Text>
        </View>
      )}

      {/* الطلبات الحالية */}
      {isLoggedIn && activeOrders.length > 0 && (
        <View style={styles.ordersSection}>
          <Text style={styles.ordersTitle}>طلباتك الحالية</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.ordersScroll}
          >
            {activeOrders.map((order) => (
              <TouchableOpacity
                key={order.$id}
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderTracking', { orderId: order.$id })}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderService}>{order.serviceName}</Text>
                {order.totalPrice > 0 && (
                  <Text style={styles.orderPrice}>{order.totalPrice} ج</Text>
                )}
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* شبكة الخدمات - تعرض كل الخدمات مع حالة معتمة للمعطلة */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.gridContainer}
      >
        {servicePairs.map((pair, index) => (
          <View key={index} style={styles.row}>
            {pair.left && (
              <TouchableOpacity
                style={[
                  styles.card, 
                  { width: CARD_SIZE },
                  !pair.left.isActive && styles.disabledCard // إضافة تأثير معتم إذا كانت الخدمة معطلة
                ]}
                onPress={() => pair.left.isActive ? navigateToService(pair.left.screen, pair.left.id) : null}
                activeOpacity={0.8}
                disabled={!pair.left.isActive}
              >
                <Image source={images[pair.left.id]} style={[styles.cardImage, !pair.left.isActive && styles.disabledImage]} />
                <View style={styles.overlay}>
                  <Text style={styles.cardTitle}>{pair.left.name}</Text>
                  {!pair.left.isActive && (
                    <View style={styles.maintenanceBadge}>
                      <Text style={styles.maintenanceText}>جاري التحديث</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {pair.right && (
              <TouchableOpacity
                style={[
                  styles.card, 
                  { width: CARD_SIZE },
                  !pair.right.isActive && styles.disabledCard
                ]}
                onPress={() => pair.right.isActive ? navigateToService(pair.right.screen, pair.right.id) : null}
                activeOpacity={0.8}
                disabled={!pair.right.isActive}
              >
                <Image source={images[pair.right.id]} style={[styles.cardImage, !pair.right.isActive && styles.disabledImage]} />
                <View style={styles.overlay}>
                  <Text style={styles.cardTitle}>{pair.right.name}</Text>
                  {!pair.right.isActive && (
                    <View style={styles.maintenanceBadge}>
                      <Text style={styles.maintenanceText}>جاري التحديث</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {!pair.right && <View style={{ width: CARD_SIZE }} />}
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomerDrawer 
              isLoggedIn={isLoggedIn}
              userData={userData}
              onClose={() => setDrawerVisible(false)}
              navigation={navigation}
              onOpenAdminModal={openAdminModal}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={adminModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>دخول الأدمن</Text>
            <Text style={styles.modalSubtitle}>أدخل كلمة المرور الخاصة</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="كلمة المرور"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setAdminModalVisible(false);
                  setAdminPassword('');
                }}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={handleAdminAccess}
              >
                <Text style={styles.modalConfirmText}>دخول</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: { padding: 8, borderRadius: 8 },
  logo: { width: 80, height: 80, borderRadius: 40 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 6,
    minHeight: 44,
  },
  registerText: { color: '#4F46E5', fontSize: 14, fontWeight: '500' },
  profileButton: { padding: 4 },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  welcomeSection: { paddingHorizontal: 16, paddingVertical: 12 },
  welcomeText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  
  promoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  promoText: { fontSize: 13, color: '#92400E', textAlign: 'center' },

  ordersSection: { marginTop: 8, marginBottom: 16, paddingHorizontal: 16 },
  ordersTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8, textAlign: 'right' },
  ordersScroll: { flexDirection: 'row' },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  orderStatusText: { fontSize: 10, fontWeight: '600' },
  orderService: { fontSize: 14, fontWeight: '500', color: '#1F2937', marginBottom: 4 },
  orderPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginBottom: 2 },
  orderDate: { fontSize: 10, color: '#9CA3AF' },

  gridContainer: { paddingTop: 12, paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  card: { height: 160, borderRadius: 20, overflow: 'hidden', elevation: 4 },
  cardImage: { width: '100%', height: '100%' },
  disabledCard: { opacity: 0.7 },
  disabledImage: { opacity: 0.5 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  maintenanceBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  maintenanceText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  modalCancel: { backgroundColor: '#F3F4F6' },
  modalConfirm: { backgroundColor: '#EF4444' },
  modalCancelText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
  modalConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
