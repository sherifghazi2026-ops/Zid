import { databases, DATABASE_ID, USERS_COLLECTION_ID } from './config';
import { Query } from 'appwrite';

export const loginUser = async (phone, password) => {
  try {
    console.log('🔍 Attempting login with API Key for:', phone);

    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('phone', phone),
        Query.equal('password', password),
        Query.limit(1)
      ]
    );

    if (response.documents.length > 0) {
      const user = response.documents[0];
      if (!user.active) {
        return { success: false, error: 'الحساب غير نشط' };
      }
      return { success: true, data: user };
    }
    return { success: false, error: 'بيانات الدخول غير صحيحة' };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { success: false, error: error.message };
  }
};
