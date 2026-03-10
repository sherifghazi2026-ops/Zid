import { databases, DATABASE_ID, storage, BUCKET_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const DISHES_COLLECTION_ID = 'dishes';

// جلب أطباق التاجر
export const getMyDishes = async (providerId, providerType) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('providerId', providerId),
        Query.equal('providerType', providerType),
        Query.orderDesc('createdAt')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأطباق:', error);
    return { success: false, error: error.message };
  }
};

// جلب أطباق المطعم (للعرض)
export const getRestaurantDishes = async (restaurantId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('providerId', restaurantId),
        Query.equal('providerType', 'restaurant'),
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب أطباق المطعم:', error);
    return { success: false, error: error.message };
  }
};

// جلب أطباق الشيف (للعرض)
export const getChefDishes = async (chefId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('providerId', chefId),
        Query.equal('providerType', 'home_chef'),
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب أطباق الشيف:', error);
    return { success: false, error: error.message };
  }
};

// جلب الأطباق قيد المراجعة (للأدمن)
export const getPendingDishes = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('status', 'pending'),
        Query.orderDesc('createdAt')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأطباق قيد المراجعة:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء طبق جديد (مع updatedAt)
export const createDish = async (dishData) => {
  try {
    const now = new Date().toISOString();
    const newDish = {
      ...dishData,
      status: 'pending',
      createdAt: now,
      updatedAt: now, // ✅ إضافة updatedAt
    };

    console.log('📦 إرسال إلى Appwrite:', newDish);
    
    const response = await databases.createDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      ID.unique(),
      newDish
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطبق:', error);
    return { success: false, error: error.message };
  }
};

// تحديث طبق
export const updateDish = async (dishId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId,
      {
        ...updateData,
        updatedAt: new Date().toISOString(), // ✅ تحديث updatedAt
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الطبق:', error);
    return { success: false, error: error.message };
  }
};

// حذف طبق
export const deleteDish = async (dishId, imageUrls = []) => {
  try {
    // حذف الصور من ImageKit إذا وجدت
    if (imageUrls && imageUrls.length > 0) {
      const { deleteFromImageKit } = await import('./uploadService');
      for (const url of imageUrls) {
        try {
          await deleteFromImageKit(url);
        } catch (e) {
          console.log('⚠️ فشل حذف صورة:', e.message);
        }
      }
    }

    await databases.deleteDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الطبق:', error);
    return { success: false, error: error.message };
  }
};

// الموافقة على طبق
export const approveDish = async (dishId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId,
      {
        status: 'approved',
        updatedAt: new Date().toISOString(), // ✅ تحديث updatedAt
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في الموافقة على الطبق:', error);
    return { success: false, error: error.message };
  }
};

// رفض طبق مع سبب
export const rejectDish = async (dishId, reason) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId,
      {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date().toISOString(), // ✅ تحديث updatedAt
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في رفض الطبق:', error);
    return { success: false, error: error.message };
  }
};

// تغيير حالة التوفر
export const toggleDishAvailability = async (dishId, isAvailable) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId,
      {
        isAvailable,
        updatedAt: new Date().toISOString(), // ✅ تحديث updatedAt
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تغيير حالة التوفر:', error);
    return { success: false, error: error.message };
  }
};
