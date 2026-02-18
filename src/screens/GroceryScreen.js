import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'https://zayedid-production.up.railway.app';

export default function GroceryScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderText, setOrderText] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('جنة 2');

  React.useEffect(() => {
    loadPhoneNumber();
  }, []);

  const loadPhoneNumber = async () => {
    const saved = await AsyncStorage.getItem('zayed_phone');
    if (saved) setPhoneNumber(saved);
  };

  const sendOrder = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('تنبيه', 'من فضلك أدخل رقم الموبايل');
      return;
    }
    if (!orderText.trim()) {
      Alert.alert('تنبيه', 'من فضلك اكتب طلبك');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('zayed_phone', phoneNumber);

      const itemsArray = orderText.split(/[،,]/).map(i => i.trim()).filter(i => i);

      const orderData = {
        phone: phoneNumber,
        address: address,
        items: itemsArray,
        serviceName: 'سوبر ماركت',
      };

      const response = await fetch(`${SERVER_URL}/send-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ تم',
          'تم إرسال طلبك بنجاح',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
        setOrderText('');
      } else {
        Alert.alert('⚠️', 'حدث خطأ في الإرسال');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سوبر ماركت</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="basket-outline" size={60} color="#F59E0B" style={styles.icon} />

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="رقم الموبايل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="العنوان"
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="create-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب طلبك هنا..."
            value={orderText}
            onChangeText={setOrderText}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabled]}
          onPress={sendOrder}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>
            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Text>
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
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20 },
  icon: { alignSelf: 'center', marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 14, color: '#1F2937' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  sendButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
});
