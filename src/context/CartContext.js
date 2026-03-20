import React, { createContext, useState, useContext } from 'react';
import { Alert } from 'react-native';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [currentMerchant, setCurrentMerchant] = useState(null);

  const addToCart = (product) => {
    if (cartItems.length > 0 && cartItems[0].merchantId !== product.merchantId) {
      Alert.alert('تنبيه', 'لا يمكن إضافة منتجات من أكثر من تاجر', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'متابعة', onPress: () => {
          setCartItems([{ ...product, cartItemId: Date.now().toString(), quantity: 1 }]);
          setCurrentMerchant({ id: product.merchantId, name: product.merchantName, deliveryFee: product.deliveryFee || 0 });
        }}
      ]);
      return;
    }
    setCartItems(prev => {
      const existing = prev.find(item => item.$id === product.$id);
      if (existing) return prev.map(item => item.$id === product.$id ? { ...item, quantity: (item.quantity || 1) + 1 } : item);
      return [...prev, { ...product, quantity: 1, cartItemId: Date.now().toString() }];
    });
    setCurrentMerchant({ id: product.merchantId, name: product.merchantName, deliveryFee: product.deliveryFee || 0 });
  };

  const updateQuantity = (cartItemId, delta) => {
    setCartItems(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) } : item));
  };

  const removeFromCart = (cartItemId) => {
    setCartItems(prev => {
      const newCart = prev.filter(item => item.cartItemId !== cartItemId);
      if (newCart.length === 0) setCurrentMerchant(null);
      return newCart;
    });
  };

  const clearCart = () => { setCartItems([]); setCurrentMerchant(null); };
  const getTotalPrice = () => cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const itemCount = cartItems.length;

  return (
    <CartContext.Provider value={{ cartItems, currentMerchant, addToCart, updateQuantity, removeFromCart, clearCart, getTotalPrice, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};
