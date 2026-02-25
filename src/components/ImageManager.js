import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../appwrite/userService';

export default function ImageManager({ onUploadSuccess }) {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      setUploading(true);
      try {
        const uploadedFile = await uploadImage(uri);
        onUploadSuccess(uploadedFile.$id);
        alert('تم رفع الصورة بنجاح');
      } catch (err) {
        alert('فشل الرفع: ' + err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      <TouchableOpacity style={styles.btn} onPress={pickAndUpload} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>اختر وارفع صورة</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', margin: 20 },
  preview: { width: 150, height: 150, borderRadius: 10, marginBottom: 10 },
  btn: { backgroundColor: '#16a085', padding: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
