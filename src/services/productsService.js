import { databases, DATABASE_ID, storage, BUCKET_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const PRODUCTS_COLLECTION_ID = 'products';

// أقسام المنتجات
export const PRODUCT_CATEGORIES = {
  GIFTS: 'gifts',           // هدايا
  HOME: 'home',             // منتجات منزلية
  ELECTRONICS: 'electronics', // أجهزة كهربائية
  OTHER: 'other',           // أخرى
};

// جلب جميع المنتجات
export const getAllProducts = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [Query.orderDesc('createdAt')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب المنتجات:', error);
    return { success: false, error: error.message };
  }
};

// جلب المنتجات حسب القسم
export const getProductsByCategory = async (category) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [
        Query.equal('category', category),
        Query.equal('isAvailable', true),
        Query.orderDesc('createdAt')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب المنتجات حسب القسم:', error);
    return { success: false, error: error.message };
  }
};

// جلب المنتجات المتاحة فقط
export const getAvailableProducts = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [
        Query.equal('isAvailable', true),
        Query.orderDesc('createdAt')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب المنتجات المتاحة:', error);
    return { success: false, error: error.message };
  }
};

// رفع صورة المنتج
export const uploadProductImage = async (imageUri) => {
  try {
    console.log('📤 بدء رفع صورة المنتج:', imageUri);
    
    const fileName = imageUri.split('/').pop() || `product-${Date.now()}.jpg`;
    const fileType = fileName.split('.').pop();
    
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const file = new File([blob], fileName, { type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}` });

    const uploaded = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      file
    );

    const fileUrl = storage.getFileView(BUCKET_ID, uploaded.$id);
    
    console.log('✅ تم رفع الصورة:', fileUrl);
    return { success: true, fileId: uploaded.$id, url: fileUrl };
  } catch (error) {
    console.error('❌ فشل رفع الصورة:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء منتج جديد
export const createProduct = async (productData) => {
  try {
    const newProduct = {
      name: productData.name,
      description: productData.description,
      price: parseFloat(productData.price),
      imageUrl: productData.imageUrl || null,
      category: productData.category || 'other',
      stock: productData.stock ? parseInt(productData.stock) : 0,
      isAvailable: productData.isAvailable !== false,
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      ID.unique(),
      newProduct
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إنشاء المنتج:', error);
    return { success: false, error: error.message };
  }
};

// تحديث منتج
export const updateProduct = async (productId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      productId,
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث المنتج:', error);
    return { success: false, error: error.message };
  }
};

// حذف منتج
export const deleteProduct = async (productId, imageUrl) => {
  try {
    if (imageUrl) {
      try {
        const fileId = imageUrl.split('/files/')[1]?.split('/')[0];
        if (fileId) {
          await storage.deleteFile(BUCKET_ID, fileId);
        }
      } catch (e) {
        console.log('⚠️ لا يمكن حذف الصورة:', e.message);
      }
    }

    await databases.deleteDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      productId
    );

    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف المنتج:', error);
    return { success: false, error: error.message };
  }
};

// تغيير حالة التوفر
export const toggleProductAvailability = async (productId, isAvailable) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      productId,
      { isAvailable }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
