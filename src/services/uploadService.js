import { File } from 'expo-file-system/next';

const IMAGEKIT_PRIVATE_KEY = 'private_EWamixKcyYNZI2xJmmO0iQBN53k=';
const IMAGEKIT_PUBLIC_KEY = 'public_gRNWZVl/bFOQ7VfIDOm6J/Mwzrc=';

const sanitizeFolderName = (name) => {
  if (!name) return 'unknown';
  let clean = name.toLowerCase().replace(/[^\w\u0621-\u064A\s-]/g, '').replace(/[\s-]+/g, '_');
  return clean.replace(/^_+|_+$/g, '') || `user_${Date.now()}`;
};

const validateFile = async (uri) => {
  try {
    if (!uri) return { valid: false, error: 'uri غير موجود' };
    const file = new File(uri);
    const exists = await file.exists;
    if (!exists) return { valid: false, error: 'الملف غير موجود' };
    const info = await file.info();
    if (info.size > 10 * 1024 * 1024) return { valid: false, error: 'حجم الملف كبير جداً (10MB max)' };
    return { valid: true, info };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export const uploadToImageKit = async (uri, fileName, folderType = 'general', userName = 'common') => {
  try {
    const validation = await validateFile(uri);
    if (!validation.valid) throw new Error(validation.error);

    const cleanUserName = sanitizeFolderName(userName);
    let baseFolder = '/zayedid';
    if (folderType === 'voice') baseFolder += '/voices';
    else if (folderType === 'service') baseFolder += '/services';
    else if (folderType === 'general') baseFolder += '/pictures';
    else if (userName !== 'common' && cleanUserName !== 'unknown') {
      baseFolder += `/users/${cleanUserName}`;
      const folderMap = { profile: '/profile', cover: '/cover', dish: '/dishes', video: '/videos' };
      baseFolder += folderMap[folderType] || '/misc';
    } else baseFolder += '/misc';

    const file = new File(uri);
    const base64 = await file.base64();
    let mimeType = 'image/jpeg';
    if (folderType === 'video' || fileName.endsWith('.mp4')) mimeType = 'video/mp4';
    else if (fileName.endsWith('.png')) mimeType = 'image/png';
    else if (fileName.endsWith('.m4a') || fileName.endsWith('.mp3')) mimeType = 'audio/mp4';

    const formData = new FormData();
    formData.append('file', `data:${mimeType};base64,${base64}`);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    formData.append('fileName', fileName);
    formData.append('useUniqueFileName', 'true');
    formData.append('folder', baseFolder);
    formData.append('tags', cleanUserName);

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':') },
      body: formData,
    });
    const data = await response.json();
    if (response.ok && data.url) return { success: true, fileUrl: data.url, fileId: data.fileId };
    return { success: false, error: data.message || 'فشل الرفع' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadServiceImage = (uri) => uploadToImageKit(uri, `service_${Date.now()}.jpg`, 'service', 'services');
export const uploadRestaurantImage = (uri, name, type = 'profile') => uploadToImageKit(uri, `${type}_${Date.now()}.jpg`, type, name);
export const uploadDishImage = (uri, userName) => uploadToImageKit(uri, `dish_${Date.now()}.jpg`, 'dish', userName);
export const uploadDishVideo = (uri, userName) => uploadToImageKit(uri, `video_${Date.now()}.mp4`, 'video', userName);
export const uploadProfileImage = (uri, userName) => uploadToImageKit(uri, `profile_${Date.now()}.jpg`, 'profile', userName);
export const uploadVoiceFile = (uri) => uploadToImageKit(uri, `voice_${Date.now()}.m4a`, 'voice');

export const deleteFromImageKit = async (fileUrl) => {
  try {
    const fileId = fileUrl.split('/').pop()?.split('?')[0];
    if (!fileId) return { success: false, error: 'لا يمكن استخراج معرف الملف' };
    const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':') },
    });
    return { success: response.ok };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
