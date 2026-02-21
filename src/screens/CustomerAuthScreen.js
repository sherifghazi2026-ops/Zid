import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { getAuth, signInWithCredential, GoogleAuthProvider, PhoneAuthProvider, signInWithPhoneNumber } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/init';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export default function CustomerAuthScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  // Google Sign-In
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '112994130336-...', // ضع clientId الخاص بك
    iosClientId: '112994130336-...',      // ضع clientId الخاص بك
    expoClientId: '112994130336-...',     // ضع clientId الخاص بك
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response.params.id_token);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // حفظ بيانات المستخدم في Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: user.displayName,
        phone: user.phoneNumber || '',
        role: 'customer',
        createdAt: new Date().toISOString(),
      }, { merge: true });

      await AsyncStorage.setItem('userToken', 'logged_in');
      await AsyncStorage.setItem('userRole', 'customer');
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert('خطأ', 'فشل تسجيل الدخول عبر Google');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // إرسال رمز التحقق عبر SMS
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
      Alert.alert('خطأ', 'فشل إرسال الرمز');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // التحقق من الرمز
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
        createdAt: new Date().toISOString(),
      }, { merge: true });

      await AsyncStorage.setItem('userToken', 'logged_in');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1F2937" />
          </TouchableOpacity>

          <Text style={styles.title}>تسجيل دخول العميل</Text>
          <Text style={styles.subtitle}>اختر طريقة الدخول</Text>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={24} color="#FFF" />
            <Text style={styles.googleButtonText}>الدخول عبر Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>أو</Text>
            <View style={styles.line} />
          </View>

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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20 },
  backButton: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 30 },
  googleButton: {
    backgroundColor: '#DB4437',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  googleButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { marginHorizontal: 10, color: '#9CA3AF' },
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
