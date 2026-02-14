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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import geminiService from '../services/geminiService';

export default function AIAssistantButton({ 
  visible, 
  onClose, 
  userLocation, 
  onConfirmOrder 
}) {
  const [textInput, setTextInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);

  // تسجيل الصوت
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يجب السماح للتطبيق بتسجيل الصوت');
        return;
      }

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
    const uri = recording.getURI();
    setRecording(null);

    // محاكاة تحويل الصوت لنص (في الحقيقة هنستخدم Google Speech)
    // للتبسيط، هنستخدم نص تجريبي
    simulateVoiceToText();
  };

  const simulateVoiceToText = () => {
    setTimeout(() => {
      const simulatedText = 'عايز اطلب بيتزا بالجبنة والفلفل';
      setTextInput(simulatedText);
      handleAIRequest(simulatedText);
    }, 1000);
  };

  // طلب AI
  const handleAIRequest = async (message) => {
    if (!message.trim()) return;
    
    setLoading(true);
    setAiResponse('');
    
    const result = await geminiService.askGemini(message, userLocation);
    setAiResponse(result.success ? result.text : 'عذراً، حدث خطأ. حاول مرة أخرى.');
    setLoading(false);
  };

  const handleSend = () => {
    if (!textInput.trim()) return;
    handleAIRequest(textInput);
    setTextInput('');
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>المساعد الذكي للمطاعم</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.chatArea}>
          {aiResponse ? (
            <View style={styles.aiMessage}>
              <Text style={styles.aiText}>{aiResponse}</Text>
            </View>
          ) : (
            <View style={styles.welcomeMessage}>
              <Text style={styles.welcomeText}>
                مرحباً بك في المساعد الذكي للمطاعم. أكتب أو تكلم عايز تأكل إيه؟
              </Text>
              <Text style={styles.welcomeHint}>
                مثال: عايز بيتزا مارجريتا, سندوتش كبدة من غير فلفل
              </Text>
            </View>
          )}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>جاري التفكير...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.recording]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={loading}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="اكتب طلبك هنا..."
            value={textInput}
            onChangeText={setTextInput}
            multiline
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={loading || !textInput.trim()}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {aiResponse && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => onConfirmOrder(aiResponse)}
          >
            <Text style={styles.confirmText}>تأكيد الطلب</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  chatArea: {
    flex: 1,
    marginBottom: 20,
  },
  aiMessage: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  aiText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  welcomeMessage: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
