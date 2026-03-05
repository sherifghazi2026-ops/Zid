import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

export const RESTAURANTS_COLLECTION_ID = 'restaurants';

// جلب مطعم بواسطة merchantId
export const getRestaurantByMerchantId = async (merchantId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      RESTAURANTS_COLLECTION_ID,
      [Query.equal('merchantId', merchantId)]
    );
    
    if (response.documents.length > 0) {
      return { success: true, data: response.documents[0] };
    }
    return { success: false, error: 'لا يوجد مطعم مرتبط' };
  } catch (error) {
    console.error('خطأ في جلب المطعم:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع المطاعم النشطة
export const getActiveRestaurants = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      RESTAURANTS_COLLECTION_ID,
      [Query.equal('isActive', true)]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب المطاعم:', error);
    return { success: false, error: error.message };
  }
};
