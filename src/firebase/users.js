import { db, auth } from './init';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc 
} from 'firebase/firestore';

export const loginUser = async (phone, password) => {
  try {
    const q = query(
      collection(db, "users"), 
      where("phone", "==", phone),
      where("password", "==", password)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return { success: true, data: userData };
    } else {
      return { success: false, error: "بيانات الدخول غير صحيحة" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
