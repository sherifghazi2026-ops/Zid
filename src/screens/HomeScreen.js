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
import CustomDrawer from '../components/CustomDrawer';
import { getOrders, ORDER_STATUS } from '../services/orderService';
import { getVisibleServicesForHome } from '../services/servicesService';
import { useFocusEffect } from '@react-navigation/native';
import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';
import { fontFamily } from '../utils/fonts';
import DynamicMongez from '../components/DynamicMongez';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

const appIcon = require('../../assets/icons/ZidiconSP.png');
const restaurantImage = require('../../assets/icons/restaurant-8k.png');
const chefImage = require('../../assets/icons/Chef.png');

// تعريف التصنيفات وترتيبها
const CATEGORY_ORDER = {
  'express': 1,
  'pro': 2,
  'ai': 3,
  'other': 4
};

const CATEGORY_TITLES = {
  'express': 'Zid Express',
  'pro': 'Zid Pro',
  'ai': 'خدمات AI',
  'other': 'خدمات أخرى'
};

const CATEGORY_COLORS = {
  'express': '#F59E0B',
  'pro': '#3B82F6',
  'ai': '#8B5CF6',
  'other': '#6B7280'
};

const HomeScreen = ({ navigation }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [groupedServices, setGroupedServices] = useState({});
  const [chefsCount, setChefsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showActiveOrders, setShowActiveOrders] = useState(true);
  const [userRole, setUserRole] = useState(null);

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
    loadChefsCount();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn && userPhone) {
        fetchAllOrders();
      }
    }, [isLoggedIn, userPhone])
  );

  const checkLoginStatus = async () => {
    const data = await AsyncStorage.getItem('userData');
    const phone = await AsyncStorage.getItem('userPhone');
    const role = await AsyncStorage.getItem('userRole');

    if (data) {
      setUserData(JSON.parse(data));
      setIsLoggedIn(true);
    }
    if (phone) setUserPhone(phone || '');
    if (role) setUserRole(role);
  };

  const loadServices = async () => {
    console.log('📥 جلب الخدمات من Appwrite...');
    const result = await getVisibleServicesForHome();

    if (result.success) {
      console.log('✅ تم جلب', result.data.length, 'خدمة');

      // تصفية الخدمات غير المرغوب فيها
      const filteredServices = result.data.filter(service => {
        const excludeIds = ['mongez', 'assistant', 'vegetables', 'fruits'];
        const excludeNames = ['منحز', 'Mongez', 'الخضار والفاكهة', 'خضار', 'فاكهة'];
        if (excludeIds.includes(service.id)) return false;
        if (excludeNames.includes(service.name)) return false;
        return true;
      });

      // ترتيب الخدمات حسب الطلب
      const sortedServices = filteredServices.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return (a.order || 0) - (b.order || 0);
      });

      setServices(sortedServices);

      // تجميع الخدمات حسب التصنيف
      const grouped = {};
      sortedServices.forEach(service => {
        const category = service.category || 'other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(service);
      });

      setGroupedServices(grouped);
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

  const fetchAllOrders = async () => {
    if (!isLoggedIn || !userPhone) return;
    setLoading(true);
    try {
      const activeResult = await getOrders({
        customerPhone: userPhone,
        status: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.ON_THE_WAY]
      });

      const completedResult = await getOrders({
        customerPhone: userPhone,
        status: ORDER_STATUS.DELIVERED
      });

      if (activeResult.success) {
        setActiveOrders(activeResult.data);
      }
      if (completedResult.success) {
        setCompletedOrders(completedResult.data);
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
    if (isLoggedIn) {
      fetchAllOrders();
    }
    loadChefsCount();
  };

  const navigateToService = (service) => {
    // ✅ التحقق من تسجيل الدخول أولاً
    if (!isLoggedIn) {
      Alert.alert(
        'تنبيه',
        'يجب تسجيل الدخول أولاً لاستخدام الخدمات',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تسجيل الدخول', onPress: () => navigation.navigate('CustomerAuth') }
        ]
      );
      return;
    }

    if (!service.isActive) {
      Alert.alert('تنبيه', service.maintenanceText || 'هذه الخدمة غير متاحة حالياً');
      return;
    }

    if (service.id === 'restaurant') {
      navigation.navigate('RestaurantList');
    }
    else if (service.id === 'home_chef') {
      navigation.navigate('HomeChefsScreen');
    }
    else if (service.hasItems && service.itemsCollection && service.type === 'items') {
      navigation.navigate('ProvidersListScreen', {
        serviceId: service.id,
        serviceName: service.name,
        merchantType: service.merchantType || service.id
      });
    }
    else if (service.hasItems && service.type === 'items_service') {
      navigation.navigate('ItemsServiceScreen', {
        serviceId: service.id,
        serviceName: service.name,
        serviceColor: service.color
      });
    }
    else {
      navigation.navigate('ServiceScreen', {
        serviceType: service.id,
        serviceName: service.name,
        serviceColor: service.color
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
      case ORDER_STATUS.READY: return '#10B981';
      case ORDER_STATUS.DRIVER_ASSIGNED: return '#3B82F6';
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
      case ORDER_STATUS.READY: return 'جاهز للتسليم';
      case ORDER_STATUS.DRIVER_ASSIGNED: return 'تم تعيين مندوب';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      case ORDER_STATUS.DELIVERED: return 'تم التوصيل';
      default: return status;
    }
  };

  const getServiceImage = (service) => {
    if (service.id === 'restaurant') {
      return restaurantImage;
    } else if (service.id === 'home_chef') {
      return chefImage;
    } else if (service.imageUrl) {
      return { uri: service.imageUrl };
    }
    return null;
  };

  const isAIService = (service) => {
    return service.type === 'ai' || service.id === 'restaurant' || service.id === 'home_chef';
  };

  const renderOrderCard = (order) => (
    <TouchableOpacity
      key={order.$id}
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: order.$id })}
    >
      <View style={styles.orderHeader}>
        <Text style={[styles.orderId, { fontFamily: fontFamily.arabic }]}>طلب #{order.$id.slice(-6)}</Text>
        <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Text style={[styles.orderStatusText, { color: getStatusColor(order.status), fontFamily: fontFamily.arabic }]}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      <Text style={[styles.orderService, { fontFamily: fontFamily.arabic }]}>{order.serviceName}</Text>

      <View style={styles.orderContactRow}>
        {order.merchantPhone && (
          <TouchableOpacity onPress={() => makePhoneCall(order.merchantPhone)}>
            <Ionicons name="call" size={16} color="#3B82F6" />
          </TouchableOpacity>
        )}
        {order.driverPhone && (
          <TouchableOpacity onPress={() => makePhoneCall(order.driverPhone)}>
            <Ionicons name="bicycle" size={16} color="#10B981" />
          </TouchableOpacity>
        )}
      </View>

      {order.finalTotal > 0 && (
        <View style={styles.orderPriceContainer}>
          <Text style={[styles.orderPriceLabel, { fontFamily: fontFamily.arabic }]}>الإجمالي:</Text>
          <Text style={[styles.orderPrice, { fontFamily: fontFamily.arabic }]}>{order.finalTotal} ج</Text>
          <Text style={[styles.paymentMethod, { fontFamily: fontFamily.arabic }]}>نقداً</Text>
        </View>
      )}

      <Text style={[styles.orderDate, { fontFamily: fontFamily.arabic }]}>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</Text>
    </TouchableOpacity>
  );

  const renderServicesByCategory = () => {
    if (services.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
          <Text style={[styles.emptyText, { fontFamily: fontFamily.arabic }]}>لا توجد خدمات متاحة</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadServices}>
            <Text style={[styles.refreshButtonText, { fontFamily: fontFamily.arabic }]}>إعادة تحميل</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const sortedCategories = Object.keys(groupedServices).sort((a, b) => {
      return (CATEGORY_ORDER[a] || 999) - (CATEGORY_ORDER[b] || 999);
    });

    return (
      <>
        {sortedCategories.map(category => {
          const categoryServices = groupedServices[category];
          if (!categoryServices || categoryServices.length === 0) return null;

          const categoryColor = CATEGORY_COLORS[category] || '#6B7280';
          const categoryTitle = CATEGORY_TITLES[category] || category;

          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: categoryColor + '20' }]}>
                  <Ionicons name="apps-outline" size={24} color={categoryColor} />
                </View>
                <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic, color: categoryColor }]}>
                  {categoryTitle}
                </Text>
                {category === 'ai' && (
                  <View style={styles.aiBadge}>
                    <Ionicons name="flash" size={12} color="#FFF" />
                    <Text style={[styles.aiBadgeText, { fontFamily: fontFamily.arabic }]}>AI</Text>
                  </View>
                )}
              </View>

              <View style={styles.grid}>
                {categoryServices.map((service) => {
                  const key = service.$id ? service.$id : service.id;
                  const serviceImage = getServiceImage(service);
                  const isActive = service.isActive === true;
                  const isAI = isAIService(service);

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.card,
                        { width: CARD_SIZE },
                        !isActive && styles.disabledCard
                      ]}
                      onPress={() => navigateToService(service)}
                      activeOpacity={0.8}
                      disabled={!isActive}
                    >
                      {serviceImage ? (
                        <Image
                          source={serviceImage}
                          style={[
                            styles.cardImage,
                            !isActive && styles.disabledImage
                          ]}
                        />
                      ) : (
                        <View style={[
                          styles.cardImage,
                          styles.placeholderImage,
                          { backgroundColor: (service.color || categoryColor) + (isActive ? '30' : '15') }
                        ]}>
                          <Ionicons
                            name={service.icon || 'apps-outline'}
                            size={40}
                            color={(service.color || categoryColor) + (isActive ? '' : '80')}
                          />
                        </View>
                      )}
                      <View style={[
                        styles.overlay,
                        !isActive && styles.disabledOverlay
                      ]}>
                        <Text style={[
                          styles.cardTitle,
                          { fontFamily: fontFamily.arabic },
                          !isActive && styles.disabledCardTitle
                        ]}>{service.name}</Text>

                        {isActive && isAI && (
                          <View style={styles.cardAIBadge}>
                            <Ionicons name="flash" size={10} color="#FFF" />
                            <Text style={[styles.cardAIBadgeText, { fontFamily: fontFamily.arabic }]}>AI</Text>
                          </View>
                        )}

                        {!isActive && (
                          <View style={styles.maintenanceBadge}>
                            <Text style={[styles.maintenanceText, { fontFamily: fontFamily.arabic }]}>
                              {service.maintenanceText || 'غير متاح'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBarSpace} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={styles.menuButton}
            activeOpacity={0.7}
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
            >
              <Ionicons name="log-in-outline" size={20} color="#4F46E5" />
              <Text style={[styles.registerText, { fontFamily: fontFamily.arabic }]}>دخول</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setDrawerVisible(true)}
              style={styles.profileButton}
            >
              <View style={styles.avatarSmall}>
                <Text style={[styles.avatarText, { fontFamily: fontFamily.arabic }]}>{userData?.name?.charAt(0) || 'م'}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoggedIn && (
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { fontFamily: fontFamily.arabic }]}>مرحباً، {userData?.name || 'عميلنا العزيز'}</Text>
        </View>
      )}

      {!isLoggedIn && (
        <View style={styles.promoSection}>
          <Text style={[styles.promoText, { fontFamily: fontFamily.arabic }]}>✨ سجل الآن لتستفيد بتجربة أفضل ومتابعة طلباتك</Text>
        </View>
      )}

      {/* الطلبات النشطة - تظهر فقط للمستخدمين المسجلين */}
      {isLoggedIn && activeOrders.length > 0 && (
        <View style={styles.ordersSection}>
          <View style={styles.ordersHeader}>
            <Text style={[styles.ordersTitle, { fontFamily: fontFamily.arabic }]}>طلباتك الحالية</Text>
            <TouchableOpacity onPress={() => setShowActiveOrders(!showActiveOrders)}>
              <Ionicons name={showActiveOrders ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {showActiveOrders && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ordersScroll}>
              {activeOrders.map(renderOrderCard)}
            </ScrollView>
          )}
        </View>
      )}

      {/* الطلبات المكتملة - تظهر فقط للمستخدمين المسجلين */}
      {isLoggedIn && completedOrders.length > 0 && (
        <View style={styles.completedOrdersSection}>
          <Text style={[styles.completedOrdersTitle, { fontFamily: fontFamily.arabic }]}>الطلبات السابقة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ordersScroll}>
            {completedOrders.map(renderOrderCard)}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {renderServicesByCategory()}
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomDrawer
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
            <Text style={[styles.modalTitle, { fontFamily: fontFamily.arabic }]}>دخول الأدمن</Text>
            <Text style={[styles.modalSubtitle, { fontFamily: fontFamily.arabic }]}>أدخل كلمة المرور الخاصة</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="كلمة المرور"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => { setAdminModalVisible(false); setAdminPassword(''); }}
              >
                <Text style={[styles.modalCancelText, { fontFamily: fontFamily.arabic }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={handleAdminAccess}
              >
                <Text style={[styles.modalConfirmText, { fontFamily: fontFamily.arabic }]}>دخول</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DynamicMongez
        screen="home"
        navigation={navigation}
        contextData={{
          user: userData,
          isLoggedIn
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBarSpace: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 60,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuButton: { padding: 8, borderRadius: 8, backgroundColor: '#F0F0F0', width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 100, height: 50, resizeMode: 'contain' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  registerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 4, minHeight: 40 },
  registerText: { color: '#4F46E5', fontSize: 13, fontWeight: '500' },
  profileButton: { padding: 4, backgroundColor: '#F5F5F5', borderRadius: 25 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  welcomeSection: { paddingHorizontal: 16, paddingVertical: 8 },
  welcomeText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  promoSection: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FEF3C7', marginHorizontal: 16, marginVertical: 8, borderRadius: 8 },
  promoText: { fontSize: 12, color: '#92400E', textAlign: 'center' },

  // الطلبات
  ordersSection: { marginTop: 8, marginBottom: 12, paddingHorizontal: 16 },
  completedOrdersSection: { marginTop: 8, marginBottom: 12, paddingHorizontal: 16, opacity: 0.8 },
  ordersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ordersTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', textAlign: 'right' },
  completedOrdersTitle: { fontSize: 14, fontWeight: '500', color: '#6B7280', marginBottom: 8, textAlign: 'right' },
  ordersScroll: { flexDirection: 'row' },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 11, fontWeight: '600', color: '#1F2937' },
  orderStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  orderStatusText: { fontSize: 9, fontWeight: '600' },
  orderService: { fontSize: 13, fontWeight: '500', color: '#1F2937', marginBottom: 2 },
  orderContactRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  orderPriceContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  orderPriceLabel: { fontSize: 11, color: '#6B7280' },
  orderPrice: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
  paymentMethod: { fontSize: 10, color: '#10B981', marginLeft: 4 },
  orderDate: { fontSize: 9, color: '#9CA3AF' },

  content: { padding: 16, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  sectionIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  aiBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    height: 140, 
    borderRadius: 14, 
    overflow: 'hidden', 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2 
  },
  cardImage: { width: '100%', height: '100%' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  disabledCard: { opacity: 0.8 },
  disabledImage: { opacity: 0.5 },
  disabledOverlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
  disabledCardTitle: { color: '#FFF', opacity: 0.9, fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 8 },
  cardTitle: { 
    color: '#FFF', 
    fontSize: 20, // 🔥 تم التكبير من 15 إلى 20
    fontWeight: 'bold', 
    marginBottom: 4, 
    textAlign: 'center' 
  },
  cardAIBadge: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F59E0B', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 10, 
    gap: 2 
  },
  cardAIBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  maintenanceBadge: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#EF4444', 
    paddingVertical: 6, 
    paddingHorizontal: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderBottomLeftRadius: 14, 
    borderBottomRightRadius: 14 
  },
  maintenanceText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280', textAlign: 'center' },
  refreshButton: { marginTop: 16, backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  refreshButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  drawerContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '80%', overflow: 'hidden' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 16, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  modalCancel: { backgroundColor: '#F3F4F6' },
  modalConfirm: { backgroundColor: '#EF4444' },
  modalCancelText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
  modalConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default HomeScreen;
