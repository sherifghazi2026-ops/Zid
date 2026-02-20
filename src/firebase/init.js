import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { firebaseConfig } from './config';

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تهيئة Firestore مع إعدادات الأداء
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

console.log('✅ Firebase initialized successfully');
