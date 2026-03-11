import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

let notificationSound = null;
let sendSound = null;
let isNotificationPlaying = false;
let notificationTimeout = null;

export const loadSounds = async () => {
  try {
    console.log('🔊 بدء تحميل الأصوات من الملفات المحلية...');
    
    await unloadSounds();

    // تحميل صوت الإشعار من الملف المحلي
    try {
      const notificationFile = require('../../assets/sounds/notification.wav');
      const { sound: notifSound } = await Audio.Sound.createAsync(
        notificationFile,
        { 
          shouldPlay: false, 
          isLooping: true, // ✅ تشغيل متكرر لمدة 20 ثانية
        }
      );
      notificationSound = notifSound;
      console.log('✅ تم تحميل صوت الإشعار من الملف المحلي');
    } catch (e) {
      console.log('⚠️ فشل تحميل صوت الإشعار المحلي:', e.message);
    }

    // تحميل صوت الإرسال من الملف المحلي
    try {
      const sendFile = require('../../assets/sounds/send.wav');
      const { sound: sndSound } = await Audio.Sound.createAsync(
        sendFile,
        { shouldPlay: false }
      );
      sendSound = sndSound;
      console.log('✅ تم تحميل صوت الإرسال من الملف المحلي');
    } catch (e) {
      console.log('⚠️ فشل تحميل صوت الإرسال المحلي:', e.message);
    }

    return true;
  } catch (error) {
    console.log('⚠️ فشل تحميل الأصوات:', error.message);
    return false;
  }
};

// تشغيل صوت الإشعار لمدة 20 ثانية
export const playNotificationSound = async () => {
  try {
    // إلغاء أي تايمر سابق
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    if (!notificationSound) {
      await loadSounds();
    }

    if (notificationSound) {
      // إيقاف أي تشغيل سابق
      if (isNotificationPlaying) {
        await notificationSound.stopAsync();
      }
      
      // تشغيل من البداية
      await notificationSound.setPositionAsync(0);
      await notificationSound.playAsync();
      isNotificationPlaying = true;

      // إيقاف الصوت بعد 20 ثانية
      notificationTimeout = setTimeout(async () => {
        await stopNotificationSound();
        console.log('⏱️ انتهت مدة 20 ثانية - إيقاف صوت الإشعار');
      }, 20000); // 20 ثانية بالضبط

      console.log('🔊 تشغيل صوت الإشعار - سيستمر لمدة 20 ثانية');
    } else {
      console.log('🔇 لا يوجد صوت إشعار، استخدام الاهتزاز');
      Vibration.vibrate([500, 200, 500, 200, 500]); // اهتزاز متكرر
    }
  } catch (error) {
    console.log('🔇 فشل تشغيل صوت الإشعار:', error);
    Vibration.vibrate(500);
  }
};

// إيقاف صوت الإشعار (عند قبول الطلب)
export const stopNotificationSound = async () => {
  try {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    if (notificationSound && isNotificationPlaying) {
      await notificationSound.stopAsync();
      await notificationSound.setPositionAsync(0);
      isNotificationPlaying = false;
      console.log('🔇 إيقاف صوت الإشعار - تم قبول الطلب');
    }
    
    // إيقاف الاهتزاز إذا كان يعمل
    Vibration.cancel();
  } catch (error) {
    console.log('⚠️ خطأ في إيقاف الصوت:', error);
  }
};

// تشغيل صوت الإرسال (للعميل)
export const playSendSound = async () => {
  try {
    if (!sendSound) {
      await loadSounds();
    }

    if (sendSound) {
      await sendSound.setPositionAsync(0);
      await sendSound.playAsync();
      console.log('🔊 تشغيل صوت الإرسال');
    } else {
      Vibration.vibrate(100);
    }
  } catch (error) {
    console.log('🔇 فشل تشغيل صوت الإرسال:', error);
    Vibration.vibrate(100);
  }
};

// تصدير الدوال المطلوبة
export const playOrderSound = playNotificationSound;

export const unloadSounds = async () => {
  try {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    if (notificationSound) {
      await notificationSound.stopAsync();
      await notificationSound.unloadAsync();
      notificationSound = null;
    }
    if (sendSound) {
      await sendSound.unloadAsync();
      sendSound = null;
    }
    isNotificationPlaying = false;
    Vibration.cancel();
    console.log('🔇 تفريغ موارد الصوت');
  } catch (error) {
    console.log('⚠️ خطأ في تفريغ الصوت:', error);
  }
};
