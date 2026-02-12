import { useState, useEffect } from 'react';
import { getWallet, creditWallet, debitWallet, getUserTransactions } from '../services/walletService';

export const useWallet = (uid) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (uid?.startsWith('guest-')) {
      setIsGuest(true);
      setWallet({
        uid,
        balance: 100,
        updatedAt: new Date()
      });
      setTransactions([
        {
          id: '1',
          description: 'رصيد ترحيبي',
          amount: 100,
          type: 'credit',
          createdAt: new Date()
        }
      ]);
      setLoading(false);
      return;
    }

    if (uid) {
      loadData();
    }
  }, [uid]);

  const loadData = async () => {
    const [walletRes, txRes] = await Promise.all([
      getWallet(uid),
      getUserTransactions(uid)
    ]);

    if (walletRes.success) setWallet(walletRes.data);
    if (txRes.success) setTransactions(txRes.data);
    setLoading(false);
  };

  const addFunds = async (amount, desc) => {
    if (isGuest) {
      setWallet(prev => ({
        ...prev,
        balance: (prev?.balance || 0) + amount
      }));
      setTransactions(prev => [{
        id: Date.now().toString(),
        type: 'credit',
        amount,
        description: desc || 'إيداع',
        createdAt: new Date()
      }, ...prev]);
      return { success: true, balance: (wallet?.balance || 0) + amount };
    }

    const result = await creditWallet(uid, amount, desc);
    if (result.success) loadData();
    return result;
  };

  const spendFunds = async (amount, desc) => {
    if (isGuest) {
      if ((wallet?.balance || 0) < amount) {
        return { success: false, error: 'الرصيد غير كافي' };
      }
      setWallet(prev => ({
        ...prev,
        balance: (prev?.balance || 0) - amount
      }));
      setTransactions(prev => [{
        id: Date.now().toString(),
        type: 'debit',
        amount,
        description: desc || 'سحب',
        createdAt: new Date()
      }, ...prev]);
      return { success: true, balance: (wallet?.balance || 0) - amount };
    }

    const result = await debitWallet(uid, amount, desc);
    if (result.success) loadData();
    return result;
  };

  return { 
    wallet, 
    transactions, 
    loading, 
    isGuest,
    addFunds, 
    spendFunds, 
    refresh: loadData 
  };
};
