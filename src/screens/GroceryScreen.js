import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroceryAIModal from '../components/GroceryAIModal';

export default function GroceryScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سوبر ماركت</Text>
      </View>

      <View style={styles.content}>
        <Ionicons name="basket-outline" size={80} color="#F59E0B" />
        <Text style={styles.infoText}>
          تحدث مع المساعد الذكي لتعبئة سلة التسوق
        </Text>
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.openBtnText}>ابدأ المحادثة</Text>
        </TouchableOpacity>
      </View>

      <GroceryAIModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 30,
  },
  openBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  openBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
