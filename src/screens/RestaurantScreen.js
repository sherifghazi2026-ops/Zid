import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AIAssistantModal from '../components/AIAssistantModal';
import { getCurrentLocation } from '../utils/permissions';

export default function RestaurantScreen({ navigation }) {
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // جلب الموقع عند فتح الشاشة
    (async () => {
      const location = await getCurrentLocation();
      setUserLocation(location);
    })();
  }, []);

  const handleConfirmOrder = (orderDetails) => {
    // هنا ممكن تربط مع خدمة الطلبات (Firebase)
    console.log("Order Confirmed:", orderDetails);
    setIsModalVisible(false);
    navigation.goBack(); // العودة بعد الطلب
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلب مطاعم (AI)</Text>
      </View>

      <View style={styles.content}>
        <Ionicons name="chatbubbles-outline" size={80} color="#4F46E5" />
        <Text style={styles.infoText}>المساعد الذكي جاهز لمساعدتك في اختيار وجبتك</Text>
        <TouchableOpacity 
          style={styles.openBtn} 
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.openBtnText}>ابدأ الدردشة الصوتية</Text>
        </TouchableOpacity>
      </View>

      <AIAssistantModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          navigation.goBack(); // لو قفل المودال يرجع للشاشة الرئيسية
        }}
        userLocation={userLocation}
        onConfirmOrder={handleConfirmOrder}
      />
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
    backgroundColor: '#FFF' 
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoText: { 
    textAlign: 'center', 
    fontSize: 16, 
    color: '#6B7280', 
    marginTop: 20, 
    marginBottom: 30 
  },
  openBtn: { 
    backgroundColor: '#4F46E5', 
    paddingHorizontal: 30, 
    paddingVertical: 15, 
    borderRadius: 25 
  },
  openBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
