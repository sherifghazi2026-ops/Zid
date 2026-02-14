import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function CameraCapture({ onImageCaptured, title = 'تصوير' }) {
  const [image, setImage] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'يجب السماح للتطبيق بالوصول للكاميرا');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      onImageCaptured(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={takePhoto}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <>
          <Ionicons name="camera" size={50} color="#4F46E5" />
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
});
