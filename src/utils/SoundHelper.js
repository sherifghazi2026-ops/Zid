import { Audio } from 'expo-av';

let sound = null;
let soundTimeout = null;
let isPlaying = false;

// روابط الصوت من ImageKit - باستخدام المسارات التي أعطيتني إياها
const SEND_SOUND_URL = 'https://ik.imagekit.io/vzuah6tku/zayedid/sounds/send/send.mp3';
const NOTIFICATION_SOUND_URL = 'https://ik.imagekit.io/vzuah6tku/zayedid/sounds/notification/notification.mp3';

// تشغيل صوت الإرسال (للعميل) - صوت قصير مرة واحدة
export const playSendSound = async () => {
  try {
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }

    console.log('🔊 تشغيل صوت الإرسال (send)');
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: SEND_SOUND_URL },
      { shouldPlay: true, isLooping: false }
    );
    sound = newSound;
    
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        sound = null;
      }
    });
  } catch (error) {
    console.log('⚠️ لا يمكن تشغيل صوت الإرسال:', error.message);
  }
};

// تشغيل صوت الإشعار (للتاجر/المندوب) - يتكرر لمدة 20 ثانية
export const playNotificationSound = async () => {
  if (isPlaying) {
    console.log('🔇 الصوت يعمل بالفعل');
    return;
  }
  
  try {
    isPlaying = true;
    
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }
    if (soundTimeout) {
      clearTimeout(soundTimeout);
      soundTimeout = null;
    }

    console.log('🔊 تشغيل صوت التنبيه (notification)');

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: NOTIFICATION_SOUND_URL },
      { shouldPlay: true, isLooping: true }
    );
    sound = newSound;
    
    soundTimeout = setTimeout(() => {
      stopNotificationSound();
      console.log('⏱️ إيقاف الصوت بعد 20 ثانية');
    }, 20000);
    
  } catch (error) {
    console.log('⚠️ لا يمكن تشغيل صوت الإشعار:', error.message);
    isPlaying = false;
  }
};

// إيقاف الصوت يدوياً
export const stopNotificationSound = async () => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
    if (soundTimeout) {
      clearTimeout(soundTimeout);
      soundTimeout = null;
    }
    isPlaying = false;
  } catch (error) {
    console.log('⚠️ خطأ في إيقاف الصوت');
  }
};

export default {
  playSendSound,
  playNotificationSound,
  stopNotificationSound,
};
