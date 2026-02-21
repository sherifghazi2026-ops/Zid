// ضع بيانات Firebase الخاصة بك هنا
// يمكنك الحصول عليها من: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration

export const firebaseConfig = {
  apiKey: "AIzaSyB1QJACb44C89BN6yZFM5hKODdUAJqXvw0",
  authDomain: "zayed-id.firebaseapp.com",
  projectId: "zayed-id",
  storageBucket: "zayed-id.firebasestorage.app",
  messagingSenderId: "112994130336",
  appId: "1:112994130336:android:f39cb90e5f31173c2decc5"
};

// للتحقق من صحة البيانات
export const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missing = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Firebase config missing fields:', missing);
    return false;
  }
  return true;
};
