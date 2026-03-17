import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

// تعريف الخطوط الافتراضية لتجنب الـ undefined في الـ Styles
export const fontFamily = {
  arabic: 'System', // ✅ خط النظام للعربية
  regular: 'System',
  bold: 'System',
  medium: 'System',
};

export const loadFonts = async () => {
  try {
    // تحميل خطوط الأيقونات لأنها ضرورية جداً في واجهة Zid
    await Font.loadAsync({
      ...Ionicons.font,
    });
    console.log('✅ تم تحميل خطوط الأيقونات بنجاح');
    return true;
  } catch (e) {
    console.warn('⚠️ فشل تحميل خطوط الأيقونات، سيتم استخدام الخطوط الافتراضية:', e);
    return true; // نرجع true لضمان عدم توقف التطبيق
  }
};
