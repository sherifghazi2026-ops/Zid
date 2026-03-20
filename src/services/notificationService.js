import { Vibration } from 'react-native';
import { playNotificationSound, stopNotificationSound } from '../utils/SoundHelper';

export const setupNotifications = async () => {
  console.log('📱 استخدام النظام المحلي للإشعارات');
  return 'local-only';
};

export const savePushToken = async () => {
  return true;
};

export const notifyAllMerchants = async (serviceType, orderData) => {
  try {
    console.log(`🔔 طلب جديد في خدمة ${serviceType}`);

    playNotificationSound();

    Vibration.vibrate([500, 200, 500, 200, 500]);

    return true;
  } catch (error) {
    console.error('❌ خطأ في تشغيل الإشعار:', error);
    return false;
  }
};

export const notifyDriver = async () => {
  return true;
};

export const handleIncomingNotification = () => {
  return null;
};

export const stopOrderSound = () => {
  stopNotificationSound();
  Vibration.cancel();
};

export const testNotification = () => {
  console.log('🔔 اختبار الإشعار...');
  playNotificationSound();
  Vibration.vibrate([500, 200, 500]);

  setTimeout(() => {
    stopOrderSound();
  }, 5000);
};
