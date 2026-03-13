import * as Font from 'expo-font';
import { Platform } from 'react-native';

export const loadFonts = async () => {
  try {
    // ✅ محاولة تحميل الخطوط من المسار الصحيح
    await Font.loadAsync({
      'Cairo-Regular': require('../../assets/fonts/Cairo-Regular.ttf'),
      'Cairo-Bold': require('../../assets/fonts/Cairo-Bold.ttf'),
    });
    console.log('✅ تم تحميل خط Cairo');
    return true;
  } catch (error) {
    console.log('⚠️ فشل تحميل الخطوط، استخدام الخطوط الافتراضية:', error.message);
    return false;
  }
};

// ✅ استخدام System Font كـ Fallback
export const fontFamily = {
  regular: Platform.select({
    android: 'Cairo-Regular',
    ios: 'Cairo-Regular',
    default: 'System',
  }),
  bold: Platform.select({
    android: 'Cairo-Bold',
    ios: 'Cairo-Bold',
    default: 'System',
  }),
  arabic: Platform.select({
    android: 'Cairo-Regular',
    ios: 'Cairo-Regular',
    default: 'System',
  }),
};
