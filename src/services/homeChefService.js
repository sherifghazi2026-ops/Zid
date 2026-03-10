import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const HOME_CHEFS_COLLECTION_ID = 'home_chefs';

// جلب جميع الشيفات النشطين
export const getActiveHomeChefs = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الشيفات:', error);
    return { success: false, error: error.message };
  }
};

// جلب شيف معين
export const getHomeChefById = async (chefId) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      chefId
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في جلب الشيف:', error);
    return { success: false, error: error.message };
  }
};

// جلب شيف حسب userId
export const getHomeChefByUserId = async (userId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );
    
    if (response.documents.length > 0) {
      return { success: true, data: response.documents[0] };
    }
    return { success: false, error: 'لا يوجد شيف مرتبط' };
  } catch (error) {
    console.error('خطأ في جلب الشيف:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء شيف جديد
export const createHomeChef = async (chefData) => {
  try {
    const newChef = {
      name: chefData.name,
      userId: chefData.userId,
      bio: chefData.bio || '',
      imageUrl: chefData.imageUrl || null,
      coverImage: chefData.coverImage || null,
      healthCertUrl: chefData.healthCertUrl || null,
      isVerified: false,
      specialties: chefData.specialties || [],
      deliveryRadius: chefData.deliveryRadius || 10,
      deliveryFee: chefData.deliveryFee || 0,
      minOrder: chefData.minOrder || 0,
      isActive: true,
      dishesCount: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      ID.unique(),
      newChef
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إنشاء الشيف:', error);
    return { success: false, error: error.message };
  }
};

// تحديث بيانات الشيف
export const updateHomeChef = async (chefId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      chefId,
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الشيف:', error);
    return { success: false, error: error.message };
  }
};

// تغيير حالة التفعيل
export const toggleHomeChefStatus = async (chefId, isActive) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      chefId,
      { isActive }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// توثيق الشيف (للأدمن)
export const verifyHomeChef = async (chefId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      chefId,
      { isVerified: true }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// حذف شيف
export const deleteHomeChef = async (chefId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      chefId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الشيف:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع الشيفات (للأدمن)
export const getAllHomeChefs = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      HOME_CHEFS_COLLECTION_ID,
      [Query.orderDesc('createdAt')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الشيفات:', error);
    return { success: false, error: error.message };
  }
};
