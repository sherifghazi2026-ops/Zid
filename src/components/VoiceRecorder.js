import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function VoiceRecorder({ onRecordingComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);

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
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    // مؤقتاً بنستخدم نص تجريبي
    onRecordingComplete({
      uri,
      text: 'طلب جديد',
    });
  };

  return (
    <TouchableOpacity
      style={[styles.button, isRecording && styles.recording]}
      onPress={isRecording ? stopRecording : startRecording}
    >
      <Ionicons
        name={isRecording ? 'stop-circle' : 'mic-circle'}
        size={80}
        color={isRecording ? '#EF4444' : '#4F46E5'}
      />
      <Text style={styles.text}>
        {isRecording ? 'جاري التسجيل... اضغط للإيقاف' : 'اضغط للتسجيل'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  recording: {
    opacity: 0.8,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});
