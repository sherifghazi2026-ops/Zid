import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import groqService from '../services/groqService';

const { width, height } = Dimensions.get('window');

export default function Mongez({ screen, navigation, contextData = {}, onClose, onSendMessage }) {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [slideAnim] = useState(new Animated.Value(width));
  const scrollViewRef = useRef();

  useEffect(() => {
    loadAssistant();
  }, [screen]);

  const loadAssistant = async () => {
    try {
      const { getAssistantsForScreen } = await import('../services/assistantService');
      const result = await getAssistantsForScreen(screen, contextData?.serviceId);
      if (result.success && result.data.length > 0) {
        setAssistant(result.data[0]);
        const welcomeMessage = result.data[0].welcome_message || 'أهلاً! أنا مُنجز. كيف أقدر أساعدك؟';
        setMessages([{ id: Date.now(), text: welcomeMessage, sender: 'assistant', timestamp: new Date() }]);
      } else {
        setAssistant(null);
        setMessages([{ id: Date.now(), text: 'أهلاً! أنا مُنجز. كيف أقدر أساعدك؟', sender: 'assistant', timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('خطأ في تحميل المساعد:', error);
      setMessages([{ id: Date.now(), text: 'أهلاً! أنا مُنجز. كيف أقدر أساعدك؟', sender: 'assistant', timestamp: new Date() }]);
    }
  };

  const openChat = () => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeChat = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = { id: Date.now(), text: inputText.trim(), sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        sender: msg.sender === 'user' ? 'user' : 'assistant',
        text: msg.text
      }));
      const response = await groqService.ask(inputText.trim(), { conversationHistory });
      const assistantMessage = { id: Date.now() + 1, text: response.text, sender: 'assistant', timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      setMessages(prev => [...prev, { id: Date.now(), text: 'عذراً، حدث خطأ. حاول مرة أخرى.', sender: 'assistant', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg) => (
    <View key={msg.id} style={[styles.messageRow, msg.sender === 'user' ? styles.userRow : styles.assistantRow]}>
      {msg.sender !== 'user' && (
        <View style={styles.avatarContainer}>
          <Ionicons name="chatbubble" size={24} color="#4F46E5" />
        </View>
      )}
      <View style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, msg.sender === 'user' ? styles.userText : styles.assistantText]}>
          {msg.text}
        </Text>
        <Text style={styles.timeText}>
          {msg.timestamp?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: assistant?.color || '#4F46E5' }]}
        onPress={openChat}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.chatContainer, { transform: [{ translateX: slideAnim }] }]}>
            <View style={[styles.chatHeader, { backgroundColor: assistant?.color || '#4F46E5' }]}>
              <TouchableOpacity onPress={closeChat} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{assistant?.name || 'مُنجز'}</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map(renderMessage)}
              {loading && (
                <View key="loading" style={styles.loadingRow}>
                  <View style={styles.avatarContainer}>
                    <Ionicons name="chatbubble" size={24} color="#4F46E5" />
                  </View>
                  <View style={[styles.messageBubble, styles.assistantBubble]}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                  </View>
                </View>
              )}
            </ScrollView>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="اكتب رسالتك..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() || loading}
                >
                  <Ionicons name="send" size={20} color={inputText.trim() ? '#4F46E5' : '#9CA3AF'} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    width: width,
    height: height * 0.8,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#4F46E5',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
  },
  assistantBubble: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFF',
  },
  assistantText: {
    color: '#1F2937',
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
