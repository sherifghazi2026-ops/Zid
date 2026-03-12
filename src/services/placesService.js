import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const PLACES_COLLECTION_ID = 'places';

// دالة تهيئة الـ Collection (شغلها مرة واحدة)
export const initializePlacesCollection = async () => {
  try {
    // محاولة جلب الأماكن - إذا نجح، الـ Collection موجود
    await databases.listDocuments(DATABASE_ID, PLACES_COLLECTION_ID, [Query.limit(1)]);
    console.log('✅ Collection "places" موجود بالفعل');
    return true;
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log('⚠️ Collection "places" غير موجود. يرجى إنشاؤه يدوياً من Appwrite Console.');
      Alert.alert(
        'تنبيه',
        'الرجاء إنشاء Collection "places" في Appwrite Console أولاً.',
        [{ text: 'حسناً' }]
      );
      return false;
    }
    return false;
  }
};

// جلب جميع الأماكن حسب النوع
export const getPlacesByType = async (type) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      [
        Query.equal('type', type),
        Query.equal('isActive', true)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأماكن:', error);
    return { success: false, error: error.message };
  }
};

// جلب الأماكن المتاحة (غير مرتبطة بتاجر)
export const getAvailablePlacesByType = async (type) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      [
        Query.equal('type', type),
        Query.equal('isActive', true),
        Query.or([
          Query.isNull('merchantId'),
          Query.equal('merchantId', '')
        ])
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأماكن المتاحة:', error);
    return { success: false, error: error.message };
  }
};

// جلب مكان معين
export const getPlaceById = async (placeId) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      placeId
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في جلب المكان:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء مكان جديد
export const createPlace = async (placeData) => {
  try {
    const newPlace = {
      name: placeData.name,
      type: placeData.type,
      address: placeData.address || '',
      phone: placeData.phone || '',
      merchantId: placeData.merchantId || '',
      isActive: true,
      isAssigned: false,
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      ID.unique(),
      newPlace
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إنشاء المكان:', error);
    return { success: false, error: error.message };
  }
};

// تحديث مكان
export const updatePlace = async (placeId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      placeId,
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث المكان:', error);
    return { success: false, error: error.message };
  }
};

// حذف مكان
export const deletePlace = async (placeId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      placeId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف المكان:', error);
    return { success: false, error: error.message };
  }
};

// تعيين تاجر لمكان
export const assignMerchantToPlace = async (placeId, merchantId, merchantName) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      placeId,
      {
        merchantId,
        merchantName,
        isAssigned: true
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تعيين التاجر للمكان:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع الأماكن (للمشرف)
export const getAllPlaces = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PLACES_COLLECTION_ID,
      [Query.orderDesc('createdAt')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب جميع الأماكن:', error);
    return { success: false, error: error.message };
  }
};
