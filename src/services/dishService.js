import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const DISHES_COLLECTION_ID = 'dishes';

// جلب أطباق تاجر معين (مطعم أو شيف)
export const getMyRestaurantDishes = async (providerId) => {
  try {
    console.log('🔍 جلب الأطباق للتاجر:', providerId);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('providerId', providerId),
        Query.orderDesc('createdAt')
      ]
    );
    
    console.log(`✅ تم جلب ${response.documents.length} طبق`);
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب الأطباق:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب الأطباق المقبولة لمطعم معين
export const getRestaurantDishes = async (restaurantId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('providerId', restaurantId),
        Query.equal('providerType', 'restaurant'),
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب أطباق المطعم:', error);
    return { success: false, error: error.message };
  }
};

// جلب الأطباق المقبولة لشيف معين
export const getChefDishes = async (chefId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('providerId', chefId),
        Query.equal('providerType', 'home_chef'),
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب أطباق الشيف:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع الأطباق المقبولة (للمتصفح الرئيسي)
export const getAllDishes = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.orderDesc('createdAt'),
        Query.limit(50)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأطباق:', error);
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
    console.error('خطأ في جلب الطلبات:', error);
    return { success: false, error: error.message };
  }
};

// إضافة طبق جديد
export const createDish = async (dishData) => {
  try {
    const newDish = {
      name: dishData.name,
      description: dishData.description || '',
      price: parseFloat(dishData.price),
      providerId: dishData.providerId,
      providerType: dishData.providerType,
      category: dishData.category || '',
      ingredients: dishData.ingredients || [],
      images: dishData.images || [],
      videoUrl: dishData.videoUrl || '',
      status: 'pending',
      isAvailable: false,
      createdAt: new Date().toISOString(),
    };

    console.log('📤 إضافة طبق جديد:', newDish.name);

    const response = await databases.createDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      ID.unique(),
      newDish
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إضافة الطبق:', error);
    return { success: false, error: error.message };
  }
};

// موافقة على طبق
export const approveDish = async (dishId) => {
  try {
    const dish = await databases.getDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId
    );

    const response = await databases.updateDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId,
      { 
        status: 'approved',
        isAvailable: true 
      }
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في الموافقة:', error);
    return { success: false, error: error.message };
  }
};

// رفض طبق
export const rejectDish = async (dishId, reason) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      dishId,
      { 
        status: 'rejected',
        rejectionReason: reason || '',
        isAvailable: false
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في الرفض:', error);
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
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الطبق:', error);
    return { success: false, error: error.message };
  }
};

// حذف طبق
export const deleteDish = async (dishId) => {
  try {
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

// البحث عن أطباق
export const searchDishes = async (keyword) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISHES_COLLECTION_ID,
      [
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.limit(50)
      ]
    );
    
    const filtered = response.documents.filter(dish => 
      dish.name.toLowerCase().includes(keyword.toLowerCase()) ||
      dish.description?.toLowerCase().includes(keyword.toLowerCase()) ||
      dish.category?.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return { success: true, data: filtered };
  } catch (error) {
    console.error('خطأ في البحث:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getMyRestaurantDishes,
  getRestaurantDishes,
  getChefDishes,
  getAllDishes,
  getPendingDishes,
  createDish,
  approveDish,
  rejectDish,
  updateDish,
  deleteDish,
  searchDishes
};
