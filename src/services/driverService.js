import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '../appwrite/config';
import { ID } from 'appwrite';

// تسجيل مندوب جديد
export const registerDriver = async (driverData) => {
  try {
    const driver = {
      ...driverData,
      role: 'driver',
      active: true,
      createdAt: new Date().toISOString(),
    };
    
    const response = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      driver
    );
    
    return { success: true, id: response.$id };
  } catch (error) {
    console.error('Error registering driver:', error);
    return { success: false, error: error.message };
  }
};
