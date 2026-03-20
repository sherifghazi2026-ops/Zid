import { Audio } from 'expo-av';
import { Platform, Vibration } from 'react-native';

let notificationSound = null;
let sendSound = null;
let isNotificationPlaying = false;
let notificationTimeout = null;

export const loadSounds = async () => {
  try {
    await unloadSounds();
    try {
      const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/notification.wav'), { shouldPlay: false, isLooping: true });
      notificationSound = sound;
    } catch (e) { console.log('⚠️ فشل تحميل صوت الإشعار:', e.message); }
    try {
      const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/send.wav'), { shouldPlay: false });
      sendSound = sound;
    } catch (e) { console.log('⚠️ فشل تحميل صوت الإرسال:', e.message); }
    return true;
  } catch (error) { return false; }
};

export const playNotificationSound = async () => {
  try {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    if (!notificationSound) await loadSounds();
    if (notificationSound) {
      await notificationSound.setPositionAsync(0);
      await notificationSound.playAsync();
      isNotificationPlaying = true;
      notificationTimeout = setTimeout(stopNotificationSound, 20000);
    } else Vibration.vibrate([500, 200, 500, 200, 500]);
  } catch (error) { Vibration.vibrate(500); }
};

export const stopNotificationSound = async () => {
  try {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    if (notificationSound && isNotificationPlaying) {
      await notificationSound.stopAsync();
      await notificationSound.setPositionAsync(0);
      isNotificationPlaying = false;
    }
    Vibration.cancel();
  } catch (error) {}
};

export const playSendSound = async () => {
  try {
    if (!sendSound) await loadSounds();
    if (sendSound) {
      await sendSound.setPositionAsync(0);
      await sendSound.playAsync();
    } else Vibration.vibrate(100);
  } catch (error) { Vibration.vibrate(100); }
};

export const playOrderSound = playNotificationSound;

export const unloadSounds = async () => {
  try {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    if (notificationSound) { await notificationSound.stopAsync(); await notificationSound.unloadAsync(); notificationSound = null; }
    if (sendSound) { await sendSound.unloadAsync(); sendSound = null; }
    isNotificationPlaying = false;
    Vibration.cancel();
  } catch (error) {}
};

export const cleanup = async () => { await unloadSounds(); };
