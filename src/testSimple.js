import { databases, DATABASE_ID } from './appwrite/config';

export const testConnection = async () => {
  try {
    console.log('🔍 اختبار الاتصال البسيط...');
    console.log('📁 محاولة قراءة قائمة المستخدمين...');
    
    // محاولة قراءة أي مستند (حتى لو لم يكن موجوداً)
    const response = await databases.listDocuments(
      DATABASE_ID,
      'users',
      []
    );
    
    console.log('✅ الاتصال ناجح!');
    console.log('📊 عدد المستخدمين:', response.documents.length);
    return true;
  } catch (error) {
    console.error('❌ فشل الاتصال:', error);
    console.log('🔧 تفاصيل الخطأ:', JSON.stringify(error, null, 2));
    return false;
  }
};

export default testConnection;
