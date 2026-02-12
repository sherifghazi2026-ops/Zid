import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/init';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ✅ إنشاء مستند المستخدم تلقائياً عند أول تسجيل دخول
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            provider: firebaseUser.providerData[0]?.providerId,
            createdAt: serverTimestamp(),
          });
        }

        // ✅ إنشاء محفظة تلقائياً
        const walletRef = doc(db, 'wallets', firebaseUser.uid);
        const walletSnap = await getDoc(walletRef);
        
        if (!walletSnap.exists()) {
          await setDoc(walletRef, {
            uid: firebaseUser.uid,
            balance: 0,
            updatedAt: serverTimestamp(),
          });
        }

        setUser(firebaseUser);
        setIsGuest(false);
      } else {
        setUser(null);
        setIsGuest(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ دالة تسجيل الدخول كزائر
  const loginAsGuest = () => {
    setIsGuest(true);
    setUser({ uid: 'guest-' + Date.now(), isGuest: true });
    setLoading(false);
  };

  // ✅ دالة تسجيل الخروج
  const logout = async () => {
    if (isGuest) {
      setIsGuest(false);
      setUser(null);
    } else {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isGuest, 
      loading, 
      loginAsGuest, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
