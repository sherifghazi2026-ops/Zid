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
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';
import CustomDrawer from '../../components/CustomDrawer';
import { getHomeChefByUserId } from '../../services/homeChefService';

export default function HomeChefDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [chefData, setChefData] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [pendingDishes, setPendingDishes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    loadChefData();
  }, []);

  const loadChefData = async () => {
    try {
      const user = await AsyncStorage.getItem('userData');
      if (!user) {
        navigation.replace('HomeScreen');
        return;
      }

      const parsed = JSON.parse(user);
      setUserData(parsed);

      // جلب بيانات الشيف
      const chefResult = await getHomeChefByUserId(parsed.$id);
      if (chefResult.success) {
        setChefData(chefResult.data);
        
        // جلب أطباقه
        await loadDishes(chefResult.data.$id);
      }
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDishes = async (chefId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        'dishes',
        [
          Query.equal('providerId', chefId),
          Query.equal('providerType', 'home_chef'),
          Query.orderDesc('createdAt')
        ]
      );
      setDishes(response.documents);
      
      const pending = response.documents.filter(d => d.status === 'pending').length;
      setPendingDishes(pending);
    } catch (error) {
      console.error('خطأ في جلب الأطباق:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>لوحة الشيف</Text>
        </View>
        <TouchableOpacity onPress={loadChefData}>
          <Ionicons name="refresh-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadChefData} />}
        contentContainerStyle={styles.content}
      >
        {/* بطاقة الشيف */}
        <View style={styles.chefCard}>
          {chefData?.imageUrl ? (
            <Image source={{ uri: chefData.imageUrl }} style={styles.chefImage} />
          ) : (
            <View style={[styles.chefImage, styles.placeholderImage]}>
              <Ionicons name="person" size={40} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.chefInfo}>
            <Text style={styles.chefName}>{chefData?.name}</Text>
            <View style={styles.verificationBadge}>
              <Ionicons 
                name={chefData?.isVerified ? "checkmark-circle" : "time"} 
                size={16} 
                color={chefData?.isVerified ? "#10B981" : "#F59E0B"} 
              />
              <Text style={[styles.verificationText, { color: chefData?.isVerified ? "#10B981" : "#F59E0B" }]}>
                {chefData?.isVerified ? 'موثق' : 'بانتظار التوثيق'}
              </Text>
            </View>
          </View>
        </View>

        {/* الإحصائيات */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{dishes.length}</Text>
            <Text style={styles.statLabel}>إجمالي الأطباق</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingDishes}</Text>
            <Text style={styles.statLabel}>بانتظار المراجعة</Text>
          </View>
        </View>

        {/* الأزرار */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddHomeChefDishScreen', {
              chefId: chefData?.$id,
              chefName: chefData?.name
            })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="add-circle" size={30} color="#FFF" />
            </View>
            <Text style={styles.actionTitle}>إضافة طبق</Text>
            <Text style={styles.actionDesc}>أضف طبق جديد إلى قائمتك</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MyChefDishesScreen', {
              chefId: chefData?.$id,
              chefName: chefData?.name
            })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="restaurant-outline" size={30} color="#FFF" />
            </View>
            <Text style={styles.actionTitle}>أطباقي</Text>
            <Text style={styles.actionDesc}>عرض وتعديل أطباقك</Text>
            {pendingDishes > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingDishes}</Text>
              </View>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  
  chefCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chefImage: { width: 70, height: 70, borderRadius: 35, marginRight: 16 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  chefInfo: { flex: 1 },
  chefName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  verificationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verificationText: { fontSize: 14, fontWeight: '500' },
  
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
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#EF4444' },
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
