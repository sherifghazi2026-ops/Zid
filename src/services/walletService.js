import { 
  doc, getDoc, runTransaction, addDoc, collection,
  query, where, orderBy, getDocs, serverTimestamp, limit
} from 'firebase/firestore';
import { db } from '../firebase/init';

export const getWallet = async (uid) => {
  try {
    const docRef = doc(db, 'wallets', uid);
    const docSnap = await getDoc(docRef);
    return { success: true, data: docSnap.data() };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const creditWallet = async (uid, amount, description = 'إيداع') => {
  if (amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

  try {
    const walletRef = doc(db, 'wallets', uid);
    
    const result = await runTransaction(db, async (transaction) => {
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error('المحفظة غير موجودة');

      const currentBalance = walletSnap.data().balance || 0;
      const newBalance = currentBalance + amount;

      transaction.update(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

      return newBalance;
    });

    await addDoc(collection(db, 'transactions'), {
      uid,
      type: 'credit',
      amount,
      description,
      createdAt: serverTimestamp(),
    });

    return { success: true, balance: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const debitWallet = async (uid, amount, description = 'سحب') => {
  if (amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

  try {
    const walletRef = doc(db, 'wallets', uid);
    
    const result = await runTransaction(db, async (transaction) => {
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error('المحفظة غير موجودة');

      const currentBalance = walletSnap.data().balance || 0;
      const newBalance = currentBalance - amount;

      if (newBalance < 0) throw new Error('الرصيد غير كافي');

      transaction.update(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

      return newBalance;
    });

    await addDoc(collection(db, 'transactions'), {
      uid,
      type: 'debit',
      amount,
      description,
      createdAt: serverTimestamp(),
    });

    return { success: true, balance: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserTransactions = async (uid, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: transactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
