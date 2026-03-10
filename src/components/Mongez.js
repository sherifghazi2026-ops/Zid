import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databases, DATABASE_ID, DISHES_COLLECTION_ID } from '../appwrite/config';
import { Query } from 'appwrite';
import groqService from '../services/groqService';

export function MongezButton({ onPress, title = 'مُنجز', icon = 'chatbubble', color = '#4F46E5' }) {
  return (
    <TouchableOpacity style={[styles.floatingButton, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#FFF" />
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function MongezChat({ visible, onClose, assistant, navigation, contextData = {} }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [dishesText, setDishesText] = useState('');
  const scrollRef = useRef();

  // تحميل الأطباق إذا كانت الشاشة لها علاقة بالأكل
  useEffect(() => {
    if (visible && (assistant?.screen === 'restaurant' || assistant?.screen === 'home_chef')) {
      loadDishes();
    }
  }, [visible, assistant]);

  const loadDishes = async () => {
    try {
      let queries = [
        Query.equal('isAvailable', true),
        Query.equal('status', 'approved'),
        Query.limit(50)
      ];

      if (assistant?.screen === 'restaurant' && contextData?.restaurantId) {
        queries.push(Query.equal('providerId', contextData.restaurantId));
        queries.push(Query.equal('providerType', 'restaurant'));
      } else if (assistant?.screen === 'home_chef' && contextData?.chefId) {
        queries.push(Query.equal('providerId', contextData.chefId));
        queries.push(Query.equal('providerType', 'home_chef'));
      }

      const res = await databases.listDocuments(DATABASE_ID, DISHES_COLLECTION_ID, queries);
      setDishes(res.documents);

      const dishesInfo = res.documents.map(d => 
        `- ${d.name} (${d.price} ج): ${d.description || 'لا يوجد وصف'}`
      ).join('\n');
      
      setDishesText(dishesInfo);
    } catch (error) {
      console.error('Error loading dishes:', error);
    }
  };

  // بداية المحادثة
  useEffect(() => {
    if (visible && messages.length === 0) {
      setMessages([{
        id: '1',
        text: assistant?.welcomeMessage || 'أهلاً! أنا مُنجز. كيف أقدر أساعدك؟',
        sender: 'ai'
      }]);
    }
  }, [visible, assistant]);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMsg = inputText;
    setInputText('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: userMsg,
      sender: 'user'
    }]);

    setLoading(true);

    try {
      // تجهيز السياق مع معلومات المساعد والأطباق
      const contextInfo = dishesText 
        ? `الأطباق المتاحة حالياً:\n${dishesText}`
        : '';

      const systemPrompt = assistant?.systemPrompt || 'أنت مساعد ذكي اسمك "مُنجز". رد بالعامية المصرية.';
      
      const fullPrompt = `${systemPrompt}\n\n${contextInfo}\n\nالرسالة: ${userMsg}`;

      const result = await groqService.ask(fullPrompt, {
        conversationHistory: messages.map(m => ({
          sender: m.sender,
          text: m.text
        }))
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: result.text,
        sender: 'ai'
      }]);

    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'آسف، حصل خطأ. حاول تاني؟',
        sender: 'ai'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.chatContainer}>
          
          <View style={styles.header}>
            <View style={styles.headerRight}>
              <Ionicons name={assistant?.icon || 'flash'} size={24} color={assistant?.color || '#4F46E5'} />
              <Text style={styles.headerTitle}>{assistant?.name || 'مُنجز'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
            style={styles.messagesArea}
          >
            {messages.map(m => (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  m.sender === 'user' ? styles.userRow : styles.aiRow
                ]}
              >
                {m.sender === 'ai' && (
                  <View style={[styles.aiIcon, { backgroundColor: assistant?.color || '#4F46E5' }]}>
                    <Ionicons name={assistant?.icon || 'flash'} size={14} color="#FFF" />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    m.sender === 'user' ? styles.userBubble : styles.aiBubble
                  ]}
                >
                  <Text style={m.sender === 'user' ? styles.userText : styles.aiText}>
                    {m.text}
                  </Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={styles.thinkingRow}>
                <View style={[styles.aiIcon, { backgroundColor: assistant?.color || '#4F46E5' }]}>
                  <Ionicons name={assistant?.icon || 'flash'} size={14} color="#FFF" />
                </View>
                <View style={[styles.bubble, styles.aiBubble, styles.thinkingBubble]}>
                  <ActivityIndicator size="small" color={assistant?.color || '#4F46E5'} />
                  <Text style={styles.thinkingText}>مُنجز بيفكر...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="اكتب رسالتك هنا..."
                placeholderTextColor="#999"
                editable={!loading}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || loading) && styles.sendDisabled,
                  { backgroundColor: assistant?.color || '#4F46E5' }
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim() || loading}
              >
                <Ionicons name="send" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: '80%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  messagesArea: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },
  aiText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  thinkingRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  thinkingText: {
    fontSize: 13,
    color: '#666',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
