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
import { getOrders, updateOrderStatus, deleteOrder, ORDER_STATUS } from '../../services/orderService';
import { getUsersByRole } from '../../appwrite/userService';

export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignDriverModalVisible, setAssignDriverModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedFilter, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchDrivers(), fetchMerchants()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const result = await getOrders();
    if (result.success) {
      setOrders(result.data);
    }
  };

  const fetchDrivers = async () => {
    const result = await getUsersByRole('driver');
    if (result.success) {
      setDrivers(result.data);
    }
  };

  const fetchMerchants = async () => {
    const result = await getUsersByRole('merchant');
    if (result.success) {
      setMerchants(result.data);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.customerPhone?.toLowerCase().includes(query) ||
        order.customerAddress?.toLowerCase().includes(query) ||
        order.$id?.toLowerCase().includes(query) ||
        order.merchantName?.toLowerCase().includes(query) ||
        order.driverName?.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    let additionalData = {};
    if (newStatus === ORDER_STATUS.CANCELLED && cancellationReason) {
      additionalData.cancellationReason = cancellationReason;
    }

    const result = await updateOrderStatus(selectedOrder.$id, newStatus, additionalData);
    if (result.success) {
      Alert.alert('تم', 'تم تحديث حالة الطلب');
      setStatusModalVisible(false);
      setCancellationReason('');
      loadData();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleAssignDriver = async (driverId, driverName) => {
    if (!selectedOrder) return;

    const result = await updateOrderStatus(selectedOrder.$id, ORDER_STATUS.PREPARING, {
      driverId,
      driverName,
      assignedAt: new Date().toISOString()
    });

    if (result.success) {
      Alert.alert('تم', 'تم تعيين المندوب بنجاح');
      setAssignDriverModalVisible(false);
      setSelectedOrder(null);
      loadData();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleDeleteOrder = (orderId) => {
    Alert.alert(
      'حذف الطلب',
      'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteOrder(orderId);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الطلب');
              loadData();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return '#F59E0B';
      case ORDER_STATUS.ACCEPTED: return '#3B82F6';
      case ORDER_STATUS.PREPARING: return '#8B5CF6';
      case ORDER_STATUS.ON_THE_WAY: return '#3B82F6';
      case ORDER_STATUS.DELIVERED: return '#10B981';
      case ORDER_STATUS.CANCELLED: return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case ORDER_STATUS.PENDING: return 'معلق';
      case ORDER_STATUS.ACCEPTED: return 'تم القبول';
      case ORDER_STATUS.PREPARING: return 'قيد التجهيز';
      case ORDER_STATUS.ON_THE_WAY: return 'جاري التوصيل';
      case ORDER_STATUS.DELIVERED: return 'تم التسليم';
      case ORDER_STATUS.CANCELLED: return 'ملغي';
      default: return status;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الطلبات</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* شريط البحث */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث برقم الهاتف أو العنوان..." placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* أزرار الفلترة */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        {['all', ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, 
          ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, selectedFilter === filter && styles.activeFilter]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
              {filter === 'all' ? 'الكل' : getStatusText(filter)}
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
          contentContainerStyle={styles.ordersContainer}
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد طلبات</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.$id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>طلب #{order.$id.slice(-6)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.serviceName}>{order.serviceName}</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{order.customerPhone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{order.customerAddress}</Text>
                  </View>
                  {order.merchantName && (
                    <View style={styles.detailRow}>
                      <Ionicons name="business-outline" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>تاجر: {order.merchantName}</Text>
                    </View>
                  )}
                  {order.driverName && (
                    <View style={styles.detailRow}>
                      <Ionicons name="bicycle-outline" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>مندوب: {order.driverName}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                      setSelectedOrder(order);
                      setDetailsModalVisible(true);
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>عرض</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      setSelectedOrder(order);
                      setNewStatus('');
                      setCancellationReason('');
                      setStatusModalVisible(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>تغيير الحالة</Text>
                  </TouchableOpacity>

                  {order.status === ORDER_STATUS.ACCEPTED && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.assignButton]}
                      onPress={() => {
                        setSelectedOrder(order);
                        setAssignDriverModalVisible(true);
                      }}
                    >
                      <Ionicons name="person-add-outline" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>تعيين مندوب</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteOrder(order.$id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal عرض التفاصيل */}
      <Modal visible={detailsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
            {selectedOrder && (
              <ScrollView>
                <Text style={styles.detailLabel}>رقم الطلب: {selectedOrder.$id}</Text>
                <Text style={styles.detailLabel}>الخدمة: {selectedOrder.serviceName}</Text>
                <Text style={styles.detailLabel}>رقم العميل: {selectedOrder.customerPhone}</Text>
                <Text style={styles.detailLabel}>العنوان: {selectedOrder.customerAddress}</Text>
                <Text style={styles.detailLabel}>الحالة: {getStatusText(selectedOrder.status)}</Text>
                <Text style={styles.detailLabel}>التاجر: {selectedOrder.merchantName || 'غير معين'}</Text>
                <Text style={styles.detailLabel}>المندوب: {selectedOrder.driverName || 'غير معين'}</Text>
                <Text style={styles.detailLabel}>تاريخ الإنشاء: {new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}</Text>
                
                {selectedOrder.acceptedAt && (
                  <Text style={styles.detailLabel}>تاريخ القبول: {new Date(selectedOrder.acceptedAt).toLocaleString('ar-EG')}</Text>
                )}
                
                {selectedOrder.deliveredAt && (
                  <Text style={styles.detailLabel}>تاريخ التسليم: {new Date(selectedOrder.deliveredAt).toLocaleString('ar-EG')}</Text>
                )}
                
                {selectedOrder.cancellationReason && (
                  <Text style={styles.detailLabel}>سبب الإلغاء: {selectedOrder.cancellationReason}</Text>
                )}
                
                <Text style={styles.detailLabel}>المنتجات:</Text>
                {selectedOrder.items?.map((item, i) => (
                  <Text key={i} style={styles.itemText}>• {item}</Text>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setDetailsModalVisible(false)}>
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal تغيير الحالة */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تغيير حالة الطلب</Text>
            
            <ScrollView style={styles.statusOptions}>
              {[ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, 
                ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, newStatus === status && styles.selectedStatus]}
                  onPress={() => setNewStatus(status)}
                >
                  <Text style={[styles.statusOptionText, newStatus === status && styles.selectedStatusText]}>
                    {getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {newStatus === ORDER_STATUS.CANCELLED && (
              <TextInput
                style={styles.reasonInput}
                placeholder="سبب الإلغاء (اختياري)" placeholderTextColor="#9CA3AF"
                value={cancellationReason}
                onChangeText={setCancellationReason}
                multiline
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setStatusModalVisible(false)}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateStatus}>
                <Text style={styles.confirmButtonText}>تحديث</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal تعيين مندوب */}
      <Modal visible={assignDriverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تعيين مندوب</Text>
            
            <ScrollView style={styles.driversList}>
              {drivers.map((driver) => (
                <TouchableOpacity
                  key={driver.$id}
                  style={styles.driverItem}
                  onPress={() => handleAssignDriver(driver.$id, driver.name)}
                >
                  <Ionicons name="person-circle-outline" size={40} color="#4F46E5" />
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverArea}>{driver.serviceArea || 'غير محدد'}</Text>
                    <Text style={styles.driverPhone}>{driver.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setAssignDriverModalVisible(false)}>
              <Text style={styles.closeButtonText}>إلغاء</Text>
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
  ordersContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 6 },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  detailText: { fontSize: 14, color: '#4B5563', flex: 1 },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 4,
    borderRadius: 6, 
    gap: 4,
    minWidth: 70,
  },
  viewButton: { backgroundColor: '#3B82F6' },
  editButton: { backgroundColor: '#F59E0B' },
  assignButton: { backgroundColor: '#8B5CF6' },
  deleteButton: { backgroundColor: '#EF4444' },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  
  // Modal styles
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
  detailLabel: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#6B7280', marginLeft: 8, marginBottom: 2 },
  closeButton: { marginTop: 20, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  closeButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
  
  // Status modal
  statusOptions: { maxHeight: 300, marginVertical: 16 },
  statusOption: { padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 8 },
  selectedStatus: { backgroundColor: '#4F46E5' },
  statusOptionText: { fontSize: 14, color: '#1F2937', textAlign: 'center' },
  selectedStatusText: { color: '#FFF' },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  confirmButton: { backgroundColor: '#4F46E5' },
  cancelButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Driver modal
  driversList: { maxHeight: 400 },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  driverInfo: { marginLeft: 12, flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  driverArea: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  driverPhone: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
