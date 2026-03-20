import { File } from 'expo-file-system/next';
import { Platform } from 'react-native';

const IMAGEKIT_PRIVATE_KEY = 'private_EWamixKcyYNZI2xJmmO0iQBN53k=';
const IMAGEKIT_PUBLIC_KEY = 'public_gRNWZVl/bFOQ7VfIDOm6J/Mwzrc=';
const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/vzuah6tku/';

const sanitizeFolderName = (name) => {
  if (!name) return 'unknown';
  let clean = name.toLowerCase();
  clean = clean.replace(/[َُِّْ]/g, '');
  clean = clean.replace(/[^\w\u0621-\u064A\s-]/g, '');
  clean = clean.replace(/[\s-]+/g, '_');
  clean = clean.replace(/^_+|_+$/g, '');
  if (!clean || clean.length === 0) {
    clean = `user_${Date.now()}`;
  }
  return clean;
};

const validateFile = async (uri) => {
  try {
    if (!uri) {
      return { valid: false, error: 'uri غير موجود' };
    }

    const file = new File(uri);
    const exists = await file.exists;
    if (!exists) {
      return { valid: false, error: 'الملف غير موجود على الجهاز' };
    }

    const fileInfo = await file.info();

    if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'حجم الملف كبير جداً (أقصى حد 10MB)' };
    }

    return { valid: true, fileInfo };
  } catch (error) {
    console.error('❌ خطأ في التحقق من الملف:', error);
    return { valid: false, error: error.message };
  }
};

export const uploadToImageKit = async (uri, fileName, folderType = 'general', userName = 'common') => {
  try {
    if (!uri) {
      throw new Error('uri غير موجود');
    }

    console.log(`📤 بدء رفع إلى ImageKit:`, { fileName, folderType, userName });

    const validation = await validateFile(uri);
    if (!validation.valid) {
      throw new Error(`الملف غير صالح: ${validation.error}`);
    }

    console.log('✅ الملف صالح، الحجم:', validation.fileInfo.size);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('لا يوجد اتصال بالإنترنت');
      console.log('✅ اتصال الإنترنت نشط');
    } catch (netError) {
      console.warn('⚠️ تحذير: لا يمكن التحقق من الاتصال:', netError.message);
    }

    const cleanUserName = sanitizeFolderName(userName);
    let baseFolder = '/zayedid';

    if (folderType === 'voice') {
      baseFolder += '/voices';
    } else if (folderType === 'service') {
      baseFolder += '/services';
    } else if (folderType === 'general') {
      baseFolder += '/pictures';
    } else if (userName !== 'common' && cleanUserName !== 'unknown') {
      baseFolder += `/users/${cleanUserName}`;
      switch (folderType) {
        case 'profile':
          baseFolder += '/profile';
          break;
        case 'cover':
          baseFolder += '/cover';
          break;
        case 'dish':
          baseFolder += '/dishes';
          break;
        case 'video':
          baseFolder += '/videos';
          break;
        default:
          baseFolder += '/misc';
      }
    } else {
      baseFolder += '/misc';
    }

    console.log('📁 الرفع إلى مجلد:', baseFolder);

    let base64;
    try {
      const file = new File(uri);
      base64 = await file.base64();
      console.log(`✅ تم قراءة الملف بنجاح، حجم base64: ${base64.length} حرف`);
    } catch (readError) {
      console.error('❌ خطأ في قراءة الملف:', readError);
      throw new Error(`فشل في قراءة الملف: ${readError.message}`);
    }

    let mimeType = 'image/jpeg';
    if (folderType === 'video' || fileName.endsWith('.mp4')) {
      mimeType = 'video/mp4';
    } else if (fileName.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (fileName.endsWith('.m4a') || fileName.endsWith('.aac') || fileName.endsWith('.mp3')) {
      mimeType = 'audio/mp4';
    }

    const formData = new FormData();
    formData.append('file', `data:${mimeType};base64,${base64}`);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    formData.append('fileName', fileName);
    formData.append('useUniqueFileName', 'true');
    formData.append('folder', baseFolder);
    formData.append('tags', cleanUserName);
    formData.append('overwriteFile', 'false');

    console.log('📤 إرسال الطلب إلى ImageKit...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':'),
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok && data.url) {
      console.log('✅ ImageKit أعاد الرابط:', data.url);
      return {
        success: true,
        fileUrl: data.url,
        fileId: data.fileId,
        filePath: data.filePath,
      };
    } else {
      console.error('❌ فشل الرفع:', data);
      return {
        success: false,
        error: data.message || 'فشل الرفع إلى ImageKit',
        details: data
      };
    }
  } catch (error) {
    console.error('❌ خطأ في رفع الملف:', error);

    let errorMessage = 'فشل في رفع الملف';
    if (error.name === 'AbortError') {
      errorMessage = 'انتهت مهلة الرفع. تأكد من اتصالك بالإنترنت وحاول مجدداً.';
    } else if (error.message.includes('Network request failed')) {
      errorMessage = 'فشل الاتصال بخادم ImageKit. تحقق من اتصالك بالإنترنت.';
    } else if (error.message.includes('قراءة الملف')) {
      errorMessage = 'فشل في قراءة الملف. حاول مرة أخرى.';
    } else {
      errorMessage = error.message || 'خطأ غير متوقع في رفع الملف';
    }

    return { success: false, error: errorMessage };
  }
};

export const uploadServiceImage = async (imageUri) => {
  const fileName = `service_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'service', 'services');
};

export const uploadRestaurantImage = async (imageUri, restaurantName, type = 'profile') => {
  const fileName = `${type}_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, type, restaurantName);
};

export const uploadRestaurantPDF = async (pdfUri, restaurantName) => {
  const fileName = `menu_${Date.now()}.pdf`;
  return uploadToImageKit(pdfUri, fileName, 'general', restaurantName);
};

export const uploadDishImage = (imageUri, userName) => {
  const fileName = `dish_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'dish', userName);
};

export const uploadDishVideo = (videoUri, userName) => {
  const fileName = `video_${Date.now()}.mp4`;
  return uploadToImageKit(videoUri, fileName, 'video', userName);
};

export const uploadProfileImage = (imageUri, userName) => {
  const fileName = `profile_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'profile', userName);
};

export const uploadVoiceFile = (audioUri) => {
  const fileName = `voice_${Date.now()}.m4a`;
  return uploadToImageKit(audioUri, fileName, 'voice');
};

export const deleteFromImageKit = async (fileUrl) => {
  try {
    const fileId = fileUrl.split('/').pop()?.split('?')[0];
    if (!fileId) return { success: false, error: 'لا يمكن استخراج معرف الملف' };

    const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':'),
      },
    });

    if (response.ok) {
      return { success: true };
    } else {
      const data = await response.json();
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
