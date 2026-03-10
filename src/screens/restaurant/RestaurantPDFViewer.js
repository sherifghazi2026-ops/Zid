import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function RestaurantPDFViewer({ navigation, route }) {
  const { restaurantName, pdfUrl } = route.params;
  const [loading, setLoading] = useState(true);

  const downloadPDF = async () => {
    try {
      const fileName = `${restaurantName.replace(/\s+/g, '_')}_menu.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        pdfUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${progress * 100}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('تم التحميل', `تم حفظ الملف في: ${uri}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('خطأ', 'فشل تحميل الملف');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
        <TouchableOpacity onPress={downloadPDF} style={styles.downloadButton}>
          <Ionicons name="download-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>جاري تحميل المنيو...</Text>
        </View>
      )}

      <WebView
        source={{ uri: pdfUrl }}
        style={styles.webview}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          Alert.alert('خطأ', 'فشل تحميل المنيو');
        }}
        startInLoadingState={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, textAlign: 'center' },
  downloadButton: { padding: 4 },
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { marginTop: 8, fontSize: 14, color: '#6B7280' },
  webview: { flex: 1 },
});
