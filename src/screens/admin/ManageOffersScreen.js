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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllOffers, createOffer, deleteOffer } from '../../services/offersService';

export default function ManageOffersScreen({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // حقول العرض الجديد - بدون صورة
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    const result = await getAllOffers();
    if (result.success) {
      setOffers(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const publishOffer = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('تنبيه', 'العنوان والوصف مطلوبان');
      return;
    }

    setSubmitting(true);
    try {
      // إنشاء عرض بدون صورة
      const result = await createOffer({
        title: title.trim(),
        description: description.trim(),
        imageUrl: null, // بدون صورة
      });

      if (result.success) {
        Alert.alert('تم', 'تم نشر العرض بنجاح');
        setModalVisible(false);
        setTitle('');
        setDescription('');
        loadOffers();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في نشر العرض:', error);
      Alert.alert('خطأ', 'فشل في نشر العرض');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOffer = (offer) => {
    Alert.alert(
      'حذف العرض',
      'هل أنت متأكد من حذف هذا العرض؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteOffer(offer.$id, offer.imageUrl);
            if (result.success) {
              Alert.alert('تم', 'تم حذف العرض');
              loadOffers();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOffers();
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
        <Text style={styles.headerTitle}>إدارة العروض</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyText}>لا توجد عروض</Text>
            <Text style={styles.emptySubText}>اضغط على + لإضافة عرض جديد</Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.$id} style={styles.offerCard}>
              <View style={styles.offerContent}>
                <View style={styles.offerHeader}>
                  <View style={styles.offerTitleContainer}>
                    <Ionicons name="pricetag-outline" size={20} color="#F59E0B" />
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteOffer(offer)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.offerDescription}>{offer.description}</Text>
                <Text style={styles.offerDate}>
                  {new Date(offer.createdAt).toLocaleDateString('ar-EG')}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal إضافة عرض جديد - بدون صورة */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة عرض جديد</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>عنوان العرض</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: خصم 20% على أول طلب"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>وصف العرض</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="تفاصيل العرض..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.publishButton, submitting && styles.disabled]}
                onPress={publishOffer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.publishButtonText}>نشر العرض</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#1F2937', fontWeight: '600' },
  emptySubText: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },
  
  offerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  offerContent: { padding: 16 },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  offerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    flex: 1,
  },
  offerDescription: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 8, 
    lineHeight: 20,
  },
  offerDate: { fontSize: 12, color: '#9CA3AF', textAlign: 'left' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  textArea: { minHeight: 100 },
  publishButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  publishButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
