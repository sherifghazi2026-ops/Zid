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
  TextInput,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getServiceByDocId, updateService } from '../../services/servicesService';

export default function EditServiceScreen({ navigation, route }) {
  const { serviceDocId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState(null);

  // حقول الخدمة
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('text_only');
  const [responseMessage, setResponseMessage] = useState('');
  const [hasVoice, setHasVoice] = useState(true);
  const [hasImages, setHasImages] = useState(false);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [order, setOrder] = useState('999');
  const [isActive, setIsActive] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const colors = [
    '#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
  ];

  useEffect(() => {
    loadService();
  }, []);

  const loadService = async () => {
    const result = await getServiceByDocId(serviceDocId);
    if (result.success && result.data) {
      setService(result.data);
      setName(result.data.name || '');
      setDescription(result.data.description || '');
      setType(result.data.type || 'text_only');
      setResponseMessage(result.data.responseMessage || 'سيتم التواصل معك خلال 24 ساعة');
      setHasVoice(result.data.hasVoice !== false);
      setHasImages(result.data.hasImages || false);
      setRequiresPrescription(result.data.requiresPrescription || false);
      setImageUrl(result.data.imageUrl || '');
      setColor(result.data.color || '#6B7280');
      setOrder(String(result.data.order || '999'));
      setIsActive(result.data.isActive !== false);
      setIsVisible(result.data.isVisible !== false);
    }
    setLoading(false);
  };

  const handleUpdateService = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        type,
        hasVoice,
        hasImages,
        requiresPrescription: type === 'pharmacy' ? true : requiresPrescription,
        responseMessage: responseMessage.trim(),
        color,
        order: parseInt(order) || 999,
        imageUrl: imageUrl.trim() || null,
        isActive,
        isVisible,
      };

      const result = await updateService(serviceDocId, updateData);

      if (result.success) {
        Alert.alert(
          'تم', 
          'تم تحديث الخدمة بنجاح',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث الخدمة:', error);
      Alert.alert('خطأ', 'فشل في تحديث الخدمة');
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>تعديل الخدمة</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          {/* الاسم */}
          <Text style={styles.label}>الاسم <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="اسم الخدمة" placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          {/* المعرف - للعرض فقط */}
          {service && (
            <>
              <Text style={styles.label}>المعرف (id)</Text>
              <Text style={styles.readonlyText}>{service.id}</Text>
            </>
          )}

          {/* الوصف */}
          <Text style={styles.label}>الوصف</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="وصف الخدمة" placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* رسالة الرد */}
          <Text style={styles.label}>رسالة بعد الإرسال</Text>
          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="سيتم التواصل معك خلال 24 ساعة" placeholderTextColor="#9CA3AF"
            value={responseMessage}
            onChangeText={setResponseMessage}
          />

          {/* رابط الصورة */}
          <Text style={styles.label}>رابط الصورة (GitHub)</Text>
          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="https://..." placeholderTextColor="#9CA3AF"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
          />
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewImage} />
          ) : null}

          {/* نوع الخدمة */}
          <Text style={styles.label}>نوع الخدمة</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'text_only' && styles.typeButtonActive]}
              onPress={() => setType('text_only')}
            >
              <Ionicons name="document-text-outline" size={20} color={type === 'text_only' ? '#FFF' : '#4B5563'} />
              <Text style={[styles.typeText, type === 'text_only' && styles.typeTextActive]}>نص فقط</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'with_images' && styles.typeButtonActive]}
              onPress={() => setType('with_images')}
            >
              <Ionicons name="images-outline" size={20} color={type === 'with_images' ? '#FFF' : '#4B5563'} />
              <Text style={[styles.typeText, type === 'with_images' && styles.typeTextActive]}>مع صور</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'pharmacy' && styles.typeButtonActive]}
              onPress={() => setType('pharmacy')}
            >
              <Ionicons name="medical-outline" size={20} color={type === 'pharmacy' ? '#FFF' : '#4B5563'} />
              <Text style={[styles.typeText, type === 'pharmacy' && styles.typeTextActive]}>صيدلية</Text>
            </TouchableOpacity>
          </View>

          {/* خيارات إضافية */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>تسجيل صوتي</Text>
            <Switch
              value={hasVoice}
              onValueChange={setHasVoice}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          {type !== 'pharmacy' && (
            <View style={styles.switchContainer}>
              <Text style={styles.label}>إمكانية إرفاق صور</Text>
              <Switch
                value={hasImages}
                onValueChange={setHasImages}
                trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
              />
            </View>
          )}

          {type === 'pharmacy' && (
            <View style={styles.switchContainer}>
              <Text style={styles.label}>يتطلب روشتة</Text>
              <Switch
                value={requiresPrescription}
                onValueChange={setRequiresPrescription}
                trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
              />
            </View>
          )}

          {/* حالة الخدمة */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>الخدمة نشطة</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>ظاهرة للعملاء</Text>
            <Switch
              value={isVisible}
              onValueChange={setIsVisible}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
            />
          </View>

          {/* اختيار اللون */}
          <Text style={styles.label}>اللون</Text>
          <View style={styles.colorsContainer}>
            {colors.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorButton,
                  { backgroundColor: c },
                  color === c && styles.colorButtonActive
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* الترتيب */}
          <Text style={styles.label}>الترتيب</Text>
          <TextInput
            style={[styles.input, { color: "#1F2937" }]}
            placeholder="999" placeholderTextColor="#9CA3AF"
            value={order}
            onChangeText={setOrder}
            keyboardType="numeric"
          />

          {/* زر الحفظ */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={handleUpdateService}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  form: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
  required: { color: '#EF4444' },
  readonlyText: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  previewImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 16, resizeMode: 'cover' },
  typeContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  typeButtonActive: { backgroundColor: '#4F46E5' },
  typeText: { fontSize: 12, color: '#4B5563' },
  typeTextActive: { color: '#FFF' },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  colorsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  colorButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  colorButtonActive: { borderColor: '#1F2937', borderWidth: 3 },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
