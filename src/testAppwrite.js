import { databases, DATABASE_ID } from './appwrite/config';

export const testAppwriteConnection = async () => {
  try {
    console.log('🔍 اختبار الاتصال بـ Appwrite...');
    console.log('📁 DATABASE_ID:', DATABASE_ID);
    
    // محاولة جلب قائمة المجموعات (Collections)
    const response = await databases.listDocuments(
      DATABASE_ID,
      'users', // تأكد من وجود collection باسم users
      []
    );
    
    console.log('✅ الاتصال ناجح!');
    console.log('📊 عدد المستخدمين:', response.documents.length);
    return true;
  } catch (error) {
    console.error('❌ فشل الاتصال:', error);
    console.log('🔧 تأكد من:');
    console.log('   1. DATABASE_ID صحيح');
    console.log('   2. Collections موجودة (users, orders)');
    console.log('   3. صلاحيات القراءة/الكتابة مفعلة');
    return false;
  }
};

export default testAppwriteConnection;
