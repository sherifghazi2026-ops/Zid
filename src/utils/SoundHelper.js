// ⚠️ ملاحظة: هذا الملف يستخدم expo-av حالياً
// عند الترقية لـ SDK 55، يجب التحويل لـ expo-av
// https://docs.expo.dev/versions/latest/sdk/audio/

import { Audio } from 'expo-av';

let notificationSound = null;
let sendSound = null;
let isNotificationPlaying = false;

// تحميل الأصوات عند بدء التطبيق
export const loadSounds = async () => {
  try {
    // تحميل صوت الإشعار
    const { sound: notifSound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/notification.mp3'),
      { shouldPlay: false, isLooping: true }
    );
    notificationSound = notifSound;

    // تحميل صوت الإرسال
    const { sound: sndSound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/send.mp3'),
      { shouldPlay: false }
    );
    sendSound = sndSound;

    console.log('✅ تم تحميل الأصوات');
    return true;
  } catch (error) {
    console.log('⚠️ فشل تحميل الأصوات:', error.message);
    return false;
  }
};

// تشغيل صوت الإشعار (للتاجر عند وصول طلب جديد)
export const playNotificationSound = async () => {
  try {
    if (!notificationSound) {
      await loadSounds();
    }
    
    if (notificationSound && !isNotificationPlaying) {
      isNotificationPlaying = true;
      
      await notificationSound.playAsync();
      
      // إيقاف الصوت بعد 20 ثانية تلقائياً
      setTimeout(() => {
        stopNotificationSound();
      }, 20000);
      
      console.log('🔊 تشغيل صوت الإشعار - سيستمر 20 ثانية');
    }
  } catch (error) {
    console.log('🔇 فشل تشغيل صوت الإشعار:', error);
  }
};

// إيقاف صوت الإشعار (عند قبول الطلب)
export const stopNotificationSound = async () => {
  try {
    if (notificationSound && isNotificationPlaying) {
      await notificationSound.stopAsync();
      await notificationSound.setPositionAsync(0);
      isNotificationPlaying = false;
      console.log('🔇 إيقاف صوت الإشعار');
    }
  } catch (error) {
    console.log('⚠️ خطأ في إيقاف الصوت:', error);
  }
};

// تشغيل صوت الإرسال (للعميل عند إرسال الطلب)
export const playSendSound = async () => {
  try {
    if (!sendSound) {
      await loadSounds();
    }
    
    if (sendSound) {
      await sendSound.replayAsync();
      console.log('🔊 تشغيل صوت الإرسال');
    }
  } catch (error) {
    console.log('🔇 فشل تشغيل صوت الإرسال:', error);
  }
};

// تشغيل صوت الطلب الجديد
export const playOrderSound = async () => {
  await playNotificationSound();
};

// تحرير الموارد
export const unloadSounds = async () => {
  try {
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
    console.log('🔇 تفريغ موارد الصوت');
  } catch (error) {
    console.log('⚠️ خطأ في تفريغ الصوت:', error);
  }
};
