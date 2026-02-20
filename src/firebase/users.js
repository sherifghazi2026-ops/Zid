import { db } from './init';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// المفتاح السري (في الإنتاج، خزنه في متغيرات البيئة)
const SECRET_KEY = "zayed-id-secret-key-2026";

// أنواع المستخدمين
export const userRoles = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  DRIVER: 'driver',
  ADMIN: 'admin'
};

// أنواع التجار (الخدمات)
export const merchantTypes = {
  SUPERMARKET: 'سوبر ماركت',
  RESTAURANT: 'مطاعم',
  IRONING: 'مكوجي',
  PHARMACY: 'صيدلية',
  WINCH: 'ونش',
  ELECTRICIAN: 'كهربائي',
  MOVING: 'نقل اثاث',
  MARBLE: 'رخام',
  PLUMBING: 'سباكة',
  CARPENTRY: 'نجارة',
  KITCHEN: 'مطابخ'
};

// ==================== دوال التشفير ====================
const encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

const decryptPassword = (encryptedPassword) => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ==================== إنشاء مستخدم جديد (عن طريق الأدمن) ====================
export const createUserByAdmin = async (userData) => {
  try {
    // تشفير كلمة المرور
    const encryptedPassword = encryptPassword(userData.password);
    
    // التحقق من عدم تكرار رقم الهاتف
    const q = query(collection(db, 'users'), where('phone', '==', userData.phone));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { success: false, error: 'رقم الهاتف موجود بالفعل' };
    }
    
    const newUser = {
      phone: userData.phone,
      name: userData.name,
      role: userData.role,
      merchantType: userData.merchantType || null,
      password: encryptedPassword,
      active: true,
      createdBy: 'admin',
      createdAt: serverTimestamp(),
      lastLogin: null,
      totalOrders: 0,
      completedOrders: 0
    };
    
    const docRef = await addDoc(collection(db, 'users'), newUser);
    
    // إرجاع البيانات بدون كلمة المرور
    const { password, ...userWithoutPassword } = newUser;
    return { 
      success: true, 
      id: docRef.id, 
      data: { id: docRef.id, ...userWithoutPassword }
    };
    
  } catch (error) {
    console.error('خطأ في إنشاء المستخدم:', error);
    return { success: false, error: error.message };
  }
};

// ==================== تسجيل الدخول ====================
export const loginUser = async (phone, password) => {
  try {
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'رقم الهاتف غير مسجل' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // التحقق من الحساب نشط
    if (!userData.active) {
      return { success: false, error: 'الحساب غير نشط، تواصل مع الإدارة' };
    }
    
    // فك تشفير كلمة المرور
    const originalPassword = decryptPassword(userData.password);
    
    if (originalPassword === password) {
      // تحديث آخر دخول
      const userRef = doc(db, 'users', userDoc.id);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp()
      });
      
      // إرجاع البيانات بدون كلمة المرور
      const { password: pwd, ...userWithoutPassword } = userData;
      
      return { 
        success: true, 
        data: { 
          id: userDoc.id, 
          ...userWithoutPassword 
        } 
      };
    } else {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }
    
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    return { success: false, error: error.message };
  }
};

// ==================== جلب بيانات المستخدم ====================
export const getUserById = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const { password, ...userWithoutPassword } = userData;
      
      return { 
        success: true, 
        data: { id: docSnap.id, ...userWithoutPassword } 
      };
    }
    
    return { success: false, error: 'المستخدم غير موجود' };
    
  } catch (error) {
    console.error('خطأ في جلب المستخدم:', error);
    return { success: false, error: error.message };
  }
};

// ==================== جلب التجار حسب النوع ====================
export const getMerchantsByType = async (merchantType) => {
  try {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', userRoles.MERCHANT),
      where('merchantType', '==', merchantType),
      where('active', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const merchants = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const { password, ...userWithoutPassword } = userData;
      merchants.push({ id: doc.id, ...userWithoutPassword });
    });
    
    return { success: true, data: merchants };
    
  } catch (error) {
    console.error('خطأ في جلب التجار:', error);
    return { success: false, error: error.message };
  }
};

// ==================== تحديث بيانات المستخدم ====================
export const updateUser = async (userId, updateData) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // لو في كلمة مرور جديدة، نشفرها
    if (updateData.password) {
      updateData.password = encryptPassword(updateData.password);
    }
    
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(userRef, updateData);
    
    return { success: true };
    
  } catch (error) {
    console.error('خطأ في تحديث المستخدم:', error);
    return { success: false, error: error.message };
  }
};

// ==================== تغيير كلمة المرور ====================
export const changePassword = async (userId, oldPassword, newPassword) => {
  try {
    // جلب المستخدم أولاً
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    const userData = userSnap.data();
    const originalPassword = decryptPassword(userData.password);
    
    // التحقق من كلمة المرور القديمة
    if (originalPassword !== oldPassword) {
      return { success: false, error: 'كلمة المرور القديمة غير صحيحة' };
    }
    
    // تحديث كلمة المرور
    const encryptedNewPassword = encryptPassword(newPassword);
    await updateDoc(userRef, {
      password: encryptedNewPassword,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    return { success: false, error: error.message };
  }
};

// ==================== جلب كل المستخدمين (للوحة التحكم) ====================
export const getAllUsers = async (role = null) => {
  try {
    let q;
    if (role) {
      q = query(collection(db, 'users'), where('role', '==', role));
    } else {
      q = collection(db, 'users');
    }
    
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const { password, ...userWithoutPassword } = userData;
      users.push({ id: doc.id, ...userWithoutPassword });
    });
    
    return { success: true, data: users };
    
  } catch (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    return { success: false, error: error.message };
  }
};

// ==================== تفعيل/تعطيل مستخدم ====================
export const toggleUserStatus = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    const currentStatus = userSnap.data().active;
    
    await updateDoc(userRef, {
      active: !currentStatus,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, newStatus: !currentStatus };
    
  } catch (error) {
    console.error('خطأ في تغيير حالة المستخدم:', error);
    return { success: false, error: error.message };
  }
};
