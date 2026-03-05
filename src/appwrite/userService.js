import { databases, DATABASE_ID, USERS_COLLECTION_ID } from './config';
import { ID, Query } from 'appwrite';

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
      userType: 'customer',
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
      userType: userData.role,
      active: userData.active !== undefined ? userData.active : true,
      profileCompleted: false,
      createdAt: new Date().toISOString(),
    };

    // حقول مشتركة للتجار
    if (userData.role === 'merchant') {
      newUser.merchantType = userData.merchantType;
      
      // حقول المطاعم
      if (userData.merchantType === 'restaurant') {
        newUser.placeId = userData.placeId;
        newUser.placeName = userData.placeName;
        // إضافة وقت ورسوم التوصيل للمطاعم
        newUser.deliveryTime = userData.deliveryTime || 30;
        newUser.deliveryFee = userData.deliveryFee || 0;
      }
      
      // حقول الشيف المنزلي
      if (userData.merchantType === 'home_chef') {
        newUser.specialties = userData.specialties || [];
        newUser.deliveryFee = userData.deliveryFee || 0;
        newUser.deliveryRadius = userData.deliveryRadius || 10;
        newUser.healthCertUrl = userData.healthCertUrl || null;
        newUser.isVerified = false;
      }
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

export const getUsersByRole = async (role) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('role', role),
        Query.limit(100)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error(`خطأ في جلب ${role}:`, error);
    return { success: false, error: error.message };
  }
};

// ✅ الدالة المطلوبة لإشعار التجار والمناديب حسب نوع الخدمة
export const getUsersByRoleAndType = async (role, merchantType) => {
  try {
    console.log(`🔍 جلب المستخدمين: role=${role}, merchantType=${merchantType}`);
    
    const queries = [Query.equal('role', role)];
    
    if (merchantType) {
      queries.push(Query.equal('merchantType', merchantType));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      queries
    );
    
    console.log(`✅ تم العثور على ${response.documents.length} مستخدم`);
    return { success: true, data: response.documents };
  } catch (error) {
    console.error(`خطأ في جلب ${role} من نوع ${merchantType}:`, error);
    return { success: false, error: error.message };
  }
};

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

export const verifyChef = async (userId, isVerified) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      { isVerified }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('Error verifying chef:', error);
    return { success: false, error: error.message };
  }
};

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

export const updateUserLocation = async (userId, location) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        locationLat: location.latitude,
        locationLng: location.longitude,
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating user location:', error);
    return { success: false, error: error.message };
  }
};

export const updateAvailability = async (userId, isAvailable) => {
  return updateDriverAvailability(userId, isAvailable);
};
