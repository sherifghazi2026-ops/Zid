const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');
const CryptoJS = require('crypto-js');

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB1QJACb44C89BN6yZFM5hKODdUAJqXvw0",
  authDomain: "zayed-id.firebaseapp.com",
  projectId: "zayed-id",
  storageBucket: "zayed-id.firebasestorage.app",
  messagingSenderId: "112994130336",
  appId: "1:112994130336:android:f39cb90e5f31173c2decc5"
};

const SECRET_KEY = "zayed-id-secret-key-2026";

const encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

async function addAdmin() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // بيانات الأدمن
    const adminData = {
      phone: "01000000000",
      name: "مدير النظام",
      role: "admin",
      password: encryptPassword("admin123"),
      active: true,
      createdBy: "system",
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    // التحقق من عدم التكرار
    const q = query(collection(db, 'users'), where('phone', '==', adminData.phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log('⚠️ الأدمن موجود بالفعل');
      return;
    }

    // إضافة الأدمن
    const docRef = await addDoc(collection(db, 'users'), adminData);
    console.log('✅ تم إضافة الأدمن بنجاح');
    console.log('📞 رقم التليفون: 01000000000');
    console.log('🔑 كلمة المرور: admin123');

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

addAdmin();
