import { databases, DATABASE_ID, ITEM_PRICES_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// جلب أسعار صنف معين
export const getItemPrices = async (itemId) => {
  try {
    if (!itemId) return { success: false, error: 'itemId مطلوب', data: [] };

    const response = await databases.listDocuments(
      DATABASE_ID,
      ITEM_PRICES_COLLECTION_ID,
      [
        Query.equal('itemId', itemId),
        Query.limit(50)
      ]
    );
    
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب الأسعار:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// إضافة سعر لصنف (لخدمة فرعية معينة)
export const addItemPrice = async (itemId, subServiceName, price, qty = 0) => {
  try {
    const newPrice = {
      itemId: itemId,
      subServiceName: subServiceName,
      price: parseFloat(price),
      qty: parseInt(qty) || 0,
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      ITEM_PRICES_COLLECTION_ID,
      ID.unique(),
      newPrice
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إضافة السعر:', error);
    return { success: false, error: error.message };
  }
};

// تحديث سعر
export const updateItemPrice = async (priceId, price, qty) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ITEM_PRICES_COLLECTION_ID,
      priceId,
      {
        price: parseFloat(price),
        qty: parseInt(qty) || 0,
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث السعر:', error);
    return { success: false, error: error.message };
  }
};

// حذف سعر
export const deleteItemPrice = async (priceId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      ITEM_PRICES_COLLECTION_ID,
      priceId
    );
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف السعر:', error);
    return { success: false, error: error.message };
  }
};

// حذف كل أسعار صنف
export const deleteAllItemPrices = async (itemId) => {
  try {
    const prices = await getItemPrices(itemId);
    if (prices.success && prices.data.length > 0) {
      const deletePromises = prices.data.map(price => 
        databases.deleteDocument(DATABASE_ID, ITEM_PRICES_COLLECTION_ID, price.$id)
      );
      await Promise.all(deletePromises);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف الأسعار:', error);
    return { success: false, error: error.message };
  }
};
