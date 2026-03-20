import { Platform } from 'react-native';

export const loadFonts = async () => {
  console.log('✅ استخدام الخطوط النظامية');
  return Promise.resolve(true);
};

export const fontFamily = {
  regular: Platform.select({ android: 'System', ios: 'System', default: 'System' }),
  bold: Platform.select({ android: 'System', ios: 'System', default: 'System' }),
  arabic: Platform.select({ android: 'System', ios: 'System', default: 'System' }),
};
