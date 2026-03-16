import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOrder } from '../services/orderService';
import { Audio } from 'expo-av';
import { uploadVoiceFile } from '../services/uploadService';

export default function ProServiceScreen({ navigation, route }) {
  const { serviceType, serviceName, serviceColor, responseTime } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  // حالات التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const savedPhone = await AsyncStorage.getItem('zayed_phone');
    const savedAddress = await AsyncStorage.getItem('zayed_address');
    if (savedPhone) setPhoneNumber(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بتسجيل الصوت');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync();
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      setRecordedUri(recording.getURI());
      setRecording(null);
      Alert.alert('✅ تم', 'تم تسجيل المذكرة الصوتية');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ التسجيل');
    }
  };

  const deleteRecording = () => {
    setRecordedUri(null);
  };

  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'رقم الموبايل مطلوب');
      return;
    }
    if (!address.trim()) {
      Alert.alert('تنبيه', 'العنوان مطلوب');
      return;
    }
    if (!description.trim()) {
      Alert.alert('تنبيه', 'وصف المشكلة مطلوب');
      return;
    }

    setSending(true);

    try {
      let voiceUrl = null;
      if (recordedUri) {
        setUploadingVoice(true);
        const uploadResult = await uploadVoiceFile(recordedUri);
        setUploadingVoice(false);
        if (uploadResult.success) voiceUrl = uploadResult.fileUrl;
      }

      const orderData = {
        customerPhone: phoneNumber,
        customerAddress: address,
        serviceType: serviceType,
        serviceName: serviceName,
        description: description,
        notes: notes,
        voiceUrl: voiceUrl,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        await AsyncStorage.setItem('zayed_phone', phoneNumber);
        await AsyncStorage.setItem('zayed_address', address);

        Alert.alert(
          '✅ تم إرسال الطلب',
          `سيتم مراجعة طلبك خلال ${responseTime || '24 ساعة'}`,
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال الطلب');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: serviceColor || '#3B82F6' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceName}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            سيتم مراجعة طلبك خلال {responseTime || '24 ساعة'} من قبل المتخصصين
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 بيانات التواصل</Text>
          <TextInput
            style={styles.input}
            placeholder="رقم الموبايل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 وصف المشكلة</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب وصفاً تفصيلياً للمشكلة..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 تسجيل صوتي (اختياري)</Text>
          {!recordedUri ? (
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={sending}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={24}
                color={isRecording ? "#FFF" : "#3B82F6"}
              />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? 'جاري التسجيل... اضغط للإيقاف' : 'اضغط للتسجيل'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordedControls}>
              <TouchableOpacity style={[styles.recordAction, styles.deleteButton]} onPress={deleteRecording}>
                <Ionicons name="trash" size={20} color="#FFF" />
                <Text style={styles.recordActionText}>حذف التسجيل</Text>
              </TouchableOpacity>
            </View>
          )}
          {uploadingVoice && <Text style={styles.uploadingText}>جاري رفع الصوت...</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 ملاحظات إضافية (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="أي ملاحظات إضافية..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, (sending || uploadingVoice) && styles.disabled]}
          onPress={sendOrder}
          disabled={sending || uploadingVoice}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.sendButtonText}>إرسال الطلب</Text>
              <Ionicons name="paper-plane" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 16 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: { fontSize: 14, color: '#1E40AF', flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  recordingButton: { backgroundColor: '#EF4444' },
  voiceButtonText: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },
  recordingText: { color: '#FFF' },
  recordedControls: { alignItems: 'center' },
  recordAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    backgroundColor: '#EF4444',
  },
  recordActionText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#EF4444' },
  uploadingText: { textAlign: 'center', color: '#3B82F6', marginTop: 8 },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
