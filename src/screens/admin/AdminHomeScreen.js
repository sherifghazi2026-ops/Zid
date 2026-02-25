import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminHomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      setUserData(JSON.parse(data));
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userRole');
    navigation.replace('MerchantLogin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>مرحباً،</Text>
          <Text style={styles.name}>{userData?.name || 'مدير النظام'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>إحصائيات سريعة</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <Ionicons name="people-outline" size={32} color="#4F46E5" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>مستخدمين</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Ionicons name="cart-outline" size={32} color="#F59E0B" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>طلبات</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Ionicons name="bicycle-outline" size={32} color="#10B981" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>مندوبين</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Ionicons name="business-outline" size={32} color="#8B5CF6" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>تجار</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إدارة النظام</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Ionicons name="people-outline" size={24} color="#4F46E5" />
            <Text style={styles.menuText}>إدارة المستخدمين</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="cart-outline" size={24} color="#F59E0B" />
            <Text style={styles.menuText}>جميع الطلبات</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="stats-chart-outline" size={24} color="#10B981" />
            <Text style={styles.menuText}>التقارير</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={24} color="#6B7280" />
            <Text style={styles.menuText}>الإعدادات</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcome: {
    fontSize: 14,
    color: '#6B7280',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  content: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
});
