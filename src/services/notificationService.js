import { Vibration } from 'react-native';
import { playNotificationSound, stopNotificationSound } from '../utils/SoundHelper';

export const setupNotifications = async () => {
  console.log('📱 استخدام النظام المحلي للإشعارات');
  return 'local-only';
};

export const savePushToken = async () => true;

export const notifyAllMerchants = async (serviceType, orderData) => {
  try {
    console.log(`🔔 طلب جديد في خدمة ${serviceType}`);
    playNotificationSound();
    Vibration.vibrate([500, 200, 500, 200, 500]);
    return true;
  } catch (error) {
    return false;
  }
};

export const notifyDriver = async () => true;
export const handleIncomingNotification = () => null;
export const stopOrderSound = () => { stopNotificationSound(); Vibration.cancel(); };
export const testNotification = () => {
  playNotificationSound();
  Vibration.vibrate([500, 200, 500]);
  setTimeout(stopOrderSound, 5000);
};
