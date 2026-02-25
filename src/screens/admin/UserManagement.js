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
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllUsers, toggleUserStatus, deleteUser } from '../../appwrite/userService';

export default function UserManagement({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, selectedFilter, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (result.success) {
      setUsers(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(user => user.role === selectedFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.$id?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (user) => {
    Alert.alert(
      user.active ? 'تعطيل المستخدم' : 'تفعيل المستخدم',
      `هل أنت متأكد من ${user.active ? 'تعطيل' : 'تفعيل'} هذا المستخدم؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: user.active ? 'تعطيل' : 'تفعيل',
          onPress: async () => {
            setUpdatingUser(user.$id);
            const result = await toggleUserStatus(user.$id, !user.active);
            if (result.success) {
              Alert.alert('تم', `تم ${user.active ? 'تعطيل' : 'تفعيل'} المستخدم بنجاح`);
              loadUsers();
            } else {
              Alert.alert('خطأ', result.error);
            }
            setUpdatingUser(null);
          }
        }
      ]
    );
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'حذف المستخدم',
      'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setUpdatingUser(user.$id);
            const result = await deleteUser(user.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف المستخدم بنجاح');
              loadUsers();
            } else {
              Alert.alert('خطأ', result.error);
            }
            setUpdatingUser(null);
          }
        }
      ]
    );
  };

  const getRoleText = (role) => {
    switch(role) {
      case 'merchant': return 'تاجر';
      case 'driver': return 'مندوب';
      case 'customer': return 'عميل';
      case 'admin': return 'أدمن';
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'merchant': return '#F59E0B';
      case 'driver': return '#3B82F6';
      case 'customer': return '#10B981';
      case 'admin': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المستخدمين</Text>
        <TouchableOpacity onPress={loadUsers}>
          <Ionicons name="refresh-outline" size={24} color="#EF4444" />
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
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        {['all', 'merchant', 'driver', 'customer', 'admin'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, selectedFilter === filter && styles.activeFilter]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
              {filter === 'all' ? 'الكل' : getRoleText(filter)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.usersContainer}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا يوجد مستخدمين</Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <View key={user.$id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userPhone}>{user.phone}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                      {getRoleText(user.role)}
                    </Text>
                  </View>
                </View>

                <View style={styles.userStatus}>
                  <View style={[styles.statusIndicator, { backgroundColor: user.active ? '#10B981' : '#EF4444' }]} />
                  <Text style={[styles.statusText, { color: user.active ? '#10B981' : '#EF4444' }]}>
                    {user.active ? 'نشط' : 'غير نشط'}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                      setSelectedUser(user);
                      setDetailsModalVisible(true);
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>عرض</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, user.active ? styles.disableButton : styles.enableButton]}
                    onPress={() => handleToggleStatus(user)}
                    disabled={updatingUser === user.$id}
                  >
                    {updatingUser === user.$id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name={user.active ? "close-circle-outline" : "checkmark-circle-outline"} size={18} color="#FFF" />
                        <Text style={styles.actionButtonText}>{user.active ? 'تعطيل' : 'تفعيل'}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(user)}
                    disabled={updatingUser === user.$id}
                  >
                    {updatingUser === user.$id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color="#FFF" />
                        <Text style={styles.actionButtonText}>حذف</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={detailsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تفاصيل المستخدم</Text>
            {selectedUser && (
              <ScrollView>
                <Text style={styles.detailLabel}>الاسم: {selectedUser.name}</Text>
                <Text style={styles.detailLabel}>رقم الهاتف: {selectedUser.phone}</Text>
                <Text style={styles.detailLabel}>الدور: {getRoleText(selectedUser.role)}</Text>
                <Text style={styles.detailLabel}>الحالة: {selectedUser.active ? 'نشط' : 'غير نشط'}</Text>
                <Text style={styles.detailLabel}>تاريخ الإنشاء: {new Date(selectedUser.createdAt).toLocaleString('ar-EG')}</Text>
                {selectedUser.role === 'merchant' && (
                  <Text style={styles.detailLabel}>نوع النشاط: {selectedUser.merchantType || 'غير محدد'}</Text>
                )}
                {selectedUser.role === 'driver' && (
                  <>
                    <Text style={styles.detailLabel}>منطقة الخدمة: {selectedUser.serviceArea || 'غير محدد'}</Text>
                    <Text style={styles.detailLabel}>أقصى مسافة: {selectedUser.maxDeliveryRadius || 10} كم</Text>
                  </>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setDetailsModalVisible(false)}>
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  filterTabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#F3F4F6' },
  activeFilter: { backgroundColor: '#EF4444' },
  filterText: { color: '#1F2937', fontSize: 12 },
  activeFilterText: { color: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  usersContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  userPhone: { fontSize: 14, color: '#6B7280' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '600' },
  userStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    minHeight: 40,
  },
  viewButton: { backgroundColor: '#3B82F6' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  detailLabel: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  closeButton: { marginTop: 20, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  closeButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
});
