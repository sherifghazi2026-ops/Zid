import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { TABLES } from '../../lib/tables';
import { verifyMerchant } from '../../services/userService';
import { fontFamily } from '../../utils/fonts';

export default function VerificationRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('role', 'merchant')
        .eq('is_verified', false)
        .or('verification_image.not.is.null,verification_image.not.eq.""')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('خطأ في جلب طلبات التوثيق:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerify = (userId) => {
    Alert.alert('تأكيد التوثيق', 'هل أنت متأكد من توثيق هذا التاجر؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'توثيق',
        onPress: async () => {
          const result = await verifyMerchant(userId, true);
          if (result.success) {
            Alert.alert('✅ تم', 'تم توثيق التاجر');
            loadRequests();
          } else {
            Alert.alert('خطأ', result.error);
          }
        }
      }
    ]);
  };

  const openImage = (url) => { setSelectedImage(url); setModalVisible(true); };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.name, { fontFamily: fontFamily.arabic }]}>{item.full_name || item.name}</Text>
        <Text style={[styles.phone, { fontFamily: fontFamily.arabic }]}>{item.phone}</Text>
      </View>
      <Text style={[styles.type, { fontFamily: fontFamily.arabic }]}>نوع النشاط: {item.merchant_type || 'غير محدد'}</Text>
      {item.verification_image && (
        <TouchableOpacity style={styles.imageRow} onPress={() => openImage(item.verification_image)}>
          <Ionicons name="image-outline" size={20} color="#4F46E5" />
          <Text style={[styles.imageText, { fontFamily: fontFamily.arabic }]}>عرض صورة البطاقة</Text>
        </TouchableOpacity>
      )}
      {item.commercial_register && (
        <TouchableOpacity style={styles.imageRow} onPress={() => openImage(item.commercial_register)}>
          <Ionicons name="business-outline" size={20} color="#4F46E5" />
          <Text style={[styles.imageText, { fontFamily: fontFamily.arabic }]}>عرض السجل التجاري</Text>
        </TouchableOpacity>
      )}
      {item.tax_card && (
        <TouchableOpacity style={styles.imageRow} onPress={() => openImage(item.tax_card)}>
          <Ionicons name="document-text-outline" size={20} color="#4F46E5" />
          <Text style={[styles.imageText, { fontFamily: fontFamily.arabic }]}>عرض البطاقة الضريبية</Text>
        </TouchableOpacity>
      )}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.verifyButton} onPress={() => handleVerify(item.id)}>
          <Text style={[styles.verifyButtonText, { fontFamily: fontFamily.arabic }]}>توثيق</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: fontFamily.arabic }]}>طلبات التوثيق</Text>
        <TouchableOpacity onPress={loadRequests}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRequests} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={80} color="#E5E7EB" />
            <Text style={[styles.emptyText, { fontFamily: fontFamily.arabic }]}>لا توجد طلبات توثيق حالياً</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
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
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  phone: { fontSize: 14, color: '#6B7280' },
  type: { fontSize: 14, color: '#4B5563', marginBottom: 12 },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  imageText: { fontSize: 14, color: '#4F46E5' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  verifyButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});
