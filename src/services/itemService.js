import { databases, DATABASE_ID, SERVICE_ITEMS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// جلب أصناف خدمة معينة
export const getItemsByService = async (serviceId) => {
  try {
    if (!serviceId) {
      return { success: false, error: 'serviceId مطلوب', data: [] };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      [
        Query.equal('serviceId', serviceId),
        Query.limit(100)
      ]
    );
    
    // تحويل النص المخزن إلى كائن إذا كان موجوداً
    const processedData = response.documents.map(item => {
      if (item.pricesData) {
        try {
          item.prices = JSON.parse(item.pricesData);
        } catch (e) {
          item.prices = [];
        }
      } else {
        item.prices = [];
      }
      return item;
    });
    
    return { success: true, data: processedData };
  } catch (error) {
    console.error(`❌ خطأ في جلب الأصناف:`, error);
    return { success: false, error: error.message, data: [] };
  }
};

// إنشاء صنف جديد
export const createItem = async (serviceId, itemData) => {
  try {
    if (!serviceId) {
      return { success: false, error: 'serviceId مطلوب' };
    }

    console.log(`📦 إنشاء صنف للخدمة: ${serviceId}`);
    console.log('📦 البيانات المستلمة:', JSON.stringify(itemData, null, 2));

    // استخراج السعر الأول
    let firstPrice = 0;
    const pricesArray = [];
    
    if (itemData.subServices) {
      Object.entries(itemData.subServices).forEach(([subService, data]) => {
        pricesArray.push({
          subService: subService,
          price: parseFloat(data.price || 0),
          qty: parseInt(data.qty || 0)
        });
      });
      
      if (pricesArray.length > 0) {
        firstPrice = pricesArray[0].price;
      }
    }

    // تحويل المصفوفة إلى نص JSON
    const pricesDataString = JSON.stringify(pricesArray);

    // ✅ استخدام الحقول الموجودة فقط في قاعدة البيانات
    const newItem = {
      serviceId: serviceId,
      name: itemData.name,
      price: firstPrice,
      imageUrl: itemData.imageUrl || null,
      isActive: itemData.isAvailable !== undefined ? itemData.isAvailable : true,
      pricesData: pricesDataString,
      createdAt: new Date().toISOString(),
      // ❌ تم إزالة updatedAt - Appwrite يديره تلقائياً
    };

    console.log('📦 البيانات المرسلة إلى Appwrite:', JSON.stringify(newItem, null, 2));

    const response = await databases.createDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      ID.unique(),
      newItem
    );

    // إضافة حقل prices للرد
    response.prices = pricesArray;

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الصنف:', error);
    return { success: false, error: error.message };
  }
};

// تحديث صنف
export const updateItem = async (itemId, updateData) => {
  try {
    console.log(`📦 تحديث صنف: ${itemId}`);
    
    // تحويل البيانات إلى مصفوفة
    let firstPrice = 0;
    const pricesArray = [];
    
    if (updateData.subServices) {
      Object.entries(updateData.subServices).forEach(([subService, data]) => {
        pricesArray.push({
          subService: subService,
          price: parseFloat(data.price || 0),
          qty: parseInt(data.qty || 0)
        });
      });
      
      if (pricesArray.length > 0) {
        firstPrice = pricesArray[0].price;
      }
    }

    // تحويل المصفوفة إلى نص JSON
    const pricesDataString = JSON.stringify(pricesArray);

    // ✅ استخدام الحقول الموجودة فقط - بدون updatedAt
    const updateFields = {
      name: updateData.name,
      price: firstPrice,
      imageUrl: updateData.imageUrl || null,
      isActive: updateData.isAvailable !== undefined ? updateData.isAvailable : true,
      pricesData: pricesDataString,
    };

    // إزالة الحقول الفارغة
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] === undefined) {
        delete updateFields[key];
      }
    });

    console.log('📦 بيانات التحديث:', JSON.stringify(updateFields, null, 2));

    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      itemId,
      updateFields
    );

    // إضافة حقل prices للرد
    response.prices = pricesArray;

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث الصنف:', error);
    return { success: false, error: error.message };
  }
};

// حذف صنف
export const deleteItem = async (itemId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      itemId
    );
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف الصنف:', error);
    return { success: false, error: error.message };
  }
};

// جلب الأصناف المتاحة للعملاء
export const getAvailableItemsByService = async (serviceId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICE_ITEMS_COLLECTION_ID,
      [
        Query.equal('serviceId', serviceId),
        Query.equal('isActive', true),
        Query.limit(100)
      ]
    );
    
    // تحويل النص المخزن إلى كائن
    const processedData = response.documents.map(item => {
      if (item.pricesData) {
        try {
          item.prices = JSON.parse(item.pricesData);
        } catch (e) {
          item.prices = [];
        }
      } else {
        item.prices = [];
      }
      return item;
    });
    
    return { success: true, data: processedData };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
