import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, _longPollingId } from 'firebase/firestore';
import { firebaseConfig } from './config';

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تهيئة Firestore مع إعدادات تمنع أخطاء الاتصال (WebChannel Error)
export const db = initializeFirestore(app, {
  // تفعيل الـ Long Polling لضمان وصول طلبات تليجرام حتى لو الشبكة ضعيفة
  experimentalAutoDetectLongPolling: true, 
  // تفعيل التخزين المحلي عشان لو النت قطع الطلبات القديمة تفضل موجودة
  localCache: persistentLocalCache()
});
