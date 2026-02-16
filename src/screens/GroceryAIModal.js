import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import azureService from '../services/azureService';

const AZURE_SPEECH_KEY = "3epxqITp69EK6r7RnC80nn2cZRZmATeYpPPrpD8kQYEkuXdhOgH1JQQJ99CBAC1i4TkXJ3w3AAAYACOGki65";
const AZURE_SPEECH_REGION = "centralus";

// ==================== نظام المساعد الصامت ====================
const groceryContext = `أنت مساعد لتدوين طلبات السوبر ماركت فقط.

تعليمات صارمة:
1. لا تقترح أي منتجات إطلاقاً
2. لا تنصح العميل بأي شيء
3. لا توسع الطلب أو تضيف عليه
4. فقط خذ الطلب كما هو
5. ردودك تكون مختصرة جداً

مثال على الرد:
العميل: عاوز 2 كيلو رز
الرد: "تم إضافة 2 كيلو رز. محتاج حاجة تانية؟"

العميل: لا شكراً
الرد: "تم تأكيد الطلب. هتصلك الفاتورة خلال دقايق."

ممنوع تماماً: 
- "أقترح عليك"
- "أنصحك"
- "في كمان"
- "الأفضل"
- أي كلمة فيها توجيه`;

export default function GroceryAIModal({ visible, onClose, navigation }) {
  const [orderItems, setOrderItems] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && messages.length === 0) {
      addMessage('ai', 'أهلاً بك. اكتب طلبك في الخانة اللي فوق، وهضيفه تلقائياً.');
    }
  }, [visible]);

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, {
      sender,
      text,
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const addToOrder = () => {
    if (!currentInput.trim()) return;
    
    // إضافة للطلبات
    setOrderItems(prev => [...prev, {
      id: Date.now(),
      text: currentInput,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }]);
    
    // عرض في المحادثة
    addMessage('user', currentInput);
    addMessage('ai', `تم إضافة: ${currentInput}`);
    
    setCurrentInput('');
  };

  const removeFromOrder = (id) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const confirmOrder = () => {
    if (orderItems.length === 0) {
      Alert.alert('تنبيه', 'لم تضف أي طلب بعد');
      return;
    }

    setLoading(true);
    
    // تجهيز ملخص الطلب
    const orderSummary = orderItems.map(item => item.text).join('، ');
    addMessage('ai', `✅ تم استلام طلبك:\n${orderSummary}\n\nهتصلك الفاتورة خلال دقايق. شكراً لتسوقك معنا.`);
    
    setOrderItems([]);
    setLoading(false);
    
    // إغلاق بعد 3 ثواني
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            {/* الهيدر */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image
                  source={{ uri: 'https://img.icons8.com/color/96/000000/grocery-store.png' }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.headerTitle}>سوبر ماركت</Text>
                  <Text style={styles.headerSub}>أنا في خدمتك</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* منطقة الإضافة السريعة */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>➕ أضف طلب جديد:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="اكتب المنتج والكمية..."
                  placeholderTextColor="#9CA3AF"
                  value={currentInput}
                  onChangeText={setCurrentInput}
                  onSubmitEditing={addToOrder}
                />
                <TouchableOpacity 
                  style={[styles.addButton, !currentInput.trim() && styles.addButtonDisabled]}
                  onPress={addToOrder}
                  disabled={!currentInput.trim()}
                >
                  <Ionicons name="add" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* قائمة الطلبات الحالية */}
            {orderItems.length > 0 && (
              <View style={styles.orderListSection}>
                <Text style={styles.sectionTitle}>📋 طلباتك الحالية:</Text>
                <ScrollView style={styles.orderList} horizontal={false}>
                  {orderItems.map((item) => (
                    <View key={item.id} style={styles.orderItem}>
                      <Text style={styles.orderItemText}>• {item.text}</Text>
                      <TouchableOpacity onPress={() => removeFromOrder(item.id)}>
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={confirmOrder}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                      <Text style={styles.confirmButtonText}>تأكيد الطلب النهائي</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* المحادثة (للعلم فقط) */}
            <ScrollView style={styles.chatArea}>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageWrapper,
                    msg.sender === 'user' ? styles.userWrapper : styles.aiWrapper
                  ]}
                >
                  {msg.sender === 'ai' && (
                    <Image
                      source={{ uri: 'https://img.icons8.com/color/96/000000/shopping-cart.png' }}
                      style={styles.aiAvatar}
                    />
                  )}
                  <View style={[
                    styles.messageBubble,
                    msg.sender === 'user' ? styles.userBubble : styles.aiBubble
                  ]}>
                    <Text style={msg.sender === 'user' ? styles.userText : styles.aiText}>
                      {msg.text}
                    </Text>
                    <Text style={styles.timestamp}>{msg.timestamp}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 60,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  // ===== أنماط الإضافة السريعة =====
  inputSection: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  addButton: {
    width: 52,
    height: 52,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  // ===== أنماط قائمة الطلبات =====
  orderListSection: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  orderList: {
    maxHeight: 200,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderItemText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // ===== أنماط المحادثة =====
  chatArea: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#F59E0B',
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  aiBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userText: {
    color: '#FFF',
    fontSize: 14,
  },
  aiText: {
    color: '#1F2937',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
