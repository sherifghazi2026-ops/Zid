// ملف توحيد أسماء المجموعات في Appwrite
// استخدم هذا الملف في جميع الخدمات لتجنب الأخطاء

export const COLLECTIONS = {
  // المجموعات الرئيسية
  USERS: 'users',
  ORDERS: 'orders',
  SERVICES: 'services',
  
  // المطاعم والأطباق
  RESTAURANTS: 'restaurants',
  DISHES: 'dishes',
  
  // أكل بيتي
  HOME_CHEFS: 'home_chefs',
  HOME_CHEF_DISHES: 'home_chef_dishes',
  
  // المساعدين
  ASSISTANTS: 'assistants',
  
  // الخدمات ذات الأصناف
  SERVICE_ITEMS: 'serviceitems',
  
  // المنتجات العامة
  PRODUCTS: 'products',
  
  // العروض
  OFFERS: 'offers',
  
  // أصناف المكوجي
  LAUNDRY_ITEMS: 'laundry_items',
  
  // الأماكن
  PLACES: 'places',
  
  // أسعار الأصناف
  ITEM_PRICES: 'item_prices',
  
  // خدمات جديدة
  SERVICE_MILK_ITEMS: 'service_milk_items',
  SERVICE_BAKERY_ITEMS: 'service_bakery_items',
  SERVICE_DRINKS_ITEMS: 'service_drinks_items',
};

// أنواع التجار
export const MERCHANT_TYPES = {
  RESTAURANT: 'restaurant',
  HOME_CHEF: 'home_chef',
  MILK: 'milk',
  BAKERY: 'bakery',
  DRINKS: 'drinks',
  LAUNDRY: 'laundry',
  PHARMACY: 'pharmacy',
  SUPERMARKET: 'supermarket',
  ELECTRICIAN: 'electrician',
  PLUMBER: 'plumber',
  CARPENTER: 'carpenter',
};

// حالات الطلب
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// أدوار المستخدمين
export const USER_ROLES = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

// الحصول على اسم المجموعة حسب نوع التاجر
export const getCollectionByMerchantType = (merchantType) => {
  const map = {
    [MERCHANT_TYPES.RESTAURANT]: COLLECTIONS.DISHES,
    [MERCHANT_TYPES.HOME_CHEF]: COLLECTIONS.HOME_CHEF_DISHES,
    [MERCHANT_TYPES.MILK]: COLLECTIONS.SERVICE_MILK_ITEMS,
    [MERCHANT_TYPES.BAKERY]: COLLECTIONS.SERVICE_BAKERY_ITEMS,
    [MERCHANT_TYPES.DRINKS]: COLLECTIONS.SERVICE_DRINKS_ITEMS,
    [MERCHANT_TYPES.LAUNDRY]: COLLECTIONS.LAUNDRY_ITEMS,
  };
  return map[merchantType] || COLLECTIONS.SERVICE_ITEMS;
};
