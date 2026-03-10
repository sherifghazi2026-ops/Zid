import { databases, DATABASE_ID, storage, BUCKET_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const MENU_ITEMS_COLLECTION_ID = 'menuItems';

export const getMenuItemsByRestaurant = async (restaurantId) => {
  try {
    console.log('🔍 جلب الأصناف للمطعم:', restaurantId);
    
    if (!restaurantId) {
      return { success: false, error: 'معرف المطعم مطلوب' };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      MENU_ITEMS_COLLECTION_ID,
      [
        Query.equal('restaurantId', restaurantId),
        Query.orderAsc('category'),
        Query.orderAsc('itemName')
      ]
    );
    
    console.log(`✅ تم جلب ${response.documents.length} صنف`);
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب الأصناف:', error);
    return { success: false, error: error.message };
  }
};

export const createMenuItem = async (menuData) => {
  try {
    const newItem = {
      itemName: menuData.itemName,
      description: menuData.description || null,
      price: parseFloat(menuData.price),
      offerPrice: menuData.offerPrice || null,
      category: menuData.category || null,
      unit: menuData.unit || null,
      spicyLevel: menuData.spicyLevel || 0,
      imageUrl: menuData.imageUrl || null,
      isAvailable: menuData.isAvailable !== false,
      ingredients: menuData.ingredients || null,
      options: menuData.options || null,
      restaurantId: menuData.restaurantId,
    };

    console.log('📤 إضافة صنف:', newItem);

    const response = await databases.createDocument(
      DATABASE_ID,
      MENU_ITEMS_COLLECTION_ID,
      ID.unique(),
      newItem
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إضافة الصنف:', error);
    return { success: false, error: error.message };
  }
};

export const updateMenuItem = async (itemId, updateData) => {
  try {
    const data = {};
    if (updateData.itemName) data.itemName = updateData.itemName;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.price) data.price = parseFloat(updateData.price);
    if (updateData.offerPrice !== undefined) data.offerPrice = updateData.offerPrice;
    if (updateData.category !== undefined) data.category = updateData.category;
    if (updateData.unit !== undefined) data.unit = updateData.unit;
    if (updateData.spicyLevel !== undefined) data.spicyLevel = updateData.spicyLevel;
    if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl;
    if (updateData.isAvailable !== undefined) data.isAvailable = updateData.isAvailable;
    if (updateData.ingredients !== undefined) data.ingredients = updateData.ingredients;
    if (updateData.options !== undefined) data.options = updateData.options;

    const response = await databases.updateDocument(
      DATABASE_ID,
      MENU_ITEMS_COLLECTION_ID,
      itemId,
      data
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الصنف:', error);
    return { success: false, error: error.message };
  }
};

export const deleteMenuItem = async (itemId, imageUrl) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      MENU_ITEMS_COLLECTION_ID,
      itemId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الصنف:', error);
    return { success: false, error: error.message };
  }
};

export const toggleItemAvailability = async (itemId, isAvailable) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      MENU_ITEMS_COLLECTION_ID,
      itemId,
      { isAvailable }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تغيير حالة الصنف:', error);
    return { success: false, error: error.message };
  }
};
