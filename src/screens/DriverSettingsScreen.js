import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDriverAvailability } from '../appwrite/userService';

export default function DriverSettingsScreen({ navigation }) {
  const [driverData, setDriverData] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const parsed = JSON.parse(data);
      setDriverData(parsed);
      setIsAvailable(parsed.isAvailable !== false);
    }
  };

  const toggleAvailability = async () => {
    setLoading(true);
    const newStatus = !isAvailable;
    
    const result = await updateDriverAvailability(driverData.$id, newStatus);
    
    if (result.success) {
      setIsAvailable(newStatus);
      // تحديث البيانات المحفوظة
      const updatedData = { ...driverData, isAvailable: newStatus };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
      setDriverData(updatedData);
      Alert.alert('تم', `أنت الآن ${newStatus ? 'متاح' : 'غير متاح'} للتوصيل`);
    } else {
      Alert.alert('خطأ', result.error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* بطاقة الحالة */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bicycle" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>حالة التوفر</Text>
          </View>
          
          <View style={styles.availabilityRow}>
            <View>
              <Text style={styles.availabilityLabel}>متاح للتوصيل</Text>
              <Text style={styles.availabilityDesc}>
                {isAvailable ? 'يمكن للتجار رؤيتك وتعيينك' : 'لن تظهر للتجار'}
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={isAvailable ? '#FFF' : '#F3F4F6'}
              />
            )}
          </View>
        </View>

        {/* معلومات المندوب */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={24} color="#4F46E5" />
            <Text style={styles.cardTitle}>بياناتي</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>الاسم</Text>
            <Text style={styles.infoValue}>{driverData?.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>رقم الهاتف</Text>
            <Text style={styles.infoValue}>{driverData?.phone}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>منطقة الخدمة</Text>
            <Text style={styles.infoValue}>{driverData?.serviceArea || 'غير محدد'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>نوع النشاط</Text>
            <Text style={styles.infoValue}>{driverData?.merchantType || 'غير محدد'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>أقصى مسافة</Text>
            <Text style={styles.infoValue}>{driverData?.maxDeliveryRadius || 10} كم</Text>
          </View>
        </View>

        {/* إحصائيات سريعة */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart-outline" size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>إحصائيات</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>توصيلات اليوم</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>هذا الأسبوع</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>إجمالي</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityLabel: { fontSize: 16, color: '#1F2937', marginBottom: 4 },
  availabilityDesc: { fontSize: 12, color: '#6B7280' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#F59E0B' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
