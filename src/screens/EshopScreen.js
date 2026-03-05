import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableProducts, getProductsByCategory } from '../services/productsService';
import { getFileUrl } from '../services/orderService';

const categories = [
  { id: 'all', name: 'الكل', icon: 'apps-outline' },
  { id: 'gifts', name: 'هدايا', icon: 'gift-outline' },
  { id: 'home', name: 'منتجات منزلية', icon: 'home-outline' },
  { id: 'electronics', name: 'أجهزة كهربائية', icon: 'flash-outline' },
  { id: 'other', name: 'أخرى', icon: 'cube-outline' },
];

export default function EshopScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [activeCategory, searchQuery, products]);

  const loadProducts = async () => {
    const result = await getAvailableProducts();
    if (result.success) {
      setProducts(result.data);
      setFilteredProducts(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.$id === product.$id);
      if (existing) {
        return prevCart.map(item =>
          item.$id === product.$id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });

    Alert.alert('✅ تم', 'تمت إضافة المنتج إلى السلة');
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.$id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.$id === productId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const checkout = () => {
    if (cart.length === 0) {
      Alert.alert('تنبيه', 'السلة فارغة');
      return;
    }

    const total = getTotalPrice();
    const deliveryFee = 30;
    const finalTotal = total + deliveryFee;

    Alert.alert(
      'تأكيد الطلب',
      `إجمالي المنتجات: ${total} ج\nرسوم التوصيل: ${deliveryFee} ج\nالإجمالي: ${finalTotal} ج`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          onPress: () => {
            Alert.alert('✅ تم', 'تم إرسال طلبك');
            setCart([]);
            setCartVisible(false);
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ZID متجر</Text>
        <TouchableOpacity onPress={() => setCartVisible(true)}>
          <View style={styles.cartBadge}>
            <Ionicons name="cart-outline" size={24} color="#4F46E5" />
            {cart.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن منتج..." placeholderTextColor="#9CA3AF"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryTab,
              activeCategory === cat.id && styles.activeCategoryTab
            ]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon}
              size={18}
              color={activeCategory === cat.id ? '#FFF' : '#6B7280'}
            />
            <Text style={[
              styles.categoryText,
              activeCategory === cat.id && styles.activeCategoryText
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cartVisible ? (
        <View style={styles.cartContainer}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>سلة التسوق</Text>
            <TouchableOpacity onPress={() => setCartVisible(false)}>
              <Ionicons name="close" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.cartList}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={60} color="#E5E7EB" />
                <Text style={styles.emptyCartText}>السلة فارغة</Text>
              </View>
            ) : (
              <>
                {cart.map((item) => (
                  <View key={item.$id} style={styles.cartItem}>
                    {item.imageUrl ? (
                      <Image source={{ uri: getFileUrl(item.imageUrl) }} style={styles.cartItemImage} />
                    ) : (
                      <View style={[styles.cartItemImage, styles.imagePlaceholder]}>
                        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>{item.price} ج</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.$id, -1)}
                        >
                          <Ionicons name="remove" size={16} color="#4F46E5" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.$id, 1)}
                        >
                          <Ionicons name="add" size={16} color="#4F46E5" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.$id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>إجمالي المنتجات: {getTotalPrice()} ج</Text>
                  <Text style={styles.deliveryText}>+ توصيل: 30 ج</Text>
                  <Text style={styles.finalTotal}>المجموع: {getTotalPrice() + 30} ج</Text>
                </View>

                <TouchableOpacity style={styles.checkoutButton} onPress={checkout}>
                  <Text style={styles.checkoutButtonText}>إتمام الشراء</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.content}
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyText}>لا توجد منتجات</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <View key={product.$id} style={styles.productCard}>
                  {product.imageUrl ? (
                    <Image source={{ uri: getFileUrl(product.imageUrl) }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.imagePlaceholder]}>
                      <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>{product.price} ج</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addToCart(product)}
                    >
                      <Ionicons name="cart-outline" size={16} color="#FFF" />
                      <Text style={styles.addButtonText}>أضف إلى السلة</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  cartBadge: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },

  categoriesContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 4,
  },
  activeCategoryTab: {
    backgroundColor: '#4F46E5',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeCategoryText: {
    color: '#FFF',
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },

  productsGrid: { gap: 16 },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: { width: '100%', height: 150, resizeMode: 'cover' },
  productInfo: { padding: 16 },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: '600', color: '#F59E0B', marginBottom: 8 },
  productDescription: { fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  addButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  cartContainer: { flex: 1, backgroundColor: '#FFF' },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cartTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  cartList: { flex: 1, padding: 16 },
  emptyCart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyCartText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cartItemImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  cartItemPrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginBottom: 4 },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  removeButton: { justifyContent: 'center', padding: 8 },
  totalContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  totalText: { fontSize: 16, color: '#1F2937', marginBottom: 4 },
  deliveryText: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  finalTotal: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  checkoutButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
