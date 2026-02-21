import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/icons/Zidicon.png')}
              style={styles.logo}
            />
            <Text style={styles.welcomeText}>مرحباً بك في</Text>
            <Text style={styles.appName}>ZAYED ID</Text>
            <Text style={styles.subText}>كل الخدمات في مكان واحد</Text>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
              <Text style={styles.featureText}>توصيل سريع خلال 30 دقيقة</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
              <Text style={styles.featureText}>خدمة عملاء 24/7</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
              <Text style={styles.featureText}>أكثر من 1000 منتج وخدمة</Text>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.customerButton]}
              onPress={() => navigation.navigate('CustomerAuth')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={24} color="#FFF" />
              <Text style={styles.buttonText}>دخول كعميل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.merchantButton]}
              onPress={() => navigation.navigate('MerchantLogin')}
              activeOpacity={0.8}
            >
              <Ionicons name="business-outline" size={24} color="#FFF" />
              <Text style={styles.buttonText}>دخول كتاجر / مندوب</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            باستخدامك للتطبيق، أنت توافق على{' '}
            <Text style={styles.linkText}>شروط الخدمة</Text> و{' '}
            <Text style={styles.linkText}>سياسة الخصوصية</Text>
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-around' },
  header: { alignItems: 'center', marginTop: 50 },
  logo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  welcomeText: { fontSize: 18, color: '#FFF', marginTop: 10, opacity: 0.9 },
  appName: { fontSize: 36, fontWeight: 'bold', color: '#FFF', marginTop: 5 },
  subText: { fontSize: 14, color: '#FFF', marginTop: 5, opacity: 0.8 },
  featuresContainer: { alignSelf: 'flex-start', marginTop: 30 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  featureText: { fontSize: 16, color: '#FFF', marginLeft: 10, fontWeight: '500' },
  buttonsContainer: { marginTop: 30 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  customerButton: { backgroundColor: '#F59E0B' },
  merchantButton: { backgroundColor: '#10B981' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  footerText: { textAlign: 'center', color: '#FFF', fontSize: 12, marginTop: 20, opacity: 0.7 },
  linkText: { textDecorationLine: 'underline', fontWeight: 'bold' },
});
