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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';
import { toggleUserStatus, verifyChef, deleteUser } from '../../appwrite/userService';

export default function ManageHomeChefsScreen({ navigation }) {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChef, setSelectedChef] = useState(null);
  const [chefDishes, setChefDishes] = useState([]);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [dishesModalVisible, setDishesModalVisible] = useState(false);

  useEffect(() => {
    loadChefs();
  }, []);

  const loadChefs = async () => {
    try {
      // جلب جميع الشيفات (تجار من نوع home_chef)
      const response = await databases.listDocuments(
        DATABASE_ID,
        'users',
        [
          Query.equal('role', 'merchant'),
          Query.equal('merchantType', 'home_chef'),
          Query.orderDesc('createdAt')
        ]
      );
      
      // جلب عدد الأطباق لكل شيف
      const chefsWithStats = await Promise.all(
        response.documents.map(async (chef) => {
          try {
            // كل الأطباق
            const allDishesRes = await databases.listDocuments(
              DATABASE_ID,
              'dishes',
              [
                Query.equal('providerId', chef.$id),
                Query.equal('providerType', 'home_chef'),
                Query.limit(1)
              ]
            );
            
            // الأطباق قيد المراجعة
            const pendingDishesRes = await databases.listDocuments(
              DATABASE_ID,
              'dishes',
              [
                Query.equal('providerId', chef.$id),
                Query.equal('providerType', 'home_chef'),
                Query.equal('status', 'pending'),
                Query.limit(1)
              ]
            );
            
            // الأطباق المقبولة
            const approvedDishesRes = await databases.listDocuments(
              DATABASE_ID,
              'dishes',
              [
                Query.equal('providerId', chef.$id),
                Query.equal('providerType', 'home_chef'),
                Query.equal('status', 'approved'),
                Query.limit(1)
              ]
            );
            
            return {
              ...chef,
              dishesCount: allDishesRes.total || 0,
              pendingDishes: pendingDishesRes.total || 0,
              approvedDishes: approvedDishesRes.total || 0,
            };
          } catch (e) {
            return {
              ...chef,
              dishesCount: 0,
              pendingDishes: 0,
              approvedDishes: 0,
            };
          }
        })
      );
      
      setChefs(chefsWithStats);
    } catch (error) {
      console.error('خطأ في جلب الشيفات:', error);
      Alert.alert('خطأ', 'فشل في تحميل الشيفات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadChefDishes = async (chefId) => {
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
      
      // تجميع الأطباق حسب الحالة
      const grouped = {
        pending: response.documents.filter(d => d.status === 'pending'),
        approved: response.documents.filter(d => d.status === 'approved'),
        rejected: response.documents.filter(d => d.status === 'rejected'),
      };
      
      setChefDishes(grouped);
    } catch (error) {
      console.error('خطأ في جلب أطباق الشيف:', error);
    }
  };

  const handleToggleStatus = async (chef) => {
    Alert.alert(
      'تغيير حالة الشيف',
      `هل أنت متأكد من ${chef.active ? 'تعطيل' : 'تفعيل'} ${chef.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: chef.active ? 'تعطيل' : 'تفعيل',
          onPress: async () => {
            const result = await toggleUserStatus(chef.$id, !chef.active);
            if (result.success) {
              Alert.alert('تم', `تم ${!chef.active ? 'تفعيل' : 'تعطيل'} ${chef.name}`);
              loadChefs();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleVerify = async (chef) => {
    Alert.alert(
      'توثيق الشيف',
      `هل أنت متأكد من توثيق ${chef.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'توثيق',
          onPress: async () => {
            const result = await verifyChef(chef.$id, true);
            if (result.success) {
              Alert.alert('✅ تم', 'تم توثيق الشيف');
              loadChefs();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleDelete = (chef) => {
    Alert.alert(
      'حذف الشيف',
      `هل أنت متأكد من حذف ${chef.name}؟\nسيتم حذف جميع أطباقه أيضاً.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteUser(chef.$id);
            if (result.success) {
              Alert.alert('تم', 'تم حذف الشيف');
              loadChefs();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const viewChefDetails = (chef) => {
    setSelectedChef(chef);
    loadChefDishes(chef.$id);
    setViewModalVisible(true);
  };

  const viewChefDishes = (chef) => {
    setSelectedChef(chef);
    loadChefDishes(chef.$id);
    setDishesModalVisible(true);
  };

  const renderChefCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.chefCard, !item.active && styles.chefCardDisabled]}
      onPress={() => viewChefDetails(item)}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.chefImage} />
      ) : (
        <View style={[styles.chefImage, styles.placeholderImage]}>
          <Ionicons name="person-outline" size={30} color="#9CA3AF" />
        </View>
      )}

      <View style={styles.chefInfo}>
        <View style={styles.chefHeader}>
          <Text style={styles.chefName}>{item.name}</Text>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          )}
        </View>
        
        <View style={styles.chefStats}>
          <View style={styles.statItem}>
            <Ionicons name="restaurant-outline" size={12} color="#6B7280" />
            <Text style={styles.statText}>{item.dishesCount} أطباق</Text>
          </View>
          {item.pendingDishes > 0 && (
            <View style={[styles.statusBadge, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                {item.pendingDishes} بانتظار المراجعة
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chefMeta}>
          <View style={[styles.statusDot, { backgroundColor: item.active ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.metaText}>{item.active ? 'نشط' : 'معطل'}</Text>
          
          {item.healthCertUrl && (
            <>
              <Ionicons name="document-text" size={14} color="#4F46E5" style={{ marginLeft: 8 }} />
              <Text style={styles.metaText}>شهادة</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => viewChefDishes(item)}
        >
          <Ionicons name="restaurant-outline" size={16} color="#FFF" />
        </TouchableOpacity>

        {!item.isVerified && (
          <TouchableOpacity
            style={[styles.actionButton, styles.verifyButton]}
            onPress={() => handleVerify(item)}
          >
            <Ionicons name="shield-checkmark" size={16} color="#FFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, item.active ? styles.disableButton : styles.enableButton]}
          onPress={() => handleToggleStatus(item)}
        >
          <Ionicons 
            name={item.active ? "close-outline" : "checkmark-outline"} 
            size={16} 
            color="#FFF" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // ✅ دالة منفصلة لعرض عنصر الطبق مع key
  const renderDishItem = ({ item }) => (
    <View key={item.$id} style={styles.dishItem}>
      {item.images && item.images[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.dishImage} />
      ) : (
        <View style={[styles.dishImage, styles.placeholderSmall]} />
      )}
      <View style={styles.dishItemInfo}>
        <Text style={styles.dishItemName}>{item.name}</Text>
        <Text style={styles.dishItemPrice}>{item.price} ج</Text>
        <View style={[styles.dishStatusBadge, { 
          backgroundColor: 
            item.status === 'approved' ? '#10B98120' :
            item.status === 'pending' ? '#F59E0B20' : '#EF444420'
        }]}>
          <Text style={[styles.dishStatusText, { 
            color: 
              item.status === 'approved' ? '#10B981' :
              item.status === 'pending' ? '#F59E0B' : '#EF4444'
          }]}>
            {item.status === 'approved' ? 'مقبول' :
             item.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
          </Text>
        </View>
      </View>
    </View>
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الشيفات المنزلية</Text>
        <TouchableOpacity onPress={loadChefs}>
          <Ionicons name="refresh-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chefs}
        renderItem={renderChefCard}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadChefs} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا يوجد شيفات</Text>
          </View>
        }
      />

      {/* Modal عرض تفاصيل الشيف */}
      <Modal visible={viewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل الشيف</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {selectedChef && (
              <ScrollView>
                <View style={styles.detailAvatar}>
                  {selectedChef.imageUrl ? (
                    <Image source={{ uri: selectedChef.imageUrl }} style={styles.detailImage} />
                  ) : (
                    <View style={[styles.detailImage, styles.placeholderLarge]}>
                      <Ionicons name="person" size={50} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الاسم:</Text>
                  <Text style={styles.detailValue}>{selectedChef.name}</Text>
                  {selectedChef.isVerified && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>رقم الهاتف:</Text>
                  <Text style={styles.detailValue}>{selectedChef.phone}</Text>
                </View>

                {selectedChef.bio ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>نبذة:</Text>
                    <Text style={styles.detailValue}>{selectedChef.bio}</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الحالة:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedChef.active ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.statusText, { color: selectedChef.active ? '#10B981' : '#EF4444' }]}>
                      {selectedChef.active ? 'نشط' : 'معطل'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>التوثيق:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedChef.isVerified ? '#10B98120' : '#F59E0B20' }]}>
                    <Text style={[styles.statusText, { color: selectedChef.isVerified ? '#10B981' : '#F59E0B' }]}>
                      {selectedChef.isVerified ? 'موثق' : 'غير موثق'}
                    </Text>
                  </View>
                </View>

                {selectedChef.specialties && selectedChef.specialties.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>التخصصات:</Text>
                    <View style={styles.specialtiesContainer}>
                      {selectedChef.specialties.map((spec, idx) => (
                        <View key={idx} style={styles.specialtyChip}>
                          <Text style={styles.specialtyText}>{spec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>رسوم التوصيل:</Text>
                  <Text style={styles.detailValue}>{selectedChef.deliveryFee || 0} ج</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>نطاق التوصيل:</Text>
                  <Text style={styles.detailValue}>{selectedChef.deliveryRadius || 10} كم</Text>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{selectedChef.dishesCount || 0}</Text>
                    <Text style={styles.statBoxLabel}>إجمالي الأطباق</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statBoxNumber, { color: '#F59E0B' }]}>{selectedChef.pendingDishes || 0}</Text>
                    <Text style={styles.statBoxLabel}>قيد المراجعة</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statBoxNumber, { color: '#10B981' }]}>{selectedChef.approvedDishes || 0}</Text>
                    <Text style={styles.statBoxLabel}>مقبولة</Text>
                  </View>
                </View>

                {selectedChef.healthCertUrl && (
                  <TouchableOpacity 
                    style={styles.certButton}
                    onPress={() => setCertModalVisible(true)}
                  >
                    <Ionicons name="document-text" size={20} color="#4F46E5" />
                    <Text style={styles.certButtonText}>عرض الشهادة الصحية</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.dishesButton}
                  onPress={() => {
                    setViewModalVisible(false);
                    viewChefDishes(selectedChef);
                  }}
                >
                  <Ionicons name="restaurant-outline" size={20} color="#FFF" />
                  <Text style={styles.dishesButtonText}>عرض جميع الأطباق ({selectedChef.dishesCount})</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal عرض الشهادة الصحية */}
      <Modal visible={certModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>الشهادة الصحية</Text>
              <TouchableOpacity onPress={() => setCertModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {selectedChef?.healthCertUrl && (
              <Image 
                source={{ uri: selectedChef.healthCertUrl }} 
                style={styles.certImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal عرض أطباق الشيف - مع FlatList لكل قسم */}
      <Modal visible={dishesModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '95%', maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                أطباق {selectedChef?.name}
              </Text>
              <TouchableOpacity onPress={() => setDishesModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {chefDishes.pending && chefDishes.pending.length > 0 && (
                <View style={styles.dishSection}>
                  <Text style={styles.dishSectionTitle}>⏳ قيد المراجعة ({chefDishes.pending.length})</Text>
                  {chefDishes.pending.map(dish => (
                    <View key={dish.$id} style={styles.dishItem}>
                      {dish.images && dish.images[0] ? (
                        <Image source={{ uri: dish.images[0] }} style={styles.dishImage} />
                      ) : (
                        <View style={[styles.dishImage, styles.placeholderSmall]} />
                      )}
                      <View style={styles.dishItemInfo}>
                        <Text style={styles.dishItemName}>{dish.name}</Text>
                        <Text style={styles.dishItemPrice}>{dish.price} ج</Text>
                        <View style={[styles.dishStatusBadge, { backgroundColor: '#F59E0B20' }]}>
                          <Text style={[styles.dishStatusText, { color: '#F59E0B' }]}>قيد المراجعة</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {chefDishes.approved && chefDishes.approved.length > 0 && (
                <View style={styles.dishSection}>
                  <Text style={styles.dishSectionTitle}>✅ مقبولة ({chefDishes.approved.length})</Text>
                  {chefDishes.approved.map(dish => (
                    <View key={dish.$id} style={styles.dishItem}>
                      {dish.images && dish.images[0] ? (
                        <Image source={{ uri: dish.images[0] }} style={styles.dishImage} />
                      ) : (
                        <View style={[styles.dishImage, styles.placeholderSmall]} />
                      )}
                      <View style={styles.dishItemInfo}>
                        <Text style={styles.dishItemName}>{dish.name}</Text>
                        <Text style={styles.dishItemPrice}>{dish.price} ج</Text>
                        <View style={[styles.dishStatusBadge, { backgroundColor: '#10B98120' }]}>
                          <Text style={[styles.dishStatusText, { color: '#10B981' }]}>مقبول</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {chefDishes.rejected && chefDishes.rejected.length > 0 && (
                <View style={styles.dishSection}>
                  <Text style={styles.dishSectionTitle}>❌ مرفوضة ({chefDishes.rejected.length})</Text>
                  {chefDishes.rejected.map(dish => (
                    <View key={dish.$id} style={styles.dishItem}>
                      {dish.images && dish.images[0] ? (
                        <Image source={{ uri: dish.images[0] }} style={styles.dishImage} />
                      ) : (
                        <View style={[styles.dishImage, styles.placeholderSmall]} />
                      )}
                      <View style={styles.dishItemInfo}>
                        <Text style={styles.dishItemName}>{dish.name}</Text>
                        <Text style={styles.dishItemPrice}>{dish.price} ج</Text>
                        <View style={[styles.dishStatusBadge, { backgroundColor: '#EF444420' }]}>
                          <Text style={[styles.dishStatusText, { color: '#EF4444' }]}>مرفوض</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {(!chefDishes.pending || chefDishes.pending.length === 0) &&
               (!chefDishes.approved || chefDishes.approved.length === 0) &&
               (!chefDishes.rejected || chefDishes.rejected.length === 0) && (
                <View style={styles.emptyDishes}>
                  <Ionicons name="restaurant-outline" size={60} color="#E5E7EB" />
                  <Text style={styles.emptyDishesText}>لا يوجد أطباق</Text>
                </View>
              )}
            </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  list: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },

  chefCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  chefCardDisabled: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  chefImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  chefInfo: { flex: 1 },
  chefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  chefName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  chefStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statText: { fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  chefMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  metaText: { fontSize: 10, color: '#6B7280' },

  actionButtons: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  actionButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  viewButton: { backgroundColor: '#4F46E5' },
  verifyButton: { backgroundColor: '#10B981' },
  disableButton: { backgroundColor: '#EF4444' },
  enableButton: { backgroundColor: '#10B981' },
  deleteButton: { backgroundColor: '#6B7280' },

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
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

  detailAvatar: { alignItems: 'center', marginBottom: 20 },
  detailImage: { width: 100, height: 100, borderRadius: 50 },
  placeholderLarge: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  specialtyChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: { fontSize: 11, color: '#1F2937' },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  statBox: { alignItems: 'center' },
  statBoxNumber: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  statBoxLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  certButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  certButtonText: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },

  dishesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
  },
  dishesButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  certImage: { width: '100%', height: 400, borderRadius: 8 },

  dishSection: { marginBottom: 20 },
  dishSectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  dishItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  dishImage: { width: 40, height: 40, borderRadius: 6, marginRight: 8 },
  placeholderSmall: { backgroundColor: '#F3F4F6' },
  dishItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  dishItemName: { fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 1 },
  dishItemPrice: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginRight: 8 },
  dishStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  dishStatusText: { fontSize: 9, fontWeight: '600' },
  emptyDishes: { alignItems: 'center', padding: 30 },
  emptyDishesText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
});
