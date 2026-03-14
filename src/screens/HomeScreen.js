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
            onPress={() => alert('خدمة قيد التطوير')}
          >
            <Ionicons name="restaurant-outline" size={40} color="#F59E0B" />
            <Text style={styles.serviceText}>مطاعم</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => alert('خدمة قيد التطوير')}
          >
            <Ionicons name="home-outline" size={40} color="#EF4444" />
            <Text style={styles.serviceText}>أكل بيتي</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>نسخة مبسطة للاختبار ✅</Text>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#4F46E5',
  },
});
