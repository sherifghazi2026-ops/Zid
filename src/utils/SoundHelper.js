import { Audio } from 'expo-av';
import { Platform, Vibration } from 'react-native';

let notificationSound = null;
let sendSound = null;
let isNotificationPlaying = false;
let notificationTimeout = null;
let isMounted = true;

export const loadSounds = async () => {
  try {
    console.log('🔊 بدء تحميل الأصوات...');
    
    await unloadSounds();

    // تحميل صوت الإشعار
    try {
      const notificationFile = require('../../assets/sounds/notification.wav');
      const { sound: notifSound } = await Audio.Sound.createAsync(
        notificationFile,
        { 
          shouldPlay: false, 
          isLooping: true,
        }
      );
      notificationSound = notifSound;
      console.log('✅ تم تحميل صوت الإشعار');
    } catch (e) {
      console.log('⚠️ فشل تحميل صوت الإشعار:', e.message);
    }

    // تحميل صوت الإرسال
    try {
      const sendFile = require('../../assets/sounds/send.wav');
      const { sound: sndSound } = await Audio.Sound.createAsync(
        sendFile,
        { shouldPlay: false }
      );
      sendSound = sndSound;
      console.log('✅ تم تحميل صوت الإرسال');
    } catch (e) {
      console.log('⚠️ فشل تحميل صوت الإرسال:', e.message);
    }

    return true;
  } catch (error) {
    console.log('⚠️ فشل تحميل الأصوات:', error.message);
    return false;
  }
};

export const playNotificationSound = async () => {
  try {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    if (!notificationSound) {
      await loadSounds();
    }

    if (notificationSound) {
      // ✅ التأكد من أن الصوت في الموضع 0 قبل التشغيل
      await notificationSound.setPositionAsync(0);
      await notificationSound.playAsync();
      isNotificationPlaying = true;

      notificationTimeout = setTimeout(async () => {
        await stopNotificationSound();
      }, 20000);

      console.log('🔊 تشغيل صوت الإشعار');
    } else {
      Vibration.vibrate([500, 200, 500, 200, 500]);
    }
  } catch (error) {
    console.log('🔇 فشل تشغيل صوت الإشعار:', error);
    Vibration.vibrate(500);
  }
};

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
      console.log('🔇 إيقاف صوت الإشعار');
    }
    Vibration.cancel();
  } catch (error) {
    console.log('⚠️ خطأ في إيقاف الصوت:', error);
  }
};

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

export const playOrderSound = playNotificationSound;

export const unloadSounds = async () => {
  try {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    // ✅ تفريغ صوت الإشعار بأمان
    if (notificationSound) {
      try {
        await notificationSound.stopAsync();
        await notificationSound.unloadAsync();
      } catch (e) {
        console.log('⚠️ خطأ في تفريغ صوت الإشعار:', e.message);
      }
      notificationSound = null;
    }
    
    // ✅ تفريغ صوت الإرسال بأمان
    if (sendSound) {
      try {
        await sendSound.unloadAsync();
      } catch (e) {
        console.log('⚠️ خطأ في تفريغ صوت الإرسال:', e.message);
      }
      sendSound = null;
    }
    
    isNotificationPlaying = false;
    Vibration.cancel();
    console.log('🔇 تفريغ موارد الصوت');
  } catch (error) {
    console.log('⚠️ خطأ في تفريغ الصوت:', error);
  }
};

// ✅ دالة تنظيف شاملة (تستدعى عند إغلاق التطبيق)
export const cleanup = async () => {
  console.log('🧹 تنظيف شامل للموارد الصوتية...');
  await unloadSounds();
};
