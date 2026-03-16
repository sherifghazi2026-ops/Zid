import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// جلب جميع الأصناف من أي Collection
export const getItems = async (collectionName) => {
  try {
    console.log(`🔍 جلب الأصناف من: ${collectionName}`);
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      [Query.orderAsc('name')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب الأصناف:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ✅ إضافة صنف جديد (نسخة مبسطة جداً)
export const addItem = async (collectionName, itemData) => {
  try {
    console.log(`📦 إضافة صنف إلى: ${collectionName}`);
    console.log('📦 البيانات:', JSON.stringify(itemData, null, 2));
    
    // التأكد من وجود الاسم
    if (!itemData.name) {
      return { success: false, error: 'اسم الصنف مطلوب' };
    }

    // إنشاء كائن نظيف بدون حقول إضافية
    const newItem = {
      name: itemData.name,
      isActive: itemData.isActive !== false,
    };

    // إضافة الأسعار حسب النوع
    if (itemData.ironPrice !== undefined) {
      newItem.ironPrice = parseFloat(itemData.ironPrice);
    }
    if (itemData.cleanPrice !== undefined) {
      newItem.cleanPrice = parseFloat(itemData.cleanPrice);
    }
    if (itemData.price !== undefined) {
      newItem.price = parseFloat(itemData.price);
    }
    if (itemData.imageUrl) {
      newItem.imageUrl = itemData.imageUrl;
    }
    if (itemData.serviceId) {
      newItem.serviceId = itemData.serviceId;
    }

    console.log('📦 الإرسال إلى Appwrite:', JSON.stringify(newItem, null, 2));

    const response = await databases.createDocument(
      DATABASE_ID,
      collectionName,
      ID.unique(),
      newItem
    );
    
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إضافة الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تحديث صنف
export const updateItem = async (collectionName, itemId, itemData) => {
  try {
    if (!itemId) {
      return { success: false, error: 'معرف الصنف مطلوب' };
    }

    const updateData = { ...itemData };
    
    const response = await databases.updateDocument(
      DATABASE_ID,
      collectionName,
      itemId,
      updateData
    );
    
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث الصنف:', error);
    return { success: false, error: error.message };
  }
};

// حذف صنف
export const deleteItem = async (collectionName, itemId) => {
  try {
    if (!itemId) {
      return { success: false, error: 'معرف الصنف مطلوب' };
    }

    await databases.deleteDocument(
      DATABASE_ID,
      collectionName,
      itemId
    );
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تغيير حالة الصنف
export const toggleItemStatus = async (collectionName, itemId, isActive) => {
  try {
    if (!itemId) {
      return { success: false, error: 'معرف الصنف مطلوب' };
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      collectionName,
      itemId,
      { isActive }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تغيير حالة الصنف:', error);
    return { success: false, error: error.message };
  }
};

// جلب الأصناف النشطة فقط
export const getActiveItems = async (collectionName) => {
  try {
    if (!collectionName) {
      return { success: false, error: 'collectionName مطلوب', data: [] };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      [
        Query.equal('isActive', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب الأصناف النشطة:', error);
    return { success: false, error: error.message, data: [] };
  }
};
