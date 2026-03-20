import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import * as Audio from 'expo-av';

export const requestAudioPermission = async (showAlert = true) => {
  try {
    if (Audio.requestPermissionsAsync) {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    }
    if (Audio.Permissions?.requestAsync) {
      const { status } = await Audio.Permissions.requestAsync();
      return status === 'granted';
    }
    if (showAlert) Alert.alert('تنبيه', 'التسجيل الصوتي غير متاح');
    return false;
  } catch (error) { return false; }
};

export const checkAudioPermission = async () => {
  try {
    if (Audio.getPermissionsAsync) {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    }
    return false;
  } catch (error) { return false; }
};

export const requestCameraPermission = async (showAlert = true) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted' && showAlert) Alert.alert('تنبيه', 'التطبيق يحتاج إلى إذن الكاميرا');
    return status === 'granted';
  } catch (error) { return false; }
};

export const requestLocationPermission = async (showAlert = true) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted' && showAlert) Alert.alert('تنبيه', 'التطبيق يحتاج إلى إذن الموقع');
    return status === 'granted';
  } catch (error) { return false; }
};

export const getCurrentLocation = async () => {
  try {
    const hasPermission = await requestLocationPermission(false);
    if (!hasPermission) return null;
    const location = await Location.getCurrentPositionAsync({});
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  } catch (error) { return null; }
};
