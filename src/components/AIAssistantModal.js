import React, { useState } from 'react';
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

const SPEECH_API_KEY = "AIzaSyDDKQwxlGD8EIuDm5H12mnoGdanwt2DZDA";

export default function AIAssistantModal({ visible, onClose, userLocation, onConfirmOrder }) {
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcribedText, setTranscribedText] = useState(''); // النص اللي اتسجل
  const [showTranscribed, setShowTranscribed] = useState(false); // عرض النص قبل الإرسال

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { 
      sender, 
      text, 
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleAIRequest = async (message) => {
    if (!message.trim()) return;
    setLoading(true);
    
    const result = await azureService.askAI(message, userLocation);
    
    if (result.success) {
      addMessage('ai', result.text);
    } else {
      addMessage('ai', result.text);
    }
    setLoading(false);
  };

  const convertSpeechToText = async (audioUri) => {
    try {
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${SPEECH_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'M4A',
              sampleRateHertz: 44100,
              languageCode: 'ar-EG',
              model: 'latest_long',
            },
            audio: { content: base64Audio },
          }),
        }
      );

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].alternatives[0].transcript;
      }
      return null;
    } catch (error) {
      console.error('Speech-to-Text error:', error);
      return null;
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بتسجيل الصوت');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) { 
      Alert.alert('خطأ', 'فشل بدء التسجيل'); 
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    setLoading(true);
    
    await recording.stopAndUnloadAsync();
    const audioUri = recording.getURI();
    setRecording(null);

    try {
      const text = await convertSpeechToText(audioUri);
      
      if (text) {
        setTranscribedText(text);
        setShowTranscribed(true);
      } else {
        Alert.alert('عذراً', 'لم أستطع فهم ما قلته، حاول مرة أخرى');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحويل الصوت');
    }
    setLoading(false);
  };

  const confirmTranscribedText = () => {
    if (transcribedText.trim()) {
      addMessage('user', transcribedText);
      handleAIRequest(transcribedText);
      setShowTranscribed(false);
      setTranscribedText('');
    }
  };

  const cancelTranscribedText = () => {
    setShowTranscribed(false);
    setTranscribedText('');
  };

  const handleSend = () => {
    if (!textInput.trim()) return;
    addMessage('user', textInput);
    handleAIRequest(textInput);
    setTextInput('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image 
                  source={{ uri: 'https://img.icons8.com/color/96/000000/chef.png' }} 
                  style={styles.chefIcon}
                />
                <View>
                  <Text style={styles.headerTitle}>الشيف زايد</Text>
                  <Text style={styles.headerSub}>أنا تحت أمرك يا باشا</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView 
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && !showTranscribed ? (
                <View style={styles.welcomeContainer}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/color/96/000000/restaurant.png' }} 
                    style={styles.welcomeIcon}
                  />
                  <Text style={styles.welcomeTitle}>أهلاً بك في مطبخي!</Text>
                  <Text style={styles.welcomeText}>
                    أنا الشيف زايد، هساعدك تطلب أحلى الأكلات من مطاعم الشيخ زايد.
                    {`\n\n`}قولي عايز إيه بالظبط، وأنا أجهزلك الطلب.
                  </Text>
                  <View style={styles.suggestionsContainer}>
                    <TouchableOpacity style={styles.suggestionChip} onPress={() => setTextInput('عايز بيتزا مارجريتا')}>
                      <Text style={styles.suggestionText}>🍕 بيتزا مارجريتا</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.suggestionChip} onPress={() => setTextInput('سندوتش كبدة بالطحينة')}>
                      <Text style={styles.suggestionText}>🥪 سندوتش كبدة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.suggestionChip} onPress={() => setTextInput('كفتة مشوية مع أرز')}>
                      <Text style={styles.suggestionText}>🥩 كفتة مشوية</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <View 
                      key={msg.id} 
                      style={[
                        styles.messageWrapper,
                        msg.sender === 'user' ? styles.userWrapper : styles.aiWrapper
                      ]}
                    >
                      {msg.sender === 'ai' && (
                        <Image 
                          source={{ uri: 'https://img.icons8.com/color/96/000000/chef-hat.png' }} 
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
                </>
              )}

              {/* نافذة تأكيد النص المسجل */}
              {showTranscribed && (
                <View style={styles.confirmContainer}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/color/96/000000/voice.png' }} 
                    style={styles.confirmIcon}
                  />
                  <Text style={styles.confirmTitle}>ده اللي سجلته:</Text>
                  <View style={styles.confirmTextContainer}>
                    <Text style={styles.confirmText}>{transcribedText}</Text>
                  </View>
                  <View style={styles.confirmButtons}>
                    <TouchableOpacity 
                      style={[styles.confirmBtn, styles.cancelBtn]} 
                      onPress={cancelTranscribedText}
                    >
                      <Ionicons name="close" size={20} color="#EF4444" />
                      <Text style={styles.cancelBtnText}>تسجيل تاني</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.confirmBtn, styles.okBtn]} 
                      onPress={confirmTranscribedText}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.okBtnText}>تم، أرسل</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {loading && !showTranscribed && (
                <View style={styles.typingIndicator}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/color/48/000000/chef-hat.png' }} 
                    style={styles.typingAvatar}
                  />
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                    <Text style={styles.typingText}>الشيف بيفكر...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Area - مش بتظهر لو في نافذة تأكيد */}
            {!showTranscribed && (
              <View style={styles.inputContainer}>
                <TouchableOpacity 
                  style={[styles.micButton, isRecording && styles.recordingButton]} 
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                >
                  <Ionicons 
                    name={isRecording ? "stop" : "mic"} 
                    size={28} 
                    color={isRecording ? "#FFF" : "#4F46E5"} 
                  />
                </TouchableOpacity>
                
                <View style={styles.textInputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="اكتب طلبك هنا..."
                    placeholderTextColor="#9CA3AF"
                    value={textInput}
                    onChangeText={setTextInput}
                    multiline
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    style={[styles.sendButton, (!textInput.trim() || loading) && styles.sendDisabled]}
                    onPress={handleSend}
                    disabled={!textInput.trim() || loading}
                  >
                    <Ionicons name="send" size={24} color={!textInput.trim() || loading ? "#9CA3AF" : "#4F46E5"} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chefIcon: {
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
  chatArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  chatContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  welcomeIcon: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '500',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
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
    backgroundColor: '#4F46E5',
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
    lineHeight: 20,
  },
  aiText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 8,
  },
  sendButton: {
    padding: 8,
  },
  sendDisabled: {
    opacity: 0.5,
  },
  confirmContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confirmIcon: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmTextContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  confirmText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
  },
  okBtn: {
    backgroundColor: '#4F46E5',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  okBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
