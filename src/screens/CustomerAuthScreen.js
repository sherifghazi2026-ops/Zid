import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { 
  GoogleAuthProvider, 
  signInWithCredential,
  PhoneAuthProvider,
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth, db } from '../firebase/init';
import { doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export default function CustomerAuthScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  // ✅ Google Sign-In مع Client IDs من google-services.json
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '560415054284-huem3p73tkdd7qebjmul1lu1nk0pm5kb.apps.googleusercontent.com',
    webClientId: '560415054284-huem3p73tkdd7qebjmul1lu1nk0pm5kb.apps.googleusercontent.com',
    expoClientId: '560415054284-huem3p73tkdd7qebjmul1lu1nk0pm5kb.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleGoogleSignIn(credential);
    }
  }, [response]);

  const handleGoogleSignIn = async (credential) => {
    setLoading(true);
    try {
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        phone: user.phoneNumber || '',
        role: 'customer',
        lastLogin: new Date().toISOString()
      }, { merge: true });
      
      await AsyncStorage.setItem('userToken', user.uid);
      await AsyncStorage.setItem('userRole', 'customer');
      
      Alert.alert('نجاح', `مرحباً بك يا ${user.displayName}`);
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Phone Authentication (SMS)
  const sendVerificationCode = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('تنبيه', 'أدخل رقم هاتف صحيح');
      return;
    }
    setLoading(true);
    try {
      const verificationId = await signInWithPhoneNumber(auth, `+2${phone}`);
      setVerificationId(verificationId);
      setIsCodeSent(true);
      Alert.alert('تم', 'تم إرسال رمز التحقق');
    } catch (error) {
      Alert.alert('خطأ', 'فشل إرسال الرمز. تأكد من تفعيل Phone Authentication في Firebase');
      console.error('Phone Auth Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('تنبيه', 'أدخل رمز التحقق');
      return;
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        phone: user.phoneNumber,
        role: 'customer',
        lastLogin: new Date().toISOString()
      }, { merge: true });

      await AsyncStorage.setItem('userToken', user.uid);
      await AsyncStorage.setItem('userRole', 'customer');
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert('خطأ', 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#4F46E5" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={40} color="#4F46E5" />
            </View>
            <Text style={styles.title}>إنشاء حساب جديد</Text>
            <Text style={styles.subtitle}>انضم إلى Zayed ID لتتمكن من الطلب بسهولة</Text>
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' }]} 
            onPress={() => promptAsync()}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#4F46E5" /> : (
              <>
                <Ionicons name="logo-google" size={24} color="#DB4437" />
                <Text style={[styles.socialButtonText, { color: '#1F2937' }]}>التسجيل بواسطة جوجل</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.line} />
          </View>

          {/* Phone Authentication */}
          {!isCodeSent ? (
            <View style={styles.phoneContainer}>
              <Text style={styles.label}>رقم الهاتف</Text>
              <View style={styles.phoneInput}>
                <Text style={styles.prefix}>+20</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10xxxxxxxx"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!loading}
                />
              </View>
              <TouchableOpacity
                style={styles.sendCodeButton}
                onPress={sendVerificationCode}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendCodeText}>إرسال الرمز</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.codeContainer}>
              <Text style={styles.label}>رمز التحقق</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={verifyCode}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyText}>تحقق</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsCodeSent(false)}>
                <Text style={styles.changeNumber}>تغيير الرقم</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 25, flexGrow: 1, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 20, zIndex: 10 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  socialButtonText: { fontSize: 16, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 10, color: '#9CA3AF', fontSize: 14 },
  phoneContainer: { marginTop: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 5 },
  phoneInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 15 },
  prefix: { fontSize: 16, color: '#1F2937', marginRight: 5 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16 },
  sendCodeButton: { backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  sendCodeText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  codeContainer: { marginTop: 10 },
  codeInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 15, fontSize: 16, textAlign: 'center' },
  verifyButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  verifyText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  changeNumber: { textAlign: 'center', color: '#4F46E5', marginTop: 10 },
});
