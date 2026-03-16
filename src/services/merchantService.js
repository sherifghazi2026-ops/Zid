import { databases, DATABASE_ID } from '../appwrite/config';
import { Query } from 'appwrite';

// جلب جميع التجار النشطين لنوع خدمة معين
export const getMerchantsByType = async (serviceType) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      'users',
      [
        Query.equal('role', 'merchant'),
        Query.equal('merchantType', serviceType),
        Query.equal('active', true),
        Query.orderAsc('name')
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error(`❌ خطأ في جلب تجار ${serviceType}:`, error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب تاجر معين
export const getMerchantById = async (merchantId) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      'users',
      merchantId
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في جلب التاجر:', error);
    return { success: false, error: error.message };
  }
};
