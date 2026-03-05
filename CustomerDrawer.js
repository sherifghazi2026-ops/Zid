import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const CustomerDrawer = ({ isLoggedIn, userData, onClose }) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>القائمة الجانبية</Text>
        
        {isLoggedIn ? (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>مرحباً، {userData?.name || 'عميلنا العزيز'}</Text>
            <Text style={styles.userPhone}>{userData?.phone || 'لا يوجد رقم'}</Text>
          </View>
        ) : (
          <View style={styles.guestContainer}>
            <Text style={styles.guestText}>سجل دخولك للوصول لكامل الخدمات</Text>
          </View>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>إغلاق القائمة</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'right',
  },
  userInfo: {
    padding: 15,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 25,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E91E63', // لون متناسق مع شعار Expo Red في صورتك
    textAlign: 'right',
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  guestContainer: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginBottom: 25,
  },
  guestText: {
    textAlign: 'right',
    color: '#999',
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default CustomerDrawer;
