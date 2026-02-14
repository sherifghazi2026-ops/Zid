import { db } from '../firebase/init';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

// تسجيل مندوب جديد
export const registerDriver = async (driverData) => {
  try {
    const driver = {
      ...driverData,
      isActive: true,
      registeredAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'drivers'), driver);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// تحديث موقع المندوب
export const updateDriverLocation = async (driverId, latitude, longitude) => {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    await updateDoc(driverRef, {
      location: { latitude, longitude },
      lastSeen: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
