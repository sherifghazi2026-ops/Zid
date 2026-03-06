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
  Linking,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomerDrawer from '../components/CustomerDrawer';
import AIAssistantModal from '../components/AIAssistantModal';
import AiMainModal from '../components/AiMainModal';
import { getOrders, ORDER_STATUS } from '../services/orderService';
import { getVisibleServicesForHome } from '../services/servicesService';
import { useFocusEffect } from '@react-navigation/native';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

const appIcon = require('../../assets/icons/ZidiconSP.png');

// صور مخصصة للخدمات الأساسية
const restaurantImage = require('../../assets/icons/restaurant-8k.png');
const chefImage = require('../../assets/icons/Chef.png');

// صور إضافية مقترحة للخدمات الأساسية (يمكنك تغييرها)
// يمكنك إضافة صور أخرى هنا مثل:
// const restaurantNewImage = require('../../assets/icons/restaurant-new.png');
// const homeChefNewImage = require('../../assets/icons/home-chef-new.png');

export default function HomeScreen({ navigation }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const [activeOrders, setActiveOrders] = useState([]);
  const [expressServices, setExpressServices] = useState([]);
  const [proServices, setProServices] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [chefsCount, setChefsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [restaurantModalVisible, setRestaurantModalVisible] = useState(false);
  const [chefModalVisible, setChefModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    checkLoginStatus();
    loadServices();
    fetchActiveOrders();
    loadChefsCount();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn && userPhone) {
        fetchActiveOrders();
      }
    }, [isLoggedIn, userPhone])
  );

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
    console.log('📥 جلب الخدمات من Appwrite...');
    const result = await getVisibleServicesForHome();
    
    if (result.success) {
      console.log('✅ تم جلب', result.data.length, 'خدمة');

      const express = [];
      const pro = [];
      const other = [];

      result.data.forEach(service => {
        // تصنيف الخدمات
        if (service.id === 'restaurant' || service.id === 'home_chef') {
          // الخدمات الأساسية نضعها في Zid Express
          express.push(service);
        } else if (service.category === 'express') {
          express.push(service);
        } else if (service.category === 'pro') {
          pro.push(service);
        } else {
          other.push(service);
        }
      });

      express.sort((a, b) => (a.order || 0) - (b.order || 0));
      pro.sort((a, b) => (a.order || 0) - (b.order || 0));
      other.sort((a, b) => (a.order || 0) - (b.order || 0));

      setExpressServices(express);
      setProServices(pro);
      setOtherServices(other);
    } else {
      console.log('❌ فشل جلب الخدمات:', result.error);
    }
  };

  const loadChefsCount = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        'users',
        [
          Query.equal('role', 'merchant'),
          Query.equal('merchantType', 'home_chef'),
          Query.equal('isVerified', true),
          Query.equal('active', true),
          Query.limit(1)
        ]
      );
      setChefsCount(response.total || 0);
    } catch (error) {
      console.error('خطأ في جلب عدد الشيفات:', error);
      setChefsCount(0);
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
    loadChefsCount();
  };

  const navigateToService = (service) => {
    if (service.id === 'restaurant') {
      setRestaurantModalVisible(true);
    } else if (service.id === 'home_chef') {
      setChefModalVisible(true);
    } else if (service.id === 'ironing') {
      navigation.navigate('IroningScreen');
    } else if (service.hasItems) {
      navigation.navigate('ItemsServiceScreen', {
        serviceId: service.id,
        serviceName: service.name,
        serviceColor: service.color
      });
    } else {
      navigation.navigate('MainTabs', {
        screen: 'طلب',
        params: {
          screen: 'ServiceScreen',
          params: { serviceType: service.id }
        }
      });
    }
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

  // دالة لجلب صورة الخدمة
  const getServiceImage = (service) => {
    // للخدمات الأساسية، نستخدم الصور المخصصة
    if (service.id === 'restaurant') {
      return restaurantImage;
    } else if (service.id === 'home_chef') {
      return chefImage;
    } else if (service.imageUrl) {
      return { uri: service.imageUrl };
    }
    return null;
  };

  const renderServiceGrid = (services, title, icon, color) => {
    if (services.length === 0) return null;

    // تقسيم الخدمات إلى نشطة ومعطلة
    const activeServices = services.filter(s => s.isActive === true);
    const disabledServices = services.filter(s => s.isActive === false);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {title === 'Zid Express' && (
            <View style={[styles.countBadge, { backgroundColor: '#10B981' }]}>
              <Ionicons name="flash" size={12} color="#FFF" />
              <Text style={styles.countBadgeText}>AI</Text>
            </View>
          )}
        </View>

        <View style={styles.grid}>
          {/* الخدمات النشطة أولاً */}
          {activeServices.map((service) => {
            const key = service.$id ? service.$id : `core_${service.id}`;
            const serviceImage = getServiceImage(service);
            
            return (
              <TouchableOpacity
                key={key}
                style={[styles.card, { width: CARD_SIZE }]}
                onPress={() => navigateToService(service)}
                activeOpacity={0.8}
              >
                {serviceImage ? (
                  <Image source={serviceImage} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: service.color + '30' }]}>
                    <Ionicons name={service.icon || 'apps-outline'} size={40} color={service.color || '#6B7280'} />
                  </View>
                )}
                <View style={styles.overlay}>
                  <Text style={styles.cardTitle}>{service.name}</Text>
                  {(service.id === 'restaurant' || service.id === 'home_chef') && (
                    <Text style={styles.cardSubtitle}>AI مساعد</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* الخدمات المعطلة */}
          {disabledServices.map((service) => {
            const key = service.$id ? `${service.$id}_disabled` : `core_${service.id}_disabled`;
            const serviceImage = getServiceImage(service);
            
            return (
              <TouchableOpacity
                key={key}
                style={[styles.card, styles.disabledCard, { width: CARD_SIZE }]}
                disabled={true}
                activeOpacity={1}
              >
                {serviceImage ? (
                  <Image source={serviceImage} style={[styles.cardImage, styles.disabledImage]} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: (service.color || '#6B7280') + '15' }]}>
                    <Ionicons name={service.icon || 'apps-outline'} size={40} color={(service.color || '#6B7280') + '80'} />
                  </View>
                )}
                <View style={[styles.overlay, styles.disabledOverlay]}>
                  <Text style={[styles.cardTitle, styles.disabledCardTitle]}>{service.name}</Text>
                  {(service.id === 'restaurant' || service.id === 'home_chef') && (
                    <Text style={[styles.cardSubtitle, styles.disabledCardSubtitle]}>AI مساعد</Text>
                  )}
                  <View style={styles.maintenanceBadge}>
                    <Text style={styles.maintenanceText}>{service.maintenanceText || 'جاري التحديث'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* مساحة للوقت */}
      <View style={styles.statusBarSpace} />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* زر القائمة المحسن */}
          <TouchableOpacity 
            onPress={() => setDrawerVisible(true)} 
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={23} color="#1F2937" />
          </TouchableOpacity>
          <Image source={appIcon} style={styles.logo} />
        </View>
        <View style={styles.headerRight}>
          {!isLoggedIn ? (
            <TouchableOpacity 
              onPress={handleLoginPress} 
              style={styles.registerButton}
            >
              <Ionicons name="log-in-outline" size={20} color="#4F46E5" />
              <Text style={styles.registerText}>دخول</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => setDrawerVisible(true)} 
              style={styles.profileButton}
            >
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'م'}</Text>
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

      {isLoggedIn && activeOrders.length > 0 && (
        <View style={styles.ordersSection}>
          <Text style={styles.ordersTitle}>طلباتك الحالية</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ordersScroll}>
            {activeOrders.map((order) => (
              <TouchableOpacity key={order.$id} style={styles.orderCard} onPress={() => navigation.navigate('OrderTracking', { orderId: order.$id })}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
                  </View>
                </View>
                <Text style={styles.orderService}>{order.serviceName}</Text>
                <View style={styles.orderContactRow}>
                  {order.merchantPhone && (<TouchableOpacity onPress={() => makePhoneCall(order.merchantPhone)}><Ionicons name="call" size={16} color="#3B82F6" /></TouchableOpacity>)}
                  {order.driverPhone && (<TouchableOpacity onPress={() => makePhoneCall(order.driverPhone)}><Ionicons name="bicycle" size={16} color="#10B981" /></TouchableOpacity>)}
                </View>
                {order.totalPrice > 0 && (<Text style={styles.orderPrice}>{order.totalPrice} ج</Text>)}
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.content}>
        {/* Zid Express - الآن يضم المطاعم وأكل بيتي معاً */}
        {renderServiceGrid(expressServices, 'Zid Express', 'rocket-outline', '#F59E0B')}
        
        {/* Zid Pro */}
        {renderServiceGrid(proServices, 'Zid Pro', 'construct-outline', '#3B82F6')}
        
        {/* خدمات أخرى */}
        {renderServiceGrid(otherServices, 'خدمات أخرى', 'apps-outline', '#6B7280')}

        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomerDrawer isLoggedIn={isLoggedIn} userData={userData} onClose={() => setDrawerVisible(false)} navigation={navigation} onOpenAdminModal={openAdminModal} />
          </View>
        </View>
      </Modal>

      <Modal visible={adminModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>دخول الأدمن</Text>
            <Text style={styles.modalSubtitle}>أدخل كلمة المرور الخاصة</Text>
            <TextInput style={styles.modalInput} placeholder="كلمة المرور" placeholderTextColor="#9CA3AF" secureTextEntry value={adminPassword} onChangeText={setAdminPassword} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => { setAdminModalVisible(false); setAdminPassword(''); }}>
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalConfirm]} onPress={handleAdminAccess}>
                <Text style={styles.modalConfirmText}>دخول</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* مودال المطاعم */}
      <AIAssistantModal visible={restaurantModalVisible} onClose={() => setRestaurantModalVisible(false)} userLocation={null} />

      {/* مودال الشيفات */}
      <AiMainModal visible={chefModalVisible} onClose={() => setChefModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusBarSpace: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 70,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  logo: {
    width: 100,
    height: 50,
    marginRight: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  registerText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  profileButton: {
    padding: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 5,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
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
  promoText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
  ordersSection: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  ordersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'right',
  },
  ordersScroll: {
    flexDirection: 'row',
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderService: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderContactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  content: {
    padding: 16,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 2,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledCard: {
    opacity: 1,
  },
  disabledImage: {
    opacity: 0.5,
  },
  disabledOverlay: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  disabledCardTitle: {
    color: '#FFF',
    opacity: 0.9,
  },
  disabledCardSubtitle: {
    color: '#FFD700',
    opacity: 0.7,
    fontSize: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#FFD700',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  maintenanceBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  maintenanceText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalConfirm: {
    backgroundColor: '#EF4444',
  },
  modalCancelText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
