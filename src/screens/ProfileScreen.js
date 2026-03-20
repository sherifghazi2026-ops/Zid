import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';
import { uploadProfileImage } from '../services/uploadService';
import { updateUserLocation, updateAvailability } from '../services/userService';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const user = JSON.parse(data);
        setUserData(user);
        setName(user.full_name || user.name || '');
        setPhone(user.phone || '');
        setAddress(user.address || user.customer_address || '');
        setAvatar(user.avatar_url || null);
        setIsAvailable(user.is_available !== false);
      }
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح بالوصول للمعرض');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets) {
        setUploading(true);
        const uploadResult = await uploadProfileImage(result.assets[0].uri, name || 'user');
        setUploading(false);
        if (uploadResult.success) {
          setAvatar(uploadResult.fileUrl);
        } else {
          Alert.alert('خطأ', 'فشل رفع الصورة');
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل اختيار الصورة');
    }
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح بالوصول للموقع');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const result = await updateUserLocation(userData.$id || userData.id, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      if (result.success) {
        Alert.alert('✅ تم', 'تم تحديث موقعك بنجاح');
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        if (addressResult) {
          setAddress(`${addressResult.region || ''} - ${addressResult.city || ''} - ${addressResult.street || ''}`);
        }
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في الحصول على الموقع');
    } finally {
      setGettingLocation(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    const result = await updateAvailability(userData.$id || userData.id, newStatus);
    if (result.success) {
      setIsAvailable(newStatus);
      Alert.alert('✅ تم', `تم ${newStatus ? 'تفعيل' : 'تعطيل'} حالة التوفر`);
      const updatedUser = { ...userData, is_available: newStatus };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUserData(updatedUser);
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }

    setUpdating(true);
    try {
      const updateData = {
        full_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatar_url: avatar,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update(updateData)
        .eq('id', userData.$id || userData.id);

      if (error) throw error;

      const updatedUser = { ...userData, ...updateData };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUserData(updatedUser);
      setEditMode(false);
      Alert.alert('✅ تم', 'تم تحديث الملف الشخصي');
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          onPress: async () => {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('userData');
            await AsyncStorage.removeItem('userRole');
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const isMerchant = userData?.role === 'merchant';
  const isDriver = userData?.role === 'driver';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* الصورة الشخصية */}
        <View style={styles.avatarSection}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color="#9CA3AF" />
            </View>
          )}
          {editMode && (
            <TouchableOpacity style={styles.changeAvatarButton} onPress={pickAvatar} disabled={uploading}>
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.changeAvatarText}>تغيير الصورة</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* حالة التوفر (للتجار والمناديب) */}
        {(isMerchant || isDriver) && (
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityRow}>
              <Ionicons name="radio-button-on" size={20} color={isAvailable ? '#10B981' : '#EF4444'} />
              <Text style={styles.availabilityText}>
                {isAvailable ? 'متاح حالياً' : 'غير متاح حالياً'}
              </Text>
            </View>
            <TouchableOpacity style={styles.toggleButton} onPress={toggleAvailability}>
              <Text style={styles.toggleButtonText}>
                {isAvailable ? 'تعطيل التوفر' : 'تفعيل التوفر'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* معلومات المستخدم */}
        <View style={styles.infoCard}>
          {editMode ? (
            <>
              <Text style={styles.label}>الاسم</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="الاسم الكامل"
              />
              <Text style={styles.label}>رقم الهاتف</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="رقم الهاتف"
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>العنوان</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="العنوان"
                multiline
              />
              <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation} disabled={gettingLocation}>
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="location" size={18} color="#4F46E5" />
                    <Text style={styles.locationButtonText}>تحديد موقعي الحالي</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>الاسم</Text>
                <Text style={styles.infoValue}>{name || 'غير محدد'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>رقم الهاتف</Text>
                <Text style={styles.infoValue}>{phone || 'غير محدد'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>العنوان</Text>
                <Text style={styles.infoValue}>{address || 'غير محدد'}</Text>
              </View>
              {userData?.role && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>الدور</Text>
                  <Text style={styles.infoValue}>
                    {userData.role === 'merchant' ? 'تاجر' : userData.role === 'driver' ? 'مندوب' : userData.role === 'admin' ? 'مدير' : 'عميل'}
                  </Text>
                </View>
              )}
              {isMerchant && userData?.merchant_type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>نوع النشاط</Text>
                  <Text style={styles.infoValue}>{userData.merchant_type}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* أزرار التحكم */}
        <View style={styles.buttonsContainer}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>حفظ التغييرات</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setEditMode(false);
                  setName(userData?.full_name || userData?.name || '');
                  setPhone(userData?.phone || '');
                  setAddress(userData?.address || '');
                  setAvatar(userData?.avatar_url || null);
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.buttonText}>تعديل الملف الشخصي</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* معلومات إضافية للتاجر */}
        {isMerchant && userData?.place_name && (
          <View style={styles.extraCard}>
            <Text style={styles.extraTitle}>🏪 معلومات التاجر</Text>
            <View style={styles.extraRow}>
              <Text style={styles.extraLabel}>المكان:</Text>
              <Text style={styles.extraValue}>{userData.place_name}</Text>
            </View>
            {userData.delivery_fee !== undefined && (
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>رسوم التوصيل:</Text>
                <Text style={styles.extraValue}>{userData.delivery_fee} ج</Text>
              </View>
            )}
            {userData.delivery_time !== undefined && (
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>وقت التوصيل:</Text>
                <Text style={styles.extraValue}>{userData.delivery_time} دقيقة</Text>
              </View>
            )}
          </View>
        )}

        {/* معلومات إضافية للمندوب */}
        {isDriver && (
          <View style={styles.extraCard}>
            <Text style={styles.extraTitle}>🚚 معلومات المندوب</Text>
            {userData.service_area && (
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>منطقة الخدمة:</Text>
                <Text style={styles.extraValue}>{userData.service_area}</Text>
              </View>
            )}
            {userData.max_delivery_radius && (
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>أقصى مسافة:</Text>
                <Text style={styles.extraValue}>{userData.max_delivery_radius} كم</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 4,
  },
  changeAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  availabilityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityText: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  toggleButton: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleButtonText: { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
  },
  locationButtonText: { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
  buttonsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  editButton: { backgroundColor: '#4F46E5', flexDirection: 'row', gap: 6 },
  saveButton: { backgroundColor: '#10B981' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  cancelButtonText: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  extraCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  extraTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  extraLabel: { fontSize: 13, color: '#6B7280' },
  extraValue: { fontSize: 13, fontWeight: '500', color: '#1F2937' },
});
