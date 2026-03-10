import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// جلب منتجات خدمة معينة (مع فلتر اختياري)
export const getItemsByService = async (collectionName, filters = {}) => {
  try {
    if (!collectionName) {
      return { success: false, error: 'لا يوجد collection مخصص', data: [] };
    }

    const queries = [];
    
    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }
    
    if (filters.isAvailable !== undefined) {
      queries.push(Query.equal('isAvailable', filters.isAvailable));
    }
    
    queries.push(Query.limit(100));

    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      queries
    );
    
    // إضافة collectionName لكل منتج
    const productsWithCollection = response.documents.map(product => ({
      ...product,
      collectionName: collectionName
    }));
    
    return { success: true, data: productsWithCollection };
  } catch (error) {
    console.error(`❌ خطأ في جلب المنتجات:`, error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب منتجات تاجر معين
export const getItemsByProvider = async (collectionName, providerId) => {
  try {
    if (!collectionName) {
      return { success: false, error: 'لا يوجد collection مخصص', data: [] };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      [
        Query.equal('providerId', providerId),
        Query.limit(100)
      ]
    );
    
    const productsWithCollection = response.documents.map(product => ({
      ...product,
      collectionName: collectionName
    }));
    
    return { success: true, data: productsWithCollection };
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات التاجر:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب جميع المنتجات المعلقة (لأي خدمة)
export const getAllPendingItems = async (collectionsList) => {
  try {
    let allPending = [];
    
    for (const collection of collectionsList) {
      const result = await getItemsByService(collection, { status: 'pending' });
      if (result.success && result.data.length > 0) {
        allPending = [...allPending, ...result.data];
      }
    }
    
    return { success: true, data: allPending };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات المعلقة:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب المنتجات المقبولة (للعملاء)
export const getApprovedItems = async (collectionName) => {
  try {
    if (!collectionName) {
      return { success: false, error: 'لا يوجد collection مخصص', data: [] };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionName,
      [
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.limit(100)
      ]
    );
    
    const productsWithCollection = response.documents.map(product => ({
      ...product,
      collectionName: collectionName
    }));
    
    return { success: true, data: productsWithCollection };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات المقبولة:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// إنشاء منتج جديد
export const createItem = async (collectionName, itemData) => {
  try {
    if (!collectionName) {
      return { success: false, error: 'collectionName مطلوب' };
    }

    console.log('📦 إنشاء منتج في collection:', collectionName);

    let imagesArray = [];
    if (itemData.images && Array.isArray(itemData.images)) {
      imagesArray = itemData.images.map(url => {
        if (url.length > 500) {
          return url.substring(0, 500);
        }
        return url;
      });
    }

    const newItem = {
      name: itemData.name,
      price: Number(itemData.price),
      description: itemData.description || '',
      images: imagesArray,
      providerId: itemData.providerId,
      providerName: itemData.providerName,
      providerType: itemData.providerType,
      serviceId: itemData.serviceId,
      status: 'pending',
      isAvailable: itemData.isAvailable !== undefined ? itemData.isAvailable : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      collectionName,
      ID.unique(),
      newItem
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء المنتج:', error);
    return { success: false, error: error.message };
  }
};

// تحديث منتج
export const updateItem = async (collectionName, itemId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      collectionName,
      itemId,
      {
        ...updateData,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتج:', error);
    return { success: false, error: error.message };
  }
};

// حذف منتج
export const deleteItem = async (collectionName, itemId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      collectionName,
      itemId
    );
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف المنتج:', error);
    return { success: false, error: error.message };
  }
};

// مراجعة منتج (موافقة/رفض)
export const reviewItem = async (collectionId, itemId, status, reviewNotes = '') => {
  try {
    if (!collectionId) {
      console.error('❌ collectionId مطلوب');
      return { success: false, error: 'collectionId مطلوب' };
    }
    
    if (!itemId) {
      console.error('❌ itemId مطلوب');
      return { success: false, error: 'itemId مطلوب' };
    }

    console.log(`📝 مراجعة المنتج:`, { collectionId, itemId, status, reviewNotes });

    // تحديث الحقول المطلوبة فقط
    const updateData = {
      status: status,
      updatedAt: new Date().toISOString()
    };

    // إذا كانت موافقة، نخلي isAvailable = true
    if (status === 'approved') {
      updateData.isAvailable = true;
    }
    
    // إضافة reviewNotes و reviewedAt لو موجودين
    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }
    
    // دايماً نضيف reviewedAt عند الرفض أو الموافقة
    updateData.reviewedAt = new Date().toISOString();

    console.log('📦 تحديث المنتج ببيانات:', updateData);

    const response = await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      itemId,
      updateData
    );
    
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في مراجعة المنتج:', error);
    return { success: false, error: error.message };
  }
};
