import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

// تعريفCollections الأماكن
export const PLACE_COLLECTIONS = {
  restaurants: 'restaurants',
  supermarket: 'supermarkets',
  pharmacy: 'pharmacies',
  laundry: 'laundries',
  electrician: 'electricians',
  plumber: 'plumbers',
  carpenter: 'carpenters',
};

// جلب جميع الأماكن حسب النوع
export const getPlacesByType = async (type) => {
  const collectionId = PLACE_COLLECTIONS[type];
  if (!collectionId) {
    return { success: false, error: 'نوع غير مدعوم' };
  }

  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.equal('isActive', true), Query.orderAsc('name')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error(`خطأ في جلب ${type}:`, error);
    return { success: false, error: error.message };
  }
};

// جلب مكان معين
export const getPlaceById = async (type, placeId) => {
  const collectionId = PLACE_COLLECTIONS[type];
  if (!collectionId) {
    return { success: false, error: 'نوع غير مدعوم' };
  }

  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      collectionId,
      placeId
    );
    return { success: true, data: response };
  } catch (error) {
    console.error(`خطأ في جلب المكان:`, error);
    return { success: false, error: error.message };
  }
};

// إنشاء مكان جديد (للأدمن)
export const createPlace = async (type, placeData) => {
  const collectionId = PLACE_COLLECTIONS[type];
  if (!collectionId) {
    return { success: false, error: 'نوع غير مدعوم' };
  }

  try {
    const newPlace = {
      name: placeData.name,
      address: placeData.address || '',
      phone: placeData.phone || '',
      imageUrl: placeData.imageUrl || '',
      isActive: placeData.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      collectionId,
      ID.unique(),
      newPlace
    );

    return { success: true, data: response };
  } catch (error) {
    console.error(`خطأ في إنشاء ${type}:`, error);
    return { success: false, error: error.message };
  }
};

// تحديث مكان
export const updatePlace = async (type, placeId, updateData) => {
  const collectionId = PLACE_COLLECTIONS[type];
  if (!collectionId) {
    return { success: false, error: 'نوع غير مدعوم' };
  }

  try {
    const data = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    const response = await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      placeId,
      data
    );

    return { success: true, data: response };
  } catch (error) {
    console.error(`خطأ في تحديث ${type}:`, error);
    return { success: false, error: error.message };
  }
};

// حذف مكان
export const deletePlace = async (type, placeId) => {
  const collectionId = PLACE_COLLECTIONS[type];
  if (!collectionId) {
    return { success: false, error: 'نوع غير مدعوم' };
  }

  try {
    await databases.deleteDocument(
      DATABASE_ID,
      collectionId,
      placeId
    );
    return { success: true };
  } catch (error) {
    console.error(`خطأ في حذف ${type}:`, error);
    return { success: false, error: error.message };
  }
};
