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
import { getAllProducts, PRODUCT_CATEGORIES } from '../../services/productsService';

export default function ManageProductCategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // حقول القسم الجديد
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('cube-outline');
  const [categoryColor, setCategoryColor] = useState('#6B7280');

  const colors = [
    '#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
  ];

  const icons = [
    'gift-outline', 'home-outline', 'flash-outline', 'cube-outline',
    'basket-outline', 'shirt-outline', 'watch-outline', 'phone-portrait-outline'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    // جلب الأقسام الموجودة في Appwrite
    // يمكن إضافة Collection منفصلة للأقسام لاحقاً
    const defaultCategories = [
      { id: 'gifts', name: 'هدايا', icon: 'gift-outline', color: '#EC4899' },
      { id: 'home', name: 'منتجات منزلية', icon: 'home-outline', color: '#10B981' },
      { id: 'electronics', name: 'أجهزة كهربائية', icon: 'flash-outline', color: '#3B82F6' },
      { id: 'other', name: 'أخرى', icon: 'cube-outline', color: '#6B7280' },
    ];
    setCategories(defaultCategories);
    setLoading(false);
    setRefreshing(false);
  };

  const handleAddCategory = () => {
    if (!categoryId.trim() || !categoryName.trim()) {
      Alert.alert('تنبيه', 'المعرف والاسم مطلوبان');
      return;
    }

    const newCategory = {
      id: categoryId.trim().toLowerCase().replace(/\s+/g, '_'),
      name: categoryName.trim(),
      icon: categoryIcon,
      color: categoryColor,
    };

    setCategories([...categories, newCategory]);
    setModalVisible(false);
    resetForm();
    Alert.alert('تم', 'تم إضافة القسم بنجاح');
  };

  const handleEditCategory = () => {
    if (!categoryName.trim()) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }

    const updatedCategories = categories.map(cat => 
      cat.id === editingCategory.id 
        ? { ...cat, name: categoryName.trim(), icon: categoryIcon, color: categoryColor }
        : cat
    );

    setCategories(updatedCategories);
    setModalVisible(false);
    resetForm();
    Alert.alert('تم', 'تم تحديث القسم بنجاح');
  };

  const handleDeleteCategory = (category) => {
    if (category.id === 'gifts' || category.id === 'home' || category.id === 'electronics') {
      Alert.alert('تنبيه', 'لا يمكن حذف الأقسام الأساسية');
      return;
    }

    Alert.alert(
      'حذف القسم',
      `هل أنت متأكد من حذف قسم ${category.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            setCategories(categories.filter(c => c.id !== category.id));
            Alert.alert('تم', 'تم حذف القسم');
          }
        }
      ]
    );
  };

  const openAddModal = () => {
    setEditingCategory(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryIcon(category.icon);
    setCategoryColor(category.color);
    setModalVisible(true);
  };

  const resetForm = () => {
    setCategoryId('');
    setCategoryName('');
    setCategoryIcon('cube-outline');
    setCategoryColor('#6B7280');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
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
        <Text style={styles.headerTitle}>إدارة أقسام المنتجات</Text>
        <TouchableOpacity onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#4F46E5" />
          <Text style={styles.infoText}>
            الأقسام الأساسية (هدايا، منتجات منزلية، أجهزة كهربائية) لا يمكن حذفها.
            يمكنك إضافة أقسام جديدة حسب احتياجك.
          </Text>
        </View>

        {categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryInfo}>
              <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon} size={24} color={category.color} />
              </View>
              <View style={styles.categoryDetails}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryId}>{category.id}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openEditModal(category)}
              >
                <Ionicons name="create-outline" size={18} color="#FFF" />
              </TouchableOpacity>

              {category.id !== 'gifts' && category.id !== 'home' && category.id !== 'electronics' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteCategory(category)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal إضافة/تعديل قسم */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {!editingCategory && (
                <>
                  <Text style={styles.label}>المعرف (id)</Text>
                  <TextInput
                    style={[styles.input, { color: "#1F2937" }]}
                    placeholder="gifts" placeholderTextColor="#9CA3AF"
                    value={categoryId}
                    onChangeText={setCategoryId}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.label}>اسم القسم</Text>
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                placeholder="هدايا" placeholderTextColor="#9CA3AF"
                value={categoryName}
                onChangeText={setCategoryName}
              />

              <Text style={styles.label}>الأيقونة</Text>
              <ScrollView horizontal style={styles.iconsContainer}>
                {icons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      categoryIcon === icon && styles.iconOptionActive
                    ]}
                    onPress={() => setCategoryIcon(icon)}
                  >
                    <Ionicons name={icon} size={24} color={categoryIcon === icon ? '#4F46E5' : '#6B7280'} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>اللون</Text>
              <ScrollView horizontal style={styles.colorsContainer}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      categoryColor === color && styles.colorOptionActive
                    ]}
                    onPress={() => setCategoryColor(color)}
                  />
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingCategory ? handleEditCategory : handleAddCategory}
              >
                <Text style={styles.saveButtonText}>
                  {editingCategory ? 'حفظ التغييرات' : 'إضافة القسم'}
                </Text>
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
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 14, color: '#4F46E5' },
  
  categoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryDetails: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  categoryId: { fontSize: 12, color: '#9CA3AF' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F59E0B' },
  deleteButton: { backgroundColor: '#EF4444' },

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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  iconsContainer: { flexDirection: 'row', marginBottom: 10 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconOptionActive: { borderColor: '#4F46E5', borderWidth: 2 },
  colorsContainer: { flexDirection: 'row', marginBottom: 20 },
  colorOption: { width: 40, height: 40, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorOptionActive: { borderColor: '#1F2937' },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
