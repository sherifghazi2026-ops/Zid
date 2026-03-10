import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllUsers, toggleUserStatus, deleteUser } from '../../appwrite/userService';

export default function UserManagement({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    const result = await getAllUsers();
    if (result.success) {
      setUsers(result.data);
      setFilteredUsers(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      user =>
        user.name?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.role?.includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleToggleStatus = (user) => {
    Alert.alert(
      'تغيير حالة المستخدم',
      `هل أنت متأكد من ${user.active ? 'تعطيل' : 'تفعيل'} حساب ${user.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: user.active ? 'تعطيل' : 'تفعيل',
          onPress: async () => {
            const result = await toggleUserStatus(user.$id, !user.active);
            if (result.success) {
              loadUsers();
              Alert.alert('تم', `تم ${!user.active ? 'تفعيل' : 'تعطيل'} الحساب`);
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (user) => {
    // التنقل إلى شاشة تعديل المستخدم مع معرف المستخدم
    navigation.navigate('UserEditScreen', { userId: user.$id });
  };

  const handleDelete = (user) => {
    Alert.alert(
      'حذف المستخدم',
      `هل أنت متأكد من حذف ${user.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteUser(user.$id);
            if (result.success) {
              loadUsers();
              Alert.alert('تم', 'تم حذف المستخدم');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const getRoleText = (role) => {
    switch(role) {
      case 'merchant': return 'تاجر';
      case 'driver': return 'مندوب';
      case 'admin': return 'أدمن';
      default: return 'عميل';
    }
  };

  const getMerchantTypeText = (type) => {
    const types = {
      'restaurants': 'مطاعم',
      'supermarket': 'سوبر ماركت',
      'pharmacy': 'صيدلية',
      'laundry': 'مغسلة',
      'electrician': 'كهربائي',
      'plumber': 'سباك',
      'carpenter': 'نجار',
    };
    return types[type] || type;
  };

  const renderUserCard = ({ item }) => (
    <View style={[styles.userCard, !item.active && styles.userCardDisabled]}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: item.active ? '#4F46E5' : '#9CA3AF' }]}>
          <Text style={styles.roleText}>{getRoleText(item.role)}</Text>
        </View>
      </View>

      {item.role === 'merchant' && item.merchantType && (
        <View style={styles.merchantInfo}>
          <Ionicons name="business-outline" size={14} color="#6B7280" />
          <Text style={styles.merchantType}>{getMerchantTypeText(item.merchantType)}</Text>
        </View>
      )}

      {item.role === 'merchant' && item.placeName && (
        <View style={styles.placeInfo}>
          <Ionicons name="location-outline" size={14} color="#10B981" />
          <Text style={styles.placeName}>مرتبط بـ: {item.placeName}</Text>
        </View>
      )}

      {item.role === 'driver' && (
        <View style={styles.driverInfo}>
          <Text style={styles.driverArea}>منطقة: {item.serviceArea || 'غير محدد'}</Text>
          <View style={[styles.availabilityBadge, { backgroundColor: item.isAvailable ? '#10B98120' : '#EF444420' }]}>
            <Text style={[styles.availabilityText, { color: item.isAvailable ? '#10B981' : '#EF4444' }]}>
              {item.isAvailable ? 'متاح' : 'غير متاح'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="create-outline" size={18} color="#FFF" />
          <Text style={styles.actionButtonText}>تعديل</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, item.active ? styles.disableButton : styles.enableButton]}
          onPress={() => handleToggleStatus(item)}
        >
          <Ionicons name={item.active ? "close-circle-outline" : "checkmark-circle-outline"} size={18} color="#FFF" />
          <Text style={styles.actionButtonText}>{item.active ? 'تعطيل' : 'تفعيل'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
          <Text style={styles.actionButtonText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
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
        <Text style={styles.headerTitle}>إدارة المستخدمين</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddUser')}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadUsers} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد مستخدمين</Text>
          </View>
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'right',
  },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  userPhone: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  merchantType: { fontSize: 12, color: '#6B7280' },
  placeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  placeName: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverArea: { fontSize: 12, color: '#6B7280' },
  availabilityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  availabilityText: { fontSize: 10, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButton: { backgroundColor: '#F59E0B' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
