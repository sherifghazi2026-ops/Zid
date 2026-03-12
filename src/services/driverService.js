import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '../appwrite/config';
import { Query } from 'appwrite';

export const getAvailableDrivers = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('role', 'driver'),
        Query.equal('active', true),
        Query.equal('isAvailable', true),
        Query.limit(50)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب المناديب:', error);
    return { success: false, error: error.message, data: [] };
  }
};
