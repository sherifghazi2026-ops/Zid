import { databases, DATABASE_ID } from './appwrite/config';
import { SERVICES_COLLECTION_ID, DEFAULT_SERVICES } from './services/servicesService';

export const debugServices = async () => {
  try {
    console.log('🔍 فحص Collection services...');
    
    // محاولة قراءة الخدمات
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      []
    );
    
    console.log('✅ الخدمات موجودة:', response.documents.length);
    
    if (response.documents.length === 0) {
      console.log('📝 لا توجد خدمات، جاري إنشاءها...');
      
      for (const service of DEFAULT_SERVICES) {
        const result = await databases.createDocument(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          'unique()',
          {
            ...service,
            updatedAt: new Date().toISOString()
          }
        );
        console.log(`✅ تم إنشاء خدمة ${service.name}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ خطأ:', error);
    return false;
  }
};

export default debugServices;
