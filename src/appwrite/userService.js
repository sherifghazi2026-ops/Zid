import { databases, DATABASE_ID, USERS_COLLECTION_ID, storage, BUCKET_ID } from './config';
import { ID, Query } from 'appwrite';

// تسجيل الدخول
export const loginUser = async (phone, password) => {
  try {
    console.log('🔍 البحث عن مستخدم برقم:', phone);
    
    if (!phone || phone.length < 10) {
      return { success: false, error: 'رقم الهاتف غير صحيح' };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('phone', phone),
        Query.equal('password', password),
        Query.limit(1)
      ]
    );

    if (response.documents.length === 0) {
      console.log('❌ لا يوجد مستخدم بهذه البيانات');
      return { success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
    }

    const user = response.documents[0];
    console.log('✅ تم العثور على المستخدم:', user.name, '- الدور:', user.role);

    if (!user.active) {
      return { success: false, error: 'هذا الحساب غير نشط. تواصل مع الإدارة' };
    }

    return { success: true, data: user };

  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    return { success: false, error: error.message };
  }
};

// تسجيل عميل جديد
export const registerCustomer = async (name, phone, password) => {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('phone', phone)]
    );

    if (existing.documents.length > 0) {
      return { success: false, error: 'رقم الهاتف موجود بالفعل' };
    }

    const userData = {
      name,
      phone,
      password,
      role: 'customer',
      active: true,
      profileCompleted: true,
      createdAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      userData
    );

    return { success: true, data: response };

  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء مستخدم بواسطة الأدمن
export const createUserByAdmin = async (userData) => {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('phone', userData.phone)]
    );

    if (existing.documents.length > 0) {
      return { success: false, error: 'رقم الهاتف موجود بالفعل' };
    }

    const newUser = {
      name: userData.name,
      phone: userData.phone,
      password: userData.password,
      role: userData.role,
      active: userData.active !== undefined ? userData.active : true,
      profileCompleted: false,
      createdAt: new Date().toISOString(),
    };

    if (userData.merchantType) {
      newUser.merchantType = userData.merchantType;
    }

    if (userData.role === 'driver') {
      newUser.serviceArea = userData.serviceArea || 'الشيخ زايد';
      newUser.maxDeliveryRadius = userData.maxDeliveryRadius || 10;
      newUser.isAvailable = userData.isAvailable !== undefined ? userData.isAvailable : true;
    }

    const response = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      newUser
    );

    return { success: true, data: response };

  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع المستخدمين
export const getAllUsers = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.limit(100)]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return { success: false, error: error.message };
  }
};

// جلب المستخدمين حسب الدور
export const getUsersByRole = async (role) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('role', role), Query.limit(100)]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// جلب المستخدمين حسب الدور ونوع النشاط
export const getUsersByRoleAndType = async (role, merchantType) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('role', role),
        Query.equal('merchantType', merchantType),
        Query.limit(100)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// تفعيل/تعطيل المستخدم
export const toggleUserStatus = async (userId, active) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      { active }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('Error toggling user status:', error);
    return { success: false, error: error.message };
  }
};

// حذف المستخدم
export const deleteUser = async (userId) => {
  try {
    console.log('🔍 محاولة حذف المستخدم:', userId);
    await databases.deleteDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    console.log('✅ تم حذف المستخدم بنجاح');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف المستخدم:', error);
    return { success: false, error: error.message };
  }
};

// تحديث حالة التوفر للمندوب
export const updateDriverAvailability = async (driverId, isAvailable) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      driverId,
      { isAvailable }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating driver availability:', error);
    return { success: false, error: error.message };
  }
};

// ملاحظة: تم تعطيل دالة رفع الصور مؤقتاً لتجنب مشكلة التكرار
// يمكن إضافتها لاحقاً عند الحاجة
