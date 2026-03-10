import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const LAUNDRY_ITEMS_COLLECTION_ID = 'laundry_items';

// جلب جميع الأصناف
export const getAllLaundryItems = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      LAUNDRY_ITEMS_COLLECTION_ID,
      [Query.orderAsc('name')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب أصناف المكوجي:', error);
    return { success: false, error: error.message };
  }
};

// جلب الأصناف النشطة فقط
export const getActiveLaundryItems = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      LAUNDRY_ITEMS_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الأصناف النشطة:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء صنف جديد
export const createLaundryItem = async (itemData) => {
  try {
    const newItem = {
      id: itemData.id,
      name: itemData.name,
      imageUrl: itemData.imageUrl || null,
      ironPrice: parseFloat(itemData.ironPrice) || 0,
      cleanPrice: parseFloat(itemData.cleanPrice) || 0,
      // تم إزالة ironCount و cleanCount مؤقتاً
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      LAUNDRY_ITEMS_COLLECTION_ID,
      ID.unique(),
      newItem
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إنشاء الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تحديث صنف
export const updateLaundryItem = async (documentId, updateData) => {
  try {
    // إزالة الحقول غير الموجودة في قاعدة البيانات
    const cleanData = {
      name: updateData.name,
      imageUrl: updateData.imageUrl,
      ironPrice: parseFloat(updateData.ironPrice) || 0,
      cleanPrice: parseFloat(updateData.cleanPrice) || 0,
      updatedAt: new Date().toISOString()
    };
    
    // إذا كان isActive موجود، نضيفه
    if (updateData.isActive !== undefined) {
      cleanData.isActive = updateData.isActive;
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      LAUNDRY_ITEMS_COLLECTION_ID,
      documentId,
      cleanData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الصنف:', error);
    return { success: false, error: error.message };
  }
};

// حذف صنف
export const deleteLaundryItem = async (documentId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      LAUNDRY_ITEMS_COLLECTION_ID,
      documentId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تغيير حالة التفعيل
export const toggleLaundryItemStatus = async (documentId, isActive) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      LAUNDRY_ITEMS_COLLECTION_ID,
      documentId,
      { isActive, updatedAt: new Date().toISOString() }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// دالة للحصول على سعر الصنف
export const getItemPrice = (itemId, type, items) => {
  const item = items.find(i => i.id === itemId);
  if (!item) return 0;
  return type === 'iron' ? item.ironPrice : item.cleanPrice;
};
