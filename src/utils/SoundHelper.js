import { Audio } from 'expo-av';

let sound = null;
let soundTimeout = null;

export const playNotificationSound = async () => {
  try {
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }
    
    if (soundTimeout) {
      clearTimeout(soundTimeout);
      soundTimeout = null;
    }
    
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.mp3'),
        { 
          shouldPlay: true, 
          isLooping: true,
          volume: 1.0,
        }
      );
      sound = newSound;
      console.log('🔊 تشغيل صوت التنبيه');
      
      soundTimeout = setTimeout(() => {
        stopNotificationSound();
        console.log('⏱️ إيقاف الصوت بعد 20 ثانية');
      }, 20000);
      
    } catch (error) {
      console.log('⚠️ ملف الصوت غير موجود');
    }
  } catch (error) {
    console.error('خطأ في تشغيل الصوت:', error);
  }
};

export const stopNotificationSound = async () => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
      console.log('🔇 إيقاف صوت التنبيه');
    }
    if (soundTimeout) {
      clearTimeout(soundTimeout);
      soundTimeout = null;
    }
  } catch (error) {
    console.error('خطأ في إيقاف الصوت:', error);
  }
};

export default {
  playNotificationSound,
  stopNotificationSound,
};
