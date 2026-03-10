import * as Font from 'expo-font';

export const loadFonts = async () => {
  try {
    await Font.loadAsync({
      'Cairo-Regular': require('../../assets/fonts/Cairo-Regular.ttf'),
      'Cairo-Bold': require('../../assets/fonts/Cairo-Regular.ttf'),
    });
    console.log('✅ تم تحميل الخطوط العربية');
    return true;
  } catch (error) {
    console.log('⚠️ فشل تحميل الخطوط:', error);
    return false;
  }
};

export const fontFamily = {
  regular: 'Cairo-Regular',
  bold: 'Cairo-Bold',
  arabic: 'Cairo-Regular',
};
