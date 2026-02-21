import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

const appIcon = require('../../assets/icons/Zidicon.png');

const images = {
  supermarket: require('../../assets/icons/supermarket-8k.png'),
  restaurant: require('../../assets/icons/restaurant-8k.png'),
  pharmacy: require('../../assets/icons/pharmacy-8k.png'),
  ironing: require('../../assets/icons/ironing-8k.png'),
  plumbing: require('../../assets/icons/plumbing-8k.png'),
  kitchen: require('../../assets/icons/Kitchen.png'),
  carpentry: require('../../assets/icons/carpentry-8k.png'),
  marble: require('../../assets/icons/marble-8k.png'),
  winch: require('../../assets/icons/winch-8k.png'),
  electrician: require('../../assets/icons/electrician-8k.png'),
  moving: require('../../assets/icons/moving-8k.png'),
};

const SERVICES = [
  { id: 'supermarket', name: 'سوبر ماركت', image: images.supermarket, screen: 'Grocery' },
  { id: 'restaurant', name: 'مطاعم', image: images.restaurant, screen: 'Restaurant' },
  { id: 'pharmacy', name: 'صيدليات', image: images.pharmacy, screen: 'Pharmacy' },
  { id: 'ironing', name: 'مكوجي', image: images.ironing, screen: 'Ironing' },
  { id: 'plumbing', name: 'سباكة', image: images.plumbing, screen: 'Plumbing' },
  { id: 'kitchen', name: 'مطابخ', image: images.kitchen, screen: 'Kitchen' },
  { id: 'carpentry', name: 'نجارة', image: images.carpentry, screen: 'Carpentry' },
  { id: 'marble', name: 'رخام', image: images.marble, screen: 'Marble' },
  { id: 'winch', name: 'ونش', image: images.winch, screen: 'Winch' },
  { id: 'electrician', name: 'كهربائي', image: images.electrician, screen: 'Electrician' },
  { id: 'moving', name: 'نقل اثاث', image: images.moving, screen: 'Moving' },
];

export default function CustomerScreen({ navigation }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    const role = await AsyncStorage.getItem('userRole');
    setUserRole(role);
    // لو في مستخدم مسجل، نوقف عرض شاشة الترحيب
    if (role) {
      setShowWelcome(false);
    }
  };

  const handleVisitorEntry = () => {
    setShowWelcome(false);
  };

  const handleRoleSelect = (role) => {
    switch(role) {
      case 'customer':
        navigation.navigate('CustomerAuth');
        break;
      case 'merchant':
        navigation.navigate('MerchantLogin');
        break;
      case 'driver':
        navigation.navigate('DriverLogin');
        break;
      default:
        Alert.alert('خطأ', 'الرجاء اختيار نوع صحيح');
    }
  };

  // شاشة الترحيب
  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.welcomeContainer}>
          <Image source={appIcon} style={styles.welcomeLogo} />
          <Text style={styles.welcomeTitle}>مرحباً بك في ZAYED ID</Text>
          <Text style={styles.welcomeSubtitle}>اختر نوع الدخول</Text>

          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, styles.customerRole]}
              onPress={() => handleRoleSelect('customer')}
            >
              <Ionicons name="person-outline" size={32} color="#FFF" />
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>عميل</Text>
                <Text style={styles.roleDescription}>لطلب الخدمات والمنتجات</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.merchantRole]}
              onPress={() => handleRoleSelect('merchant')}
            >
              <Ionicons name="business-outline" size={32} color="#FFF" />
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>تاجر</Text>
                <Text style={styles.roleDescription}>لإدارة متجرك وطلباتك</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.driverRole]}
              onPress={() => handleRoleSelect('driver')}
            >
              <Ionicons name="bicycle-outline" size={32} color="#FFF" />
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>مندوب</Text>
                <Text style={styles.roleDescription}>لتوصيل الطلبات</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.visitorButton}
              onPress={handleVisitorEntry}
            >
              <Text style={styles.visitorButtonText}>الدخول كزائر</Text>
              <Ionicons name="arrow-forward" size={20} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <Text style={styles.welcomeFooter}>
            بالدخول كزائر، يمكنك تصفح الخدمات ولكن لن تتمكن من الطلب
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // شاشة الخدمات الرئيسية (بعد الدخول)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={appIcon} style={styles.headerIcon} />
          <View>
            <Text style={styles.title}>ZAYED ID</Text>
            <Text style={styles.subtitle}>
              {userRole === 'visitor' ? 'زائر' : 'مرحباً'}
            </Text>
          </View>
        </View>
        {userRole && userRole !== 'visitor' && (
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={32} color="#4F46E5" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[styles.card, { width: CARD_SIZE }]}
            onPress={() => {
              if (!userRole) {
                Alert.alert(
                  'تسجيل الدخول',
                  'تحتاج إلى تسجيل الدخول أولاً للطلب',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'دخول', onPress: () => setShowWelcome(true) }
                  ]
                );
              } else {
                navigation.navigate(service.screen, { serviceType: service.id });
              }
            }}
            activeOpacity={0.8}
          >
            <Image source={service.image} style={styles.cardImage} />
            <View style={styles.overlay}>
              <Text style={styles.cardTitle}>{service.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  // Welcome Screen Styles
  welcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 30,
  },
  roleButtons: {
    width: '100%',
    marginBottom: 20,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  customerRole: { backgroundColor: '#F59E0B' },
  merchantRole: { backgroundColor: '#10B981' },
  driverRole: { backgroundColor: '#3B82F6' },
  roleTextContainer: { marginLeft: 15, flex: 1 },
  roleTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  roleDescription: { color: '#FFF', fontSize: 12, opacity: 0.9 },
  visitorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4F46E5',
    marginTop: 10,
  },
  visitorButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  welcomeFooter: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 20,
  },
  // Main Screen Styles
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  profileButton: { padding: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16 },
  card: { height: 180, marginBottom: 16, borderRadius: 25, overflow: 'hidden', elevation: 5 },
  cardImage: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
});
