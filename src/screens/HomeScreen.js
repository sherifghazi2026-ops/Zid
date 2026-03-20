import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image,
  SafeAreaView, RefreshControl, Alert, Modal, TextInput, Platform, StatusBar, BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDrawer from '../components/CustomDrawer';
import { getOrders, ORDER_STATUS } from '../services/orderService';
import { getVisibleServicesForHome } from '../services/servicesService';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';
import { fontFamily } from '../utils/fonts';
import DynamicMongez from '../components/DynamicMongez';
import useInterval from '../hooks/useInterval';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

const appIcon = require('../../assets/icons/ZidiconSP.png');
const restaurantImage = require('../../assets/icons/restaurant-8k.png');
const chefImage = require('../../assets/icons/Chef.png');
const laundryImage = require('../../assets/icons/ironing-8k.png');

const CATEGORY_ORDER = { 'express': 1, 'pro': 2, 'ai': 3, 'other': 4 };
const CATEGORY_TITLES = { 'express': 'Zid Express', 'pro': 'Zid Pro', 'ai': 'خدمات AI', 'other': 'خدمات أخرى' };
const CATEGORY_COLORS = { 'express': '#F59E0B', 'pro': '#3B82F6', 'ai': '#8B5CF6', 'other': '#6B7280' };

const CURRENT_ORDER_STATUSES = [
  ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY, ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.PICKUP
];

const HomeScreen = ({ navigation }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const [currentOrders, setCurrentOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [groupedServices, setGroupedServices] = useState({});
  const [chefsCount, setChefsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showCurrentOrders, setShowCurrentOrders] = useState(true);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []));

  useEffect(() => { checkLoginStatus(); loadServices(); loadChefsCount(); }, []);
  useFocusEffect(useCallback(() => { if (isLoggedIn && userPhone) fetchCurrentOrders(); }, [isLoggedIn, userPhone]));
  useInterval(() => { if (isLoggedIn && userPhone) fetchCurrentOrders(); }, 5000);

  const checkLoginStatus = async () => {
    const data = await AsyncStorage.getItem('userData');
    const phone = await AsyncStorage.getItem('userPhone');
    if (data) { setUserData(JSON.parse(data)); setIsLoggedIn(true); }
    if (phone) setUserPhone(phone);
  };

  const loadServices = async () => {
    const result = await getVisibleServicesForHome();
    if (result.success) {
      const filtered = result.data.filter(s => !['mongez', 'assistant', 'vegetables', 'fruits'].includes(s.id) && !['منحز', 'Mongez', 'الخضار والفاكهة'].includes(s.name));
      const sorted = filtered.sort((a, b) => (a.is_active && !b.is_active ? -1 : !a.is_active && b.is_active ? 1 : (a.order || 0) - (b.order || 0)));
      setServices(sorted);
      const grouped = {};
      sorted.forEach(s => { const cat = s.category || 'other'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(s); });
      setGroupedServices(grouped);
    }
  };

  const loadChefsCount = async () => {
    try {
      const { count } = await supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true })
        .eq('role', 'merchant').eq('merchant_type', 'home_chef').eq('is_verified', true).eq('active', true);
      setChefsCount(count || 0);
    } catch (error) { setChefsCount(0); }
  };

  const fetchCurrentOrders = async () => {
    if (!isLoggedIn || !userPhone) return;
    const result = await getOrders({ userId: userPhone, status: CURRENT_ORDER_STATUSES });
    if (result.success) setCurrentOrders(result.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); loadServices(); if (isLoggedIn) fetchCurrentOrders(); loadChefsCount(); };

  const navigateToService = (service) => {
    if (!isLoggedIn) {
      Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => navigation.navigate('CustomerAuth') }
      ]);
      return;
    }
    if (!service.is_active) { Alert.alert('تنبيه', service.maintenance_text || 'الخدمة غير متاحة'); return; }
    if (service.type === 'ai') { Alert.alert('AI', 'خدمة الذكاء الاصطناعي قيد التطوير'); return; }
    if (service.type === 'items_service') {
      navigation.navigate('ServiceItemsScreen', { serviceId: service.id, serviceName: service.name, collectionName: service.items_collection || `${service.id}_items`, subServices: service.sub_services || [] });
    } else if (service.type === 'items' || service.type === 'products') {
      navigation.navigate('MerchantsListScreen', { serviceType: service.id, serviceName: service.name, collectionName: service.items_collection || `${service.id}_items` });
    } else {
      navigation.navigate('ServiceScreen', { serviceType: service.id, serviceName: service.name, serviceColor: service.color });
    }
  };

  const handleAdminAccess = () => {
    if (adminPassword === "admin2026") { setAdminModalVisible(false); setAdminPassword(''); navigation.navigate('AdminHome'); }
    else { Alert.alert('خطأ', 'كلمة المرور غير صحيحة'); setAdminPassword(''); }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return '#F59E0B';
      case ORDER_STATUS.ACCEPTED: return '#007AFF';
      case ORDER_STATUS.PREPARING: return '#8B5CF6';
      case ORDER_STATUS.READY: return '#34C759';
      case ORDER_STATUS.DRIVER_ASSIGNED: return '#3B82F6';
      case ORDER_STATUS.ON_THE_WAY: return '#3B82F6';
      case ORDER_STATUS.PICKUP: return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return 'معلق';
      case ORDER_STATUS.ACCEPTED: return 'تم القبول';
      case ORDER_STATUS.PREPARING: return 'قيد التجهيز';
      case ORDER_STATUS.READY: return 'جاهز';
      case ORDER_STATUS.DRIVER_ASSIGNED: return 'تم تعيين مندوب';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      case ORDER_STATUS.PICKUP: return 'استلام';
      default: return status;
    }
  };

  const getServiceImage = (service) => {
    if (service.id === 'restaurant') return restaurantImage;
    if (service.id === 'home_chef') return chefImage;
    if (service.id === 'laundry') return laundryImage;
    if (service.image_url) return { uri: service.image_url };
    return null;
  };

  const renderOrderCard = (order) => {
    const orderId = order.id || order.$id;
    const displayId = orderId ? String(orderId).slice(-6) : '000000';
    return (
      <TouchableOpacity key={orderId} style={styles.orderCard} onPress={() => navigation.navigate('OrderTrackingScreen', { orderId })}>
        <View style={styles.orderHeader}>
          <Text style={[styles.orderId, { fontFamily: fontFamily.arabic }]}>#{displayId}</Text>
          <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.orderStatusText, { color: getStatusColor(order.status), fontFamily: fontFamily.arabic }]}>{getStatusText(order.status)}</Text>
          </View>
        </View>
        <Text style={[styles.orderService, { fontFamily: fontFamily.arabic }]} numberOfLines={1}>{order.merchant_place || order.merchant_name || order.service_name || 'طلب جديد'}</Text>
        <View style={styles.orderFooter}>
          {(order.final_total || order.finalTotal) > 0 && <Text style={[styles.orderPrice, { fontFamily: fontFamily.arabic }]}>{order.final_total || order.finalTotal} ج</Text>}
          <Text style={[styles.orderDate, { fontFamily: fontFamily.arabic }]}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderServicesByCategory = () => {
    if (services.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
          <Text style={[styles.emptyText, { fontFamily: fontFamily.arabic }]}>لا توجد خدمات</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadServices}><Text style={[styles.refreshButtonText, { fontFamily: fontFamily.arabic }]}>إعادة تحميل</Text></TouchableOpacity>
        </View>
      );
    }
    const sortedCategories = Object.keys(groupedServices).sort((a, b) => (CATEGORY_ORDER[a] || 999) - (CATEGORY_ORDER[b] || 999));
    return (
      <>
        {sortedCategories.map(category => {
          const categoryServices = groupedServices[category];
          if (!categoryServices?.length) return null;
          const categoryColor = CATEGORY_COLORS[category] || '#6B7280';
          const categoryTitle = CATEGORY_TITLES[category] || category;
          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: categoryColor + '20' }]}><Ionicons name="apps-outline" size={24} color={categoryColor} /></View>
                <Text style={[styles.sectionTitle, { fontFamily: fontFamily.arabic, color: categoryColor }]}>{categoryTitle}</Text>
              </View>
              <View style={styles.grid}>
                {categoryServices.map(service => {
                  const key = service.$id || service.id;
                  const serviceImage = getServiceImage(service);
                  const is_active = service.is_active === true;
                  return (
                    <TouchableOpacity key={key} style={[styles.card, { width: CARD_SIZE }, !is_active && styles.disabledCard]} onPress={() => navigateToService(service)} disabled={!is_active}>
                      {serviceImage ? <Image source={serviceImage} style={[styles.cardImage, !is_active && styles.disabledImage]} /> :
                        <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: (service.color || categoryColor) + (is_active ? '30' : '15') }]}>
                          <Ionicons name={service.icon || 'apps-outline'} size={40} color={(service.color || categoryColor) + (is_active ? '' : '80')} />
                        </View>
                      }
                      <View style={[styles.overlay, !is_active && styles.disabledOverlay]}>
                        <Text style={[styles.cardTitle, { fontFamily: fontFamily.arabic }, !is_active && styles.disabledCardTitle]}>{service.name}</Text>
                        {service.type === 'ai' && <View style={styles.aiBadge}><Ionicons name="flash" size={16} color="#FFF" /><Text style={styles.aiBadgeText}>AI</Text></View>}
                        {!is_active && <View style={styles.maintenanceBadge}><Text style={[styles.maintenanceText, { fontFamily: fontFamily.arabic }]}>{service.maintenance_text || 'غير متاح'}</Text></View>}
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
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}><Ionicons name="menu" size={28} color="#1F2937" /></TouchableOpacity>
          <Image source={appIcon} style={styles.logo} />
        </View>
        <View style={styles.headerRight}>
          {!isLoggedIn ? (
            <TouchableOpacity onPress={() => navigation.navigate('CustomerAuth')} style={styles.registerButton}>
              <Ionicons name="log-in-outline" size={20} color="#4F46E5" /><Text style={[styles.registerText, { fontFamily: fontFamily.arabic }]}>دخول</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.profileButton}>
              <View style={styles.avatarSmall}><Text style={[styles.avatarText, { fontFamily: fontFamily.arabic }]}>{userData?.name?.charAt(0) || 'م'}</Text></View>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isLoggedIn && <View style={styles.welcomeSection}><Text style={[styles.welcomeText, { fontFamily: fontFamily.arabic }]}>مرحباً، {userData?.name || 'عميلنا العزيز'}</Text></View>}
      {isLoggedIn && currentOrders.length > 0 && (
        <View style={styles.ordersSection}>
          <View style={styles.ordersHeader}>
            <Text style={[styles.ordersTitle, { fontFamily: fontFamily.arabic }]}>طلباتك الحالية ({currentOrders.length})</Text>
            <TouchableOpacity onPress={() => setShowCurrentOrders(!showCurrentOrders)}><Ionicons name={showCurrentOrders ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" /></TouchableOpacity>
          </View>
          {showCurrentOrders && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ordersScroll}>{currentOrders.map(renderOrderCard)}</ScrollView>}
        </View>
      )}
      {isLoggedIn && currentOrders.length === 0 && <View style={styles.noOrdersContainer}><Text style={[styles.noOrdersText, { fontFamily: fontFamily.arabic }]}>لا توجد طلبات حالية</Text></View>}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.content}>
        {renderServicesByCategory()}
        <View style={{ height: 80 }} />
      </ScrollView>
      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}><View style={styles.drawerContent}><CustomDrawer isLoggedIn={isLoggedIn} userData={userData} onClose={() => setDrawerVisible(false)} navigation={navigation} onOpenAdminModal={() => setAdminModalVisible(true)} /></View></View>
      </Modal>
      <Modal visible={adminModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { fontFamily: fontFamily.arabic }]}>دخول الأدمن</Text>
            <Text style={[styles.modalSubtitle, { fontFamily: fontFamily.arabic }]}>أدخل كلمة المرور الخاصة</Text>
            <TextInput style={styles.modalInput} placeholder="كلمة المرور" secureTextEntry value={adminPassword} onChangeText={setAdminPassword} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => { setAdminModalVisible(false); setAdminPassword(''); }}><Text style={[styles.modalCancelText, { fontFamily: fontFamily.arabic }]}>إلغاء</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalConfirm]} onPress={handleAdminAccess}><Text style={[styles.modalConfirmText, { fontFamily: fontFamily.arabic }]}>دخول</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <DynamicMongez screen="home" navigation={navigation} contextData={{ user: userData, isLoggedIn }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBarSpace: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', minHeight: 60 },
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
  ordersSection: { marginTop: 4, marginBottom: 8, paddingHorizontal: 16 },
  noOrdersContainer: { marginHorizontal: 16, marginVertical: 4, padding: 6, backgroundColor: '#F3F4F6', borderRadius: 6, alignItems: 'center' },
  noOrdersText: { fontSize: 12, color: '#6B7280' },
  ordersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ordersTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', textAlign: 'right' },
  ordersScroll: { flexDirection: 'row' },
  orderCard: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginRight: 8, width: 140, borderWidth: 1, borderColor: '#E5E7EB' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 10, fontWeight: '600', color: '#1F2937' },
  orderStatusBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
  orderStatusText: { fontSize: 8, fontWeight: '600' },
  orderService: { fontSize: 11, fontWeight: '500', color: '#1F2937', marginBottom: 4 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  orderPrice: { fontSize: 11, fontWeight: '600', color: '#F59E0B' },
  orderDate: { fontSize: 8, color: '#9CA3AF' },
  content: { padding: 16, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  sectionIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { height: 140, borderRadius: 14, overflow: 'hidden', marginBottom: 12, elevation: 2 },
  cardImage: { width: '100%', height: '100%' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  disabledCard: { opacity: 0.8 },
  disabledImage: { opacity: 0.5 },
  disabledOverlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
  disabledCardTitle: { color: '#FFF', opacity: 0.9, fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 8 },
  cardTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  aiBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  aiBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  maintenanceBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#EF4444', paddingVertical: 6, alignItems: 'center' },
  maintenanceText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
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
