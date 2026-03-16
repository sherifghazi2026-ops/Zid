import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { Alert } from 'react-native';

const PRODUCTS_COLLECTION = 'products';

// ✅ دالة التحقق من وجود Collection products
export const ensureProductsCollection = async () => {
  try {
    await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.limit(1)]);
    console.log('✅ Collection products موجودة');
    return true;
  } catch (error) {
    if (error.code === 404) {
      console.log('⚠️ Collection products غير موجودة. يجب إنشاؤها يدوياً من Appwrite Console.');
      Alert.alert(
        '⚠️ تنبيه',
        'الرجاء إنشاء Collection "products" في Appwrite Console بالحقول التالية:\n\n' +
        '▪️ name (string, required)\n' +
        '▪️ price (double, required)\n' +
        '▪️ description (string)\n' +
        '▪️ imageUrl (string)\n' +
        '▪️ isAvailable (boolean)\n' +
        '▪️ status (string, required)\n' +
        '▪️ merchantId (string, required)\n' +
        '▪️ merchantName (string)\n' +
        '▪️ serviceId (string, required)\n' +
        '▪️ merchantType (string)\n' +
        '▪️ createdAt (string)\n\n' +
        'بعد الإنشاء، أعد تشغيل التطبيق.'
      );
    }
    return false;
  }
};

// ✅ دالة جلب منتجات تاجر معين في خدمة محددة (للعميل)
export const getMerchantProductsByService = async (merchantId, serviceId) => {
  try {
    console.log(`🔍 جلب منتجات التاجر ${merchantId} للخدمة ${serviceId}`);

    // جلب المنتجات من collection products
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      [
        Query.equal('merchantId', merchantId),
        Query.equal('serviceId', 'products'), // ✅ كل المنتجات serviceId = products
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.orderAsc('name')
      ]
    );
    
    console.log(`✅ تم جلب ${response.documents.length} منتج للتاجر`);
    
    // فلترة إضافية للتأكد
    const filteredProducts = response.documents.filter(p => 
      p.status === 'approved' && p.isAvailable === true
    );
    
    console.log(`✅ بعد الفلترة: ${filteredProducts.length} منتج معتمد`);
    
    return { success: true, data: filteredProducts };
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات التاجر:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ✅ دالة جلب المنتجات حسب الخدمة (للعميل)
export const getProductsByService = async (serviceId) => {
  try {
    console.log(`🔍 جلب المنتجات للخدمة ${serviceId}`);

    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      [
        Query.equal('serviceId', 'products'),
        Query.equal('status', 'approved'),
        Query.equal('isAvailable', true),
        Query.orderAsc('name')
      ]
    );

    console.log(`✅ تم جلب ${response.documents.length} منتج من products`);

    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب جميع المنتجات (للأدمن)
export const getAllProducts = async () => {
  try {
    console.log('🔍 جلب جميع المنتجات من Appwrite...');
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      [Query.orderDesc('createdAt'), Query.limit(1000)]
    );
    console.log(`✅ تم جلب ${response.documents.length} منتج`);
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب منتجات تاجر معين
export const getMerchantProducts = async (merchantId) => {
  try {
    console.log(`🔍 جلب منتجات التاجر ${merchantId}`);

    if (!merchantId) {
      console.error('❌ merchantId مطلوب');
      return { success: false, error: 'merchantId مطلوب', data: [] };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      [
        Query.equal('merchantId', merchantId),
        Query.orderDesc('createdAt')
      ]
    );
    console.log(`✅ تم جلب ${response.documents.length} منتج للتاجر`);
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات التاجر:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// إضافة منتج جديد
export const addProduct = async (productData) => {
  try {
    if (!productData.merchantId) {
      return { success: false, error: 'merchantId مطلوب' };
    }

    // جلب بيانات التاجر لمعرفة merchantType
    let merchantType = '';
    try {
      const merchantResponse = await databases.getDocument(
        DATABASE_ID,
        'users',
        productData.merchantId
      );
      merchantType = merchantResponse.merchantType || '';
    } catch (e) {
      console.log('⚠️ لا يمكن جلب merchantType');
    }

    const newProduct = {
      name: productData.name,
      description: productData.description || '',
      price: parseFloat(productData.price),
      imageUrl: productData.imageUrl || '',
      isAvailable: productData.isAvailable !== false,
      status: 'pending',
      merchantId: productData.merchantId,
      merchantName: productData.merchantName || '',
      merchantType: merchantType,
      serviceId: 'products',
      createdAt: new Date().toISOString(),
    };

    console.log('📦 إضافة منتج:', newProduct);

    const response = await databases.createDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      ID.unique(),
      newProduct
    );
    console.log('✅ تم إضافة المنتج بنجاح:', response.$id);
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إضافة المنتج:', error);
    return { success: false, error: error.message };
  }
};

// تحديث منتج
export const updateProduct = async (productId, productData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      productId,
      productData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتج:', error);
    return { success: false, error: error.message };
  }
};

// حذف منتج
export const deleteProduct = async (productId) => {
  try {
    await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId);
    console.log(`✅ تم حذف المنتج ${productId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف المنتج:', error);
    return { success: false, error: error.message };
  }
};

// الموافقة على منتج
export const approveProduct = async (productId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      productId,
      { status: 'approved' }
    );
    console.log(`✅ تمت الموافقة على المنتج ${productId}`);
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في الموافقة:', error);
    return { success: false, error: error.message };
  }
};

// رفض منتج مع سبب
export const rejectProduct = async (productId, reason) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      productId,
      { status: 'rejected', rejectionReason: reason }
    );
    console.log(`✅ تم رفض المنتج ${productId}`);
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في الرفض:', error);
    return { success: false, error: error.message };
  }
};

// جلب المنتجات المعلقة
export const getPendingProducts = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      [
        Query.equal('status', 'pending'),
        Query.orderDesc('createdAt')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات المعلقة:', error);
    return { success: false, error: error.message, data: [] };
  }
};
