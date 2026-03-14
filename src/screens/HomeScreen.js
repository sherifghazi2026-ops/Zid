import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>مرحباً بك في Zid</Text>
        </View>
        
        <View style={styles.servicesGrid}>
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => alert('مطاعم')}
          >
            <Ionicons name="restaurant-outline" size={40} color="#F59E0B" />
            <Text style={styles.serviceText}>مطاعم</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => alert('أكل بيتي')}
          >
            <Ionicons name="home-outline" size={40} color="#EF4444" />
            <Text style={styles.serviceText}>أكل بيتي</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => alert('مكوجي')}
          >
            <Ionicons name="shirt-outline" size={40} color="#3B82F6" />
            <Text style={styles.serviceText}>مكوجي</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => alert('صيدلية')}
          >
            <Ionicons name="medical-outline" size={40} color="#10B981" />
            <Text style={styles.serviceText}>صيدلية</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>✓ تم إلغاء الخطوط المخصصة</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  serviceText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#4F46E5',
  },
});
