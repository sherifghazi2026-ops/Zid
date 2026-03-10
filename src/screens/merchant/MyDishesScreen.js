import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyDishes, deleteDish, toggleDishAvailability } from '../../services/dishService';

export default function MyDishesScreen({ navigation, route }) {
  const { providerId, providerType, providerName } = route.params;
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      const result = await getMyDishes(providerId, providerType);
      if (result.success) {
        // ترتيب الأطباق: قيد المراجعة أولاً، ثم المقبولة، ثم المرفوضة
        const sortedDishes = result.data.sort((a, b) => {
          const statusOrder = { pending: 1, approved: 2, rejected: 3 };
          return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
        });
        setDishes(sortedDishes);
      }
    } catch (error) {
      console.error('خطأ في جلب الأطباق:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (dish) => {
    Alert.alert(
      'حذف الطبق',
      `هل أنت متأكد من حذف ${dish.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDish(dish.$id, dish.images);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الطبق');
              loadDishes();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleToggleAvailability = async (dish) => {
    const result = await toggleDishAvailability(dish.$id, !dish.isAvailable);
    if (result.success) {
      loadDishes();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#F59E0B'; // برتقالي
      case 'approved': return '#10B981'; // أخضر
      case 'rejected': return '#EF4444'; // أحمر
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'قيد المراجعة';
      case 'approved': return 'مقبول';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const handleDishPress = (dish) => {
    if (dish.status === 'approved') {
      // للمقبول: تعديل
      navigation.navigate('EditDishScreen', { dishId: dish.$id });
    } else if (dish.status === 'pending') {
      // لقيد المراجعة: عرض التفاصيل
      setSelectedDish(dish);
      setModalVisible(true);
    } else if (dish.status === 'rejected') {
      // للمرفوض: عرض سبب الرفض
      setSelectedDish(dish);
      setModalVisible(true);
    }
  };

  const renderDishItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.dishCard, item.status === 'rejected' && styles.rejectedCard]}
      onPress={() => handleDishPress(item)}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.dishImage} />
      ) : (
        <View style={[styles.dishImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={30} color="#9CA3AF" />
        </View>
      )}

      <View style={styles.dishInfo}>
        <View style={styles.dishHeader}>
          <Text style={styles.dishName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.dishPrice}>{item.price} ج</Text>

        {item.videoUrl && (
          <View style={styles.videoIndicator}>
            <Ionicons name="videocam" size={14} color="#EF4444" />
            <Text style={styles.videoText}>فيديو مرفق</Text>
          </View>
        )}

        <View style={styles.dishActions}>
          {item.status === 'approved' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: item.isAvailable ? '#EF4444' : '#10B981' }]}
              onPress={() => handleToggleAvailability(item)}
            >
              <Ionicons
                name={item.isAvailable ? 'close-outline' : 'checkmark-outline'}
                size={16}
                color="#FFF"
              />
              <Text style={styles.actionButtonText}>
                {item.isAvailable ? 'تعطيل' : 'تفعيل'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>أطباقي - {providerName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddDishScreen', { providerId, providerType, providerName })}>
          <Ionicons name="add-circle" size={28} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dishes}
        renderItem={renderDishItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDishes(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أطباق</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddDishScreen', { providerId, providerType, providerName })}
            >
              <Text style={styles.addButtonText}>إضافة طبق جديد</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal عرض تفاصيل الطبق (للمراجعة أو الرفض) */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDish?.status === 'pending' ? 'تفاصيل الطبق (قيد المراجعة)' : 'سبب الرفض'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {selectedDish && (
              <ScrollView style={styles.modalBody}>
                {/* صورة الطبق */}
                {selectedDish.images && selectedDish.images.length > 0 && (
                  <ScrollView horizontal style={styles.modalImages}>
                    {selectedDish.images.map((url, index) => (
                      <Image key={index} source={{ uri: url }} style={styles.modalImage} />
                    ))}
                  </ScrollView>
                )}

                {/* معلومات الطبق */}
                <View style={styles.modalInfo}>
                  <Text style={styles.modalDishName}>{selectedDish.name}</Text>
                  <Text style={styles.modalDishPrice}>{selectedDish.price} ج</Text>

                  {selectedDish.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>الوصف</Text>
                      <Text style={styles.modalText}>{selectedDish.description}</Text>
                    </View>
                  )}

                  {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>المكونات</Text>
                      <View style={styles.modalIngredients}>
                        {selectedDish.ingredients.map((ing, idx) => (
                          <View key={idx} style={styles.modalIngredientChip}>
                            <Text style={styles.modalIngredientText}>{ing}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedDish.category && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>التصنيف</Text>
                      <Text style={styles.modalText}>{selectedDish.category}</Text>
                    </View>
                  )}

                  {selectedDish.videoUrl && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>فيديو التحضير</Text>
                      <TouchableOpacity style={styles.modalVideoButton}>
                        <Ionicons name="play-circle" size={24} color="#F59E0B" />
                        <Text style={styles.modalVideoText}>مشاهدة الفيديو</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedDish.status === 'rejected' && selectedDish.rejectionReason && (
                    <View style={[styles.modalSection, styles.rejectionSection]}>
                      <Text style={styles.modalSectionTitle}>سبب الرفض</Text>
                      <Text style={styles.modalRejectionText}>{selectedDish.rejectionReason}</Text>
                    </View>
                  )}

                  <View style={styles.modalStatus}>
                    <Text style={styles.modalStatusLabel}>الحالة:</Text>
                    <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedDish.status) + '20' }]}>
                      <Text style={[styles.modalStatusText, { color: getStatusColor(selectedDish.status) }]}>
                        {getStatusText(selectedDish.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalButtons}>
              {selectedDish?.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.editButton]}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('EditDishScreen', { dishId: selectedDish.$id });
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#FFF" />
                    <Text style={styles.modalButtonText}>تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={() => {
                      setModalVisible(false);
                      handleDelete(selectedDish);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                    <Text style={styles.modalButtonText}>حذف</Text>
                  </TouchableOpacity>
                </>
              )}
              {selectedDish?.status === 'rejected' && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    setModalVisible(false);
                    handleDelete(selectedDish);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                  <Text style={styles.modalButtonText}>حذف</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  addButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  addButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  rejectedCard: {
    opacity: 0.8,
    backgroundColor: '#FEF2F2',
  },
  dishImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  dishInfo: { flex: 1 },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dishName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  dishPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginBottom: 4 },
  videoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  videoText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  dishActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  deleteButton: { backgroundColor: '#6B7280' },
  actionButtonText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalBody: { maxHeight: '70%' },
  modalImages: { flexDirection: 'row', padding: 16 },
  modalImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  modalInfo: { padding: 16 },
  modalDishName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  modalDishPrice: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B', marginBottom: 16 },
  modalSection: { marginBottom: 16 },
  modalSectionTitle: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  modalText: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  modalIngredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalIngredientChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalIngredientText: { fontSize: 12, color: '#1F2937' },
  modalVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalVideoText: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  rejectionSection: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  modalRejectionText: { fontSize: 14, color: '#EF4444', lineHeight: 20 },
  modalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalStatusLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginRight: 8 },
  modalStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  modalStatusText: { fontSize: 12, fontWeight: '600' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  editButton: { backgroundColor: '#F59E0B' },
  closeButton: { backgroundColor: '#F3F4F6' },
  closeButtonText: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  modalButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
