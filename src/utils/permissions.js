import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

// استيراد Audio بشكل مختلف
import * as Audio from 'expo-av';

export const requestAudioPermission = async (showAlert = true) => {
  try {
    console.log('🎤 طلب إذن التسجيل الصوتي...');
    
    // في expo-av، قد يكون API مختلفاً
    // تحقق من وجود الدالة المناسبة
    if (Audio.requestPermissionsAsync) {
      const { status } = await Audio.requestPermissionsAsync();
      console.log('📱 حالة الإذن (requestPermissionsAsync):', status);
      return status === 'granted';
    }
    
    // بعض إصدارات expo-av تستخدم Permissions
    if (Audio.Permissions && Audio.Permissions.requestAsync) {
      const { status } = await Audio.Permissions.requestAsync();
      console.log('📱 حالة الإذن (Permissions.requestAsync):', status);
      return status === 'granted';
    }
    
    // محاولة مع getPermissionsAsync
    if (Audio.getPermissionsAsync) {
      const { status } = await Audio.getPermissionsAsync();
      console.log('📱 حالة الإذن (getPermissionsAsync):', status);
      return status === 'granted';
    }
    
    console.log('⚠️ لم يتم العثور على API للأذونات في expo-av');
    if (showAlert) {
      Alert.alert(
        'تنبيه',
        'التسجيل الصوتي غير متاح في هذه البيئة. للاختبار، استخدم APK حقيقي.',
        [{ text: 'حسناً' }]
      );
    }
    return false;
    
  } catch (error) {
    console.error('❌ خطأ في طلب إذن التسجيل:', error);
    return false;
  }
};

export const checkAudioPermission = async () => {
  try {
    if (Audio.getPermissionsAsync) {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    }
    return false;
  } catch (error) {
    console.error('❌ خطأ في التحقق من إذن التسجيل:', error);
    return false;
  }
};

export const requestCameraPermission = async (showAlert = true) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted' && showAlert) {
      Alert.alert('تنبيه', 'التطبيق يحتاج إلى إذن الكاميرا.');
    }
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

export const requestLocationPermission = async (showAlert = true) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted' && showAlert) {
      Alert.alert('تنبيه', 'التطبيق يحتاج إلى إذن الموقع.');
    }
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

export const getCurrentLocation = async () => {
  try {
    const hasPermission = await requestLocationPermission(false);
    if (!hasPermission) return null;
    
    const location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  } catch (error) {
    return null;
  }
};
