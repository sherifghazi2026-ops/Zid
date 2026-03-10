import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, TextInput,
  Modal, ScrollView, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as assistantService from '../../services/assistantService';

const SCREEN_OPTIONS = [
  { label: 'الرئيسية', value: 'home' },
  { label: 'المطاعم', value: 'restaurant' },
  { label: 'الشيفات', value: 'home_chef' },
  { label: 'العروض', value: 'offers' },
  { label: 'السلة', value: 'cart' },
  { label: 'الملف الشخصي', value: 'profile' },
  { label: 'الطلبات', value: 'orders' },
  { label: 'الأدمن', value: 'admin' },
  { label: 'الخدمات', value: 'service' }
];

const ICON_OPTIONS = [
  'chatbubble', 'flash', 'restaurant', 'person', 'cart',
  'pricetag', 'home', 'fast-food', 'pizza', 'cafe',
  'heart', 'star', 'bulb', 'chatbox', 'happy'
];

const COLOR_OPTIONS = [
  '#4F46E5', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
  '#6B7280', '#1F2937'
];

const POSITION_OPTIONS = [
  { label: 'أسفل يمين', value: 'bottom-right' },
  { label: 'أسفل يسار', value: 'bottom-left' },
  { label: 'أسفل وسط', value: 'bottom-center' }
];

export default function AdminAssistantsScreen({ navigation }) {
  const [assistants, setAssistants] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState(null);
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    screen: 'home',
    icon: 'chatbubble',
    color: '#4F46E5',
    systemPrompt: '',
    welcomeMessage: '',
    position: 'bottom-right',
    isActive: true,
    order: '0',
    serviceId: '',
    serviceName: '',
    model: 'llama-3.3-70b-versatile' // قيمة افتراضية
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // جلب المساعدين
    const assistantsResult = await assistantService.getAllAssistants();
    if (assistantsResult.success) {
      setAssistants(assistantsResult.data);
    }
    
    // جلب الخدمات
    const servicesResult = await assistantService.getAllServices();
    if (servicesResult.success) {
      setServices(servicesResult.data);
    }
    
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingAssistant(null);
    setFormData({
      name: '',
      screen: 'home',
      icon: 'chatbubble',
      color: '#4F46E5',
      systemPrompt: '',
      welcomeMessage: '',
      position: 'bottom-right',
      isActive: true,
      order: '0',
      serviceId: '',
      serviceName: '',
      model: 'llama-3.3-70b-versatile'
    });
    setModalVisible(true);
  };

  const openEditModal = (assistant) => {
    setEditingAssistant(assistant);
    setFormData({
      name: assistant.name,
      screen: assistant.screen,
      icon: assistant.icon,
      color: assistant.color,
      systemPrompt: assistant.systemPrompt || '',
      welcomeMessage: assistant.welcomeMessage || '',
      position: assistant.position,
      isActive: assistant.isActive,
      order: assistant.order.toString(),
      serviceId: assistant.serviceId || '',
      serviceName: assistant.serviceName || '',
      model: assistant.model || 'llama-3.3-70b-versatile'
    });
    setModalVisible(true);
  };

  const selectService = (service) => {
    setFormData({
      ...formData,
      serviceId: service.$id,
      serviceName: service.name,
      screen: 'service'
    });
    setShowServiceSelector(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم المساعد');
      return;
    }

    const dataToSave = {
      name: formData.name,
      screen: formData.screen,
      icon: formData.icon,
      color: formData.color,
      systemPrompt: formData.systemPrompt,
      welcomeMessage: formData.welcomeMessage,
      position: formData.position,
      isActive: formData.isActive,
      order: parseInt(formData.order) || 0,
      model: formData.model.trim() || 'llama-3.3-70b-versatile' // لو فاضي، يحط الافتراضي
    };

    // لو فيه serviceId مختار، نضيفه
    if (formData.serviceId) {
      dataToSave.serviceId = formData.serviceId;
      dataToSave.serviceName = formData.serviceName;
    }

    let result;
    if (editingAssistant) {
      result = await assistantService.updateAssistant(editingAssistant.$id, dataToSave);
    } else {
      result = await assistantService.createAssistant(dataToSave);
    }

    if (result.success) {
      setModalVisible(false);
      loadData();
      Alert.alert('✅ تم', `تم ${editingAssistant ? 'تحديث' : 'إضافة'} المساعد بنجاح`);
    } else {
      Alert.alert('خطأ', result.error);
    }
  };

  const handleDelete = (assistant) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف المساعد "${assistant.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await assistantService.deleteAssistant(assistant.$id);
            if (result.success) {
              loadData();
              Alert.alert('✅ تم', 'تم حذف المساعد بنجاح');
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const toggleStatus = async (assistant) => {
    const result = await assistantService.toggleAssistantStatus(assistant.$id, !assistant.isActive);
    if (result.success) {
      loadData();
    }
  };

  const renderAssistant = ({ item }) => (
    <View style={styles.assistantCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={20} color="#FFF" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.assistantName}>{item.name}</Text>
          <Text style={styles.assistantScreen}>
            {item.serviceName ? `${item.serviceName} (خدمة)` : `الشاشة: ${item.screen}`}
          </Text>
          <Text style={styles.assistantModel}>موديل: {item.model || 'افتراضي'}</Text>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => toggleStatus(item)}
          trackColor={{ false: '#E5E7EB', true: item.color }}
        />
      </View>
      
      <Text style={styles.promptPreview} numberOfLines={2}>
        {item.welcomeMessage || 'لا توجد رسالة ترحيب'}
      </Text>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={20} color="#4F46E5" />
          <Text style={styles.actionText}>تعديل</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المساعدين</Text>
        <TouchableOpacity onPress={openCreateModal}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={assistants}
          renderItem={renderAssistant}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا يوجد مساعدين</Text>
              <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Text style={styles.addButtonText}>إضافة مساعد جديد</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal إضافة/تعديل مساعد */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAssistant ? 'تعديل مساعد' : 'إضافة مساعد جديد'}
            </Text>

            <Text style={styles.label}>الاسم</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="مثلاً: مساعد المطاعم"
            />

            <Text style={styles.label}>نوع المساعد</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionChip,
                  formData.screen === 'service' && styles.selectedChip
                ]}
                onPress={() => setShowServiceSelector(true)}
              >
                <Text style={formData.screen === 'service' ? styles.selectedChipText : styles.optionChipText}>
                  {formData.serviceName || 'اختر خدمة'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>أو اختر شاشة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screensScroll}>
              {SCREEN_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.screenChip,
                    formData.screen === option.value && !formData.serviceId && styles.selectedChip
                  ]}
                  onPress={() => setFormData({...formData, screen: option.value, serviceId: '', serviceName: ''})}
                >
                  <Text style={formData.screen === option.value && !formData.serviceId ? styles.selectedChipText : styles.optionChipText}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>الموديل (اسم الموديل من Groq)</Text>
            <TextInput
              style={styles.input}
              value={formData.model}
              onChangeText={(text) => setFormData({...formData, model: text})}
              placeholder="llama-3.3-70b-versatile"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              مثال: llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it
            </Text>

            <Text style={styles.label}>الأيقونة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconsScroll}>
              {ICON_OPTIONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    formData.icon === icon && { backgroundColor: formData.color }
                  ]}
                  onPress={() => setFormData({...formData, icon})}
                >
                  <Ionicons 
                    name={icon} 
                    size={24} 
                    color={formData.icon === icon ? '#FFF' : '#666'} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>اللون</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    formData.color === color && styles.selectedColor
                  ]}
                  onPress={() => setFormData({...formData, color})}
                />
              ))}
            </ScrollView>

            <Text style={styles.label}>الموقع</Text>
            <View style={styles.optionsRow}>
              {POSITION_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    formData.position === option.value && styles.selectedChip
                  ]}
                  onPress={() => setFormData({...formData, position: option.value})}
                >
                  <Text style={formData.position === option.value ? styles.selectedChipText : styles.optionChipText}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>الترتيب</Text>
            <TextInput
              style={styles.input}
              value={formData.order}
              onChangeText={(text) => setFormData({...formData, order: text})}
              keyboardType="numeric"
              placeholder="0"
            />

            <Text style={styles.label}>رسالة الترحيب</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.welcomeMessage}
              onChangeText={(text) => setFormData({...formData, welcomeMessage: text})}
              placeholder="أهلاً! أنا مُنجز. كيف أقدر أساعدك؟"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>البرومبت (تعليمات المساعد)</Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.largeTextArea]}
              value={formData.systemPrompt}
              onChangeText={(text) => setFormData({...formData, systemPrompt: text})}
              placeholder="أنت مساعد ذكي اسمك مُنجز. رد بالعامية المصرية..."
              multiline
              numberOfLines={4}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>مفعل</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData({...formData, isActive: value})}
                trackColor={{ false: '#E5E7EB', true: formData.color }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: formData.color }]} onPress={handleSave}>
                <Text style={styles.saveButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal اختيار الخدمة */}
      <Modal visible={showServiceSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر خدمة</Text>
              <TouchableOpacity onPress={() => setShowServiceSelector(false)}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.$id}
                  style={styles.serviceItem}
                  onPress={() => selectService(service)}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: service.color + '20' }]}>
                    <Ionicons name={service.icon || 'apps-outline'} size={24} color={service.color} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceId}>ID: {service.id}</Text>
                  </View>
                </TouchableOpacity>
              ))}
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  assistantCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  assistantName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  assistantScreen: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  assistantModel: { fontSize: 10, color: '#4F46E5', marginTop: 2 },
  promptPreview: {
    fontSize: 13,
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: { fontSize: 14, color: '#4F46E5' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  addButton: {
    marginTop: 16,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 10,
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    minHeight: 120,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  screenChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  optionChipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  selectedChipText: {
    fontSize: 12,
    color: '#FFF',
  },
  screensScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  iconsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  colorsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#000',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  serviceId: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
