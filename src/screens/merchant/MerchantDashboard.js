import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrders, ORDER_STATUS } from '../../services/orderService';
import CustomDrawer from '../../components/CustomDrawer';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { getMyRestaurantDishes } from '../../services/dishService';

export default function MerchantDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingDishes, setPendingDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const isChef = userData?.merchantType === 'home_chef';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem('userData');
      if (!data) {
        console.log('لا توجد بيانات مستخدم، توجيه إلى HomeScreen');
        navigation.replace('HomeScreen');
        return;
      }

      const parsed = JSON.parse(data);
      console.log('✅ بيانات التاجر:', parsed.name, 'نوع:', parsed.merchantType);
      setUserData(parsed);

      await loadOrders(parsed.$id);
      await loadPendingDishes(parsed.$id);
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات التاجر:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
      navigation.replace('HomeScreen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrders = async (userId) => {
    try {
      const result = await getOrders({
        merchantId: userId,
        status: ORDER_STATUS.PENDING,
      });
      if (result.success) {
        setPendingOrders(result.data);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الطلبات:', error);
    }
  };

  const loadPendingDishes = async (userId) => {
    try {
      const result = await getMyRestaurantDishes(userId);
      if (result.success) {
        const pending = result.data.filter(dish => dish.status === 'pending');
        setPendingDishes(pending);
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الأطباق:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userData) {
      loadOrders(userData.$id);
      loadPendingDishes(userData.$id);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
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
          <Text style={styles.headerTitle}>
            {isChef ? 'لوحة الشيف' : 'لوحة تحكم التاجر'}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>مرحباً، {userData?.name}</Text>
          {isChef && userData?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.verifiedText}>موثق</Text>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingOrders.length}</Text>
            <Text style={styles.statLabel}>طلبات جديدة</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingDishes.length}</Text>
            <Text style={styles.statLabel}>أطباق بانتظار المراجعة</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          {/* زر أطباقي - للجميع */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              navigation.navigate('MyDishesScreen', {
                providerId: userData.$id,
                providerType: isChef ? 'home_chef' : 'restaurant',
                providerName: userData.name
              });
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="restaurant-outline" size={30} color="#FFF" />
            </View>
            <Text style={styles.actionTitle}>أطباقي</Text>
            <Text style={styles.actionDesc}>
              {isChef ? 'إضافة وتعديل أطباقك' : 'إضافة وتعديل أطباق المطعم'}
            </Text>
            {pendingDishes.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingDishes.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* زر الطلبات الواردة - للجميع */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MerchantOrdersScreen')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="cart-outline" size={30} color="#FFF" />
            </View>
            <Text style={styles.actionTitle}>الطلبات الواردة</Text>
            <Text style={styles.actionDesc}>متابعة وتحديث حالة الطلبات</Text>
            {pendingOrders.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingOrders.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* للشيف فقط - معلومات إضافية */}
          {isChef && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="document-text" size={30} color="#FFF" />
              </View>
              <Text style={styles.actionTitle}>الشهادة الصحية</Text>
              <Text style={styles.actionDesc}>
                {userData?.isVerified ? 'موثقة ✅' : 'بانتظار التوثيق'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <CustomDrawer
              isLoggedIn={true}
              userData={userData}
              onClose={() => setDrawerVisible(false)}
              navigation={navigation}
              onOpenAdminModal={() => {}}
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
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  welcomeCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#F59E0B' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  actionsGrid: { gap: 12 },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  actionDesc: { fontSize: 12, color: '#6B7280' },
  pendingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
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
