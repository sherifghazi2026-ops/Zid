import { registerUser } from './appwrite/userService';

export const testRegister = async () => {
  console.log('🔍 محاولة تسجيل مستخدم جديد...');
  
  const result = await registerUser('مستخدم تجريبي', '01234567890', '123456', 'customer');
  
  if (result.success) {
    console.log('✅ تم التسجيل بنجاح!');
    console.log('📊 بيانات المستخدم:', result.data);
  } else {
    console.error('❌ فشل التسجيل:', result.error);
  }
  
  return result;
};

export default testRegister;
