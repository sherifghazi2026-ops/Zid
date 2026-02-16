import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, ScrollView, Modal, Image, KeyboardAvoidingView,
  Platform, ToastAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RAILWAY_API_URL = "https://zayedid-production.up.railway.app/send-order";

export default function GroceryAIModal({ visible, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const p = await AsyncStorage.getItem('zayed_phone');
      const a = await AsyncStorage.getItem('zayed_address');
      if (p) setPhoneNumber(p);
      if (a) setAddress(a);
    };
    if (visible) loadData();
  }, [visible]);

  const handleOrderTextChange = (text) => {
    setOrderText(text);
    setOrderItems(text.split(/[،,و\n]+/).map(i => i.trim()).filter(i => i.length > 0));
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert('خطأ', 'اسمح بالصوت');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecordingInstance(recording);
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) { Alert.alert('خطأ', 'فشل التسجيل'); }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await recordingInstance.stopAndUnloadAsync();
      setRecordedUri(recordingInstance.getURI());
      setIsRecording(false);
    } catch (e) { console.error(e); }
  };

  const submitOrder = async () => {
    if (!phoneNumber.trim() || !address.trim() || orderItems.length === 0) {
      return Alert.alert('تنبيه', 'أكمل بيانات الطلب');
    }
    setSending(true);
    try {
      // إرسال البيانات كنص + ملف الصوت كـ FormData
      const formData = new FormData();
      formData.append('phone', phoneNumber);
      formData.append('address', address);
      formData.append('items', JSON.stringify(orderItems));
      formData.append('rawText', orderText);

      if (recordedUri) {
        formData.append('voice', {
          uri: recordedUri,
          type: 'audio/m4a',
          name: 'order_voice.m4a'
        });
      }

      const response = await fetch(RAILWAY_API_URL, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = await response.json();
      if (result.success) {
        ToastAndroid.show('✅ تم الإرسال بنجاح!', ToastAndroid.LONG);
        setOrderText(''); setOrderItems([]); setRecordedUri(null);
        setTimeout(onClose, 2000);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل الاتصال بالسيرفر');
    } finally { setSending(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={styles.overlay}>
          <View style={styles.content}>
            <View style={styles.header}>
               <Text style={styles.headerTitle}>طلب جديد (Zayed-ID)</Text>
               <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="red" /></TouchableOpacity>
            </View>
            <ScrollView style={{padding: 20}}>
              <TextInput style={styles.input} placeholder="رقم التليفون" value={phoneNumber} onChangeText={v => {setPhoneNumber(v); AsyncStorage.setItem('zayed_phone', v);}} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="العنوان بالتفصيل" value={address} onChangeText={v => {setAddress(v); AsyncStorage.setItem('zayed_address', v);}} multiline />
              <TextInput style={[styles.input, {height: 80}]} placeholder="اكتب طلبك هنا..." value={orderText} onChangeText={handleOrderTextChange} multiline />
              
              <View style={styles.voiceSection}>
                {!recordedUri ? (
                  <TouchableOpacity style={styles.voiceButton} onPress={isRecording ? stopRecording : startRecording}>
                    <Ionicons name={isRecording ? "stop-circle" : "mic-circle"} size={50} color={isRecording ? "red" : "#F59E0B"} />
                    <Text>{isRecording ? `تسجيل... ${recordingDuration}ث` : 'اضغط للتسجيل الصوتي'}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.recordedContainer}>
                    <Text style={{color: '#10B981'}}>✅ تم تسجيل الصوت</Text>
                    <TouchableOpacity onPress={() => setRecordedUri(null)}><Ionicons name="trash" size={24} color="red" /></TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.submitButton, sending && {backgroundColor: '#CCC'}]} onPress={submitOrder} disabled={sending}>
                {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>تأكيد وإرسال الطلب</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { flex: 1, backgroundColor: '#FFF', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, marginBottom: 15 },
  voiceSection: { marginBottom: 20, alignItems: 'center' },
  voiceButton: { alignItems: 'center', padding: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', width: '100%' },
  recordedContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 15, backgroundColor: '#F0FFF4', borderRadius: 10 },
  submitButton: { backgroundColor: '#F59E0B', padding: 15, borderRadius: 10, alignItems: 'center' },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
