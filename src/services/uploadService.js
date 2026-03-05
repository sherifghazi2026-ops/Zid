import { File } from 'expo-file-system';

const IMAGEKIT_PRIVATE_KEY = 'private_EWamixKcyYNZI2xJmmO0iQBN53k=';
const IMAGEKIT_PUBLIC_KEY = 'public_gRNWZVl/bFOQ7VfIDOm6J/Mwzrc=';

const sanitizeFolderName = (restaurantName) => {
  if (!restaurantName) return 'unknown';
  let clean = restaurantName.toLowerCase();
  clean = clean.replace(/[َُِّْ]/g, '');
  clean = clean.replace(/[^\w\u0621-\u064A\s-]/g, '');
  clean = clean.replace(/[\s-]+/g, '_');
  clean = clean.replace(/^_+|_+$/g, '');
  if (!clean || clean.length === 0) {
    clean = `restaurant_${Date.now()}`;
  }
  return clean;
};

export const uploadToImageKit = async (uri, fileName, folderType = 'general', restaurantName = 'common') => {
  try {
    if (!uri) throw new Error('uri غير موجود');
    
    console.log(`📤 بدء رفع إلى ImageKit:`, { fileName, folderType, restaurantName });

    const cleanRestaurantName = sanitizeFolderName(restaurantName);
    let baseFolder = '/zayedid';
    
    if (folderType === 'voice') {
      baseFolder += '/voices';
    } else if (folderType === 'service') {
      baseFolder += '/services';
    } else if (folderType === 'general') {
      baseFolder += '/pictures';
    } else if (restaurantName !== 'common' && cleanRestaurantName !== 'unknown') {
      baseFolder += `/restaurants/${cleanRestaurantName}`;
      
      switch (folderType) {
        case 'profile':
          baseFolder += '/profile';
          break;
        case 'cover':
          baseFolder += '/cover';
          break;
        case 'menu':
          baseFolder += '/menu';
          break;
        case 'pdf':
          baseFolder += '/pdfs';
          break;
        default:
          baseFolder += '/misc';
      }
    } else {
      baseFolder += '/misc';
    }

    console.log('📁 الرفع إلى مجلد:', baseFolder);

    // ✅ استخدام File class الجديد
    const file = new File(uri);
    
    if (!(await file.exists)) {
      throw new Error('الملف غير موجود');
    }

    const base64 = await file.base64();

    let mimeType = 'image/jpeg';
    if (folderType === 'pdf' || fileName.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (fileName.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (fileName.endsWith('.mp4') || fileName.endsWith('.m4a')) {
      mimeType = 'audio/mp4';
    }

    const formData = new FormData();
    formData.append('file', `data:${mimeType};base64,${base64}`);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    formData.append('fileName', fileName);
    formData.append('useUniqueFileName', 'true');
    formData.append('folder', baseFolder);
    formData.append('tags', cleanRestaurantName);
    formData.append('overwriteFile', 'false');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':'),
      },
      body: formData,
    });

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
      return { success: false, error: data.message || 'فشل الرفع' };
    }
  } catch (error) {
    console.error('❌ خطأ في رفع الملف:', error);
    return { success: false, error: error.message };
  }
};

export const uploadMenuItemImage = (imageUri, restaurantName) => {
  const fileName = `menu_item_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'menu', restaurantName);
};

export const uploadRestaurantProfileImage = (imageUri, restaurantName) => {
  const fileName = `profile_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'profile', restaurantName);
};

export const uploadRestaurantCoverImage = (imageUri, restaurantName) => {
  const fileName = `cover_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'cover', restaurantName);
};

export const uploadRestaurantImage = (imageUri, restaurantName, imageType = 'profile') => {
  const fileName = `${imageType}_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, imageType, restaurantName);
};

export const uploadRestaurantPDF = async (pdfUri, restaurantName) => {
  const fileName = `menu_${Date.now()}.pdf`;
  return uploadToImageKit(pdfUri, fileName, 'pdf', restaurantName);
};

export const uploadPDF = async (pdfUri, restaurantName) => {
  const fileName = `document_${Date.now()}.pdf`;
  return uploadToImageKit(pdfUri, fileName, 'pdf', restaurantName);
};

export const uploadVoiceFile = (audioUri) => {
  const fileName = `voice_${Date.now()}.m4a`;
  return uploadToImageKit(audioUri, fileName, 'voice');
};

export const uploadProductImage = (imageUri) => {
  const fileName = `product_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'general');
};

export const uploadServiceImage = (imageUri) => {
  const fileName = `service_${Date.now()}.jpg`;
  return uploadToImageKit(imageUri, fileName, 'service');
};

export const deleteFromImageKit = async (fileId) => {
  try {
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

export const fileExists = async (uri) => {
  try {
    const file = new File(uri);
    return await file.exists;
  } catch {
    return false;
  }
};

export const getFileInfo = async (uri) => {
  try {
    const file = new File(uri);
    if (!(await file.exists)) {
      return null;
    }
    return {
      size: file.size,
      type: file.type,
      name: file.name,
      extension: file.extension,
    };
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الملف:', error);
    return null;
  }
};
