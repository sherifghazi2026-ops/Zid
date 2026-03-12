import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createReview } from '../../services/reviewService';
import { fontFamily } from '../../utils/fonts';

export default function RateOrderScreen({ route, navigation }) {
  const { orderId, providerId, customerId, providerName } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('تنبيه', 'الرجاء اختيار تقييم'); return; }
    setSubmitting(true);
    const result = await createReview({ orderId, customerId, providerId, rating, comment });
    if (result.success) {
      Alert.alert('شكراً لك', 'تم إرسال تقييمك بنجاح', [{ text: 'حسناً', onPress: () => navigation.popToTop() }]);
    } else {
      Alert.alert('خطأ', result.error || 'فشل في إرسال التقييم');
    }
    setSubmitting(false);
  };

  const renderStars = () => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)} disabled={submitting}>
          <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={40} color={i <= rating ? '#F59E0B' : '#D1D5DB'} />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-forward" size={28} color="#1F2937" /></TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: fontFamily.arabic }]}>تقييم الخدمة</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.providerCard}><Text style={[styles.providerName, { fontFamily: fontFamily.arabic }]}>{providerName}</Text></View>
        <Text style={[styles.label, { fontFamily: fontFamily.arabic }]}>تقييمك</Text>
        <View style={styles.starsContainer}>{renderStars()}</View>
        <Text style={[styles.label, { fontFamily: fontFamily.arabic }]}>تعليق (اختياري)</Text>
        <TextInput
          style={[styles.input, { fontFamily: fontFamily.arabic }]}
          placeholder="اكتب رأيك في الخدمة..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          editable={!submitting}
          textAlignVertical="top"
        />
        <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.submitButtonText, { fontFamily: fontFamily.arabic }]}>إرسال التقييم</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20 },
  providerCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  providerName: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  label: { fontSize: 16, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 20 },
  submitButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
