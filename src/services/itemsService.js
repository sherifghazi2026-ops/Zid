import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const SERVICE_ITEMS_COLLECTION_ID = 'serviceItems';

// جلب الأصناف النشطة لخدمة معينة (للعرض)
export const getServiceItems = async (serviceId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      [
        Query.equal('serviceId', serviceId),
        Query.equal('isActive', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأصناف:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع الأصناف لخدمة معينة (للإدارة)
export const getAllServiceItems = async (serviceId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      [
        Query.equal('serviceId', serviceId),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأصناف:', error);
    return { success: false, error: error.message };
  }
};

// إضافة صنف جديد
export const createServiceItem = async (itemData) => {
  try {
    const newItem = {
      serviceId: itemData.serviceId,
      name: itemData.name,
      price: parseFloat(itemData.price),
      description: itemData.description || '',
      imageUrl: itemData.imageUrl || null,
      isActive: itemData.isActive !== false,
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      ID.unique(),
      newItem
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إضافة الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تحديث صنف
export const updateServiceItem = async (itemId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      itemId,
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الصنف:', error);
    return { success: false, error: error.message };
  }
};

// حذف صنف
export const deleteServiceItem = async (itemId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      itemId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تغيير حالة الصنف (تفعيل/تعطيل)
export const toggleItemStatus = async (itemId, isActive) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      itemId,
      { isActive }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تغيير حالة الصنف:', error);
    return { success: false, error: error.message };
  }
};
