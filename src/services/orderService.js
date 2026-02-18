import { db } from '../firebase/init';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';

// إنشاء طلب جديد
export const createOrder = async (orderData) => {
  try {
    const order = {
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'orders'), order);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// الاستماع للطلبات الجديدة (للمندوبين)
export const subscribeToNewOrders = (callback) => {
  const q = query(
    collection(db, 'orders'),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    callback(orders);
  });
};

// قبول الطلب من قبل مندوب
export const acceptOrder = async (orderId, driverId, driverName) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: 'accepted',
      driverId,
      driverName,
      acceptedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
