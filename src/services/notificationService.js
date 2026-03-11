import { Vibration } from 'react-native';
import { playNotificationSound, stopNotificationSound } from '../utils/SoundHelper';

// نسخة مبسطة - تعتمد على الصوت المحلي فقط
// لا تستخدم expo-notifications نهائياً

// تهيئة الإشعارات
export const setupNotifications = async () => {
  console.log('📱 استخدام النظام المحلي للإشعارات');
  return 'local-only';
};

// حفظ التوكن (وهمي)
export const savePushToken = async () => {
  return true;
};

// إرسال إشعارات لجميع التجار
export const notifyAllMerchants = async (serviceType, orderData) => {
  try {
    console.log(`🔔 طلب جديد في خدمة ${serviceType}`);
    
    // ✅ تشغيل الصوت المحلي لمدة 20 ثانية
    playNotificationSound();
    
    // ✅ اهتزاز للتنبيه
    Vibration.vibrate([500, 200, 500, 200, 500]);
    
    return true;
  } catch (error) {
    console.error('❌ خطأ في تشغيل الإشعار:', error);
    return false;
  }
};

// إشعار للمندوب
export const notifyDriver = async () => {
  return true;
};

// معالج الإشعارات (وهمي)
export const handleIncomingNotification = () => {
  return null;
};

// إيقاف الصوت
export const stopOrderSound = () => {
  stopNotificationSound();
  Vibration.cancel();
};

// اختبار الإشعارات
export const testNotification = () => {
  console.log('🔔 اختبار الإشعار...');
  playNotificationSound();
  Vibration.vibrate([500, 200, 500]);
  
  setTimeout(() => {
    stopOrderSound();
  }, 5000);
};
