import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { updateUserLocation, updateAvailability } from '../appwrite/userService';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      const parsed = JSON.parse(data);
      setUserData(parsed);
      setIsAvailable(parsed.isAvailable !== false);
    }
  };

  const updateLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للموقع');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const result = await updateUserLocation(userData.$id, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (result.success) {
        const updatedUser = { ...userData, locationLat: loc.coords.latitude, locationLng: loc.coords.longitude };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        Alert.alert('تم', 'تم تحديث موقعك بنجاح');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث الموقع');
    } finally {
      setGettingLocation(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    const result = await updateAvailability(userData.$id, newStatus);
    if (result.success) {
      setIsAvailable(newStatus);
      const updatedUser = { ...userData, isAvailable: newStatus };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUserData(updatedUser);
    }
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
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
        <Text style={styles.headerTitle}>ملفي الشخصي</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* صورة المستخدم */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData.name?.charAt(0) || 'م'}
            </Text>
          </View>
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.userRole}>
            {userData.role === 'merchant' ? 'تاجر' : 
             userData.role === 'driver' ? 'مندوب' : 'مدير النظام'}
          </Text>
        </View>

        {/* بطاقة المعلومات */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#4F46E5" />
            <Text style={styles.infoLabel}>رقم الهاتف:</Text>
            <Text style={styles.infoValue}>{userData.phone || 'غير محدد'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#4F46E5" />
            <Text style={styles.infoLabel}>العنوان:</Text>
            <Text style={styles.infoValue}>{userData.address || 'غير محدد'}</Text>
          </View>

          {userData.role === 'merchant' && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={20} color="#4F46E5" />
              <Text style={styles.infoLabel}>النشاط التجاري:</Text>
              <Text style={styles.infoValue}>{userData.merchantType || 'غير محدد'}</Text>
            </View>
          )}

          {userData.role === 'driver' && (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="map-outline" size={20} color="#4F46E5" />
                <Text style={styles.infoLabel}>منطقة الخدمة:</Text>
                <Text style={styles.infoValue}>{userData.serviceArea || 'غير محدد'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="speedometer-outline" size={20} color="#4F46E5" />
                <Text style={styles.infoLabel}>أقصى مسافة:</Text>
                <Text style={styles.infoValue}>{userData.maxDeliveryRadius || 10} كم</Text>
              </View>
            </>
          )}
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionsContainer}>
          {userData.role === 'driver' && (
            <TouchableOpacity 
              style={[styles.actionButton, isAvailable ? styles.availableButton : styles.unavailableButton]}
              onPress={toggleAvailability}
            >
              <Ionicons 
                name={isAvailable ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color="#FFF" 
              />
              <Text style={styles.actionButtonText}>
                {isAvailable ? 'متاح' : 'غير متاح'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, styles.locationButton]}
            onPress={updateLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="locate" size={24} color="#FFF" />
                <Text style={styles.actionButtonText}>تحديث موقعي</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          آخر تحديث: {new Date().toLocaleDateString('ar-EG')}
        </Text>
      </ScrollView>
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
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  userRole: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 10,
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  availableButton: { backgroundColor: '#10B981' },
  unavailableButton: { backgroundColor: '#EF4444' },
  locationButton: { backgroundColor: '#4F46E5' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  note: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 20 },
});
