import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video'; // ✅ استخدام expo-video بدلاً من expo-av
import { databases, DATABASE_ID } from '../../appwrite/config';
import { Query } from 'appwrite';
import { approveDish, rejectDish } from '../../services/dishService';

const { width } = Dimensions.get('window');

export default function ReviewDishesScreen({ navigation }) {
  const [dishes, setDishes] = useState([]);
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    loadPendingDishes();
  }, []);

  const loadPendingDishes = async () => {
    try {
      // جلب الأطباق قيد المراجعة
      const dishesResponse = await databases.listDocuments(
        DATABASE_ID,
        'dishes',
        [
          Query.equal('status', 'pending'),
          Query.orderDesc('createdAt')
        ]
      );

      // جلب معلومات مقدمي الخدمة (التجار)
      const providerIds = [...new Set(dishesResponse.documents.map(d => d.providerId))];
      const providersMap = {};

      for (const id of providerIds) {
        try {
          const user = await databases.getDocument(
            DATABASE_ID,
            'users',
            id
          );
          providersMap[id] = {
            name: user.name,
            type: user.merchantType === 'home_chef' ? 'شيف منزلي' : 'مطعم'
          };
        } catch (e) {
          providersMap[id] = { name: 'غير معروف', type: '' };
        }
      }

      setProviders(providersMap);
      setDishes(dishesResponse.documents);

    } catch (error) {
      console.error('❌ خطأ في جلب الأطباق:', error);
      Alert.alert('خطأ', 'فشل في جلب الأطباق');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (dish) => {
    Alert.alert(
      'موافقة على الطبق',
      `هل أنت متأكد من الموافقة على "${dish.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'موافقة',
          onPress: async () => {
            const result = await approveDish(dish.$id);
            if (result.success) {
              Alert.alert('✅ تم', 'تمت الموافقة على الطبق');
              loadPendingDishes();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال سبب الرفض');
      return;
    }

    const result = await rejectDish(selectedDish.$id, rejectReason);
    if (result.success) {
      Alert.alert('تم', 'تم رفض الطبق');
      setModalVisible(false);
      setRejectReason('');
      loadPendingDishes();
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const viewDishDetails = (dish) => {
    setSelectedDish(dish);
    setViewModalVisible(true);
  };

  const playVideo = (url) => {
    setVideoUrl(url);
    setVideoModalVisible(true);
  };

  const renderDishCard = ({ item }) => {
    const provider = providers[item.providerId] || { name: 'جاري التحميل...', type: '' };

    return (
      <TouchableOpacity
        style={styles.dishCard}
        onPress={() => viewDishDetails(item)}
        activeOpacity={0.7}
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
            {item.videoUrl && (
              <View style={styles.videoIndicator}>
                <Ionicons name="videocam" size={18} color="#EF4444" />
              </View>
            )}
          </View>
          <Text style={styles.dishPrice}>{item.price} ج</Text>
          <Text style={styles.dishProvider}>
            {provider.name} • {provider.type}
          </Text>
          <Text style={styles.dishDate}>
            {new Date(item.createdAt).toLocaleDateString('ar-EG')}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedDish(item);
              setModalVisible(true);
            }}
          >
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>مراجعة الأطباق</Text>
        <TouchableOpacity onPress={loadPendingDishes}>
          <Ionicons name="refresh-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dishes}
        renderItem={renderDishCard}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPendingDishes} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد أطباق بانتظار المراجعة</Text>
          </View>
        }
      />

      {/* Modal رفض الطبق */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>سبب الرفض</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="اكتب سبب الرفض..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={handleReject}
              >
                <Text style={styles.confirmButtonText}>رفض</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal عرض تفاصيل الطبق مع الفيديو */}
      <Modal visible={viewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '95%', maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل الطبق</Text>
              <TouchableOpacity
                onPress={() => {
                  setViewModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {selectedDish && (
              <ScrollView style={styles.detailsScroll}>
                {/* صور الطبق */}
                {selectedDish.images && selectedDish.images.length > 0 && (
                  <ScrollView horizontal style={styles.detailImages}>
                    {selectedDish.images.map((url, index) => (
                      <Image key={index} source={{ uri: url }} style={styles.detailImage} />
                    ))}
                  </ScrollView>
                )}

                {/* فيديو الطبق - لو موجود */}
                {selectedDish.videoUrl && (
                  <View style={styles.videoSection}>
                    <Text style={styles.videoLabel}>🎥 فيديو التحضير</Text>
                    <TouchableOpacity
                      style={styles.videoPreview}
                      onPress={() => playVideo(selectedDish.videoUrl)}
                    >
                      <Image
                        source={{ uri: selectedDish.images?.[0] || 'https://via.placeholder.com/300' }}
                        style={styles.videoThumbnail}
                      />
                      <View style={styles.playButtonOverlay}>
                        <Ionicons name="play-circle" size={60} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* معلومات الطبق */}
                <View style={styles.infoSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>الاسم:</Text>
                    <Text style={styles.detailValue}>{selectedDish.name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>السعر:</Text>
                    <Text style={styles.detailValue}>{selectedDish.price} ج</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>المقدم:</Text>
                    <Text style={styles.detailValue}>
                      {providers[selectedDish.providerId]?.name} •
                      {providers[selectedDish.providerId]?.type}
                    </Text>
                  </View>

                  {selectedDish.description ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>الوصف:</Text>
                      <Text style={styles.detailValue}>{selectedDish.description}</Text>
                    </View>
                  ) : null}

                  {selectedDish.category ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>التصنيف:</Text>
                      <Text style={styles.detailValue}>{selectedDish.category}</Text>
                    </View>
                  ) : null}

                  {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>المكونات:</Text>
                      <View style={styles.ingredientsContainer}>
                        {selectedDish.ingredients.map((ing, idx) => (
                          <View key={idx} style={styles.ingredientChip}>
                            <Text style={styles.ingredientChipText}>{ing}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.approveButton]}
                onPress={() => {
                  setViewModalVisible(false);
                  handleApprove(selectedDish);
                }}
              >
                <Text style={styles.confirmButtonText}>موافقة</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={() => {
                  setViewModalVisible(false);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.confirmButtonText}>رفض</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal تشغيل الفيديو */}
      <Modal visible={videoModalVisible} transparent animationType="fade">
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle}>فيديو التحضير</Text>
              <TouchableOpacity onPress={() => setVideoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {videoUrl && (
              <VideoView
                player={useVideoPlayer(videoUrl, player => {
                  player.loop = false;
                })}
                style={styles.video}
                contentFit="contain"
                nativeControls
              />
            )}
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
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },

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
  dishImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  dishInfo: { flex: 1 },
  dishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dishName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  videoIndicator: { marginLeft: 4 },
  dishPrice: { fontSize: 14, color: '#F59E0B', marginTop: 2 },
  dishProvider: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  dishDate: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  approveButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },

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
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  confirmRejectButton: { backgroundColor: '#EF4444' },
  cancelButtonText: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  confirmButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  detailsScroll: { maxHeight: 500 },
  detailImages: { flexDirection: 'row', marginBottom: 16 },
  detailImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },

  videoSection: { marginBottom: 20 },
  videoLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  infoSection: { paddingHorizontal: 4 },
  detailRow: { marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', width: 80 },
  detailValue: { fontSize: 14, color: '#1F2937', flex: 1 },
  ingredientsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  ingredientChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ingredientChipText: { fontSize: 12, color: '#1F2937' },

  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: '95%',
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
  },
  videoModalTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  video: {
    width: '100%',
    height: '100%',
  },
});
