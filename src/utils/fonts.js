import * as Font from 'expo-font';

export const loadFonts = async () => {
  try {
    // تحميل الخطوط العربية
    await Font.loadAsync({
      // الخطوط العربية (حط الأسماء حسب الملفات المتوفرة)
      'Cairo': require('../../assets/fonts/Cairo-Regular.ttf'),
      'Cairo-Bold': require('../../assets/fonts/Cairo-Bold.ttf'),
      'Tajawal': require('../../assets/fonts/Tajawal-Regular.ttf'),
      'Tajawal-Bold': require('../../assets/fonts/Tajawal-Bold.ttf'),
      
      // الخطوط الافتراضية للنظام (احتياطي)
      'System': 'normal',
      
      // خطوط الأيقونات
      ...Ionicons.font,
    });
    
    console.log('✅ تم تحميل الخطوط بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في تحميل الخطوط:', error);
    return false;
  }
};

export const fontFamily = {
  regular: 'Cairo',
  bold: 'Cairo-Bold',
  arabic: 'Tajawal',
  system: 'System',
};
