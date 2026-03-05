import { Client, Account, Databases, Storage } from 'appwrite';
import { Platform } from 'react-native';

// استخدام المتغيرات البيئية مع قيم افتراضية
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '699c510d00378e48ffbd';
export const DATABASE_ID = process.env.EXPO_PUBLIC_DATABASE_ID || '699db754000ef283ad3c';

// Collections
export const USERS_COLLECTION_ID = process.env.EXPO_PUBLIC_USERS_COLLECTION_ID || 'users';
export const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_ORDERS_COLLECTION_ID || 'orders';
export const SERVICES_COLLECTION_ID = process.env.EXPO_PUBLIC_SERVICES_COLLECTION_ID || 'services';
export const RESTAURANTS_COLLECTION_ID = process.env.EXPO_PUBLIC_RESTAURANTS_COLLECTION_ID || 'restaurants';
export const LAUNDRY_ITEMS_COLLECTION_ID = process.env.EXPO_PUBLIC_LAUNDRY_ITEMS_COLLECTION_ID || 'laundry_items';
export const ITEMS_SERVICES_COLLECTION_ID = process.env.EXPO_PUBLIC_ITEMS_SERVICES_COLLECTION_ID || 'items_services';
export const PLACES_COLLECTION_ID = process.env.EXPO_PUBLIC_PLACES_COLLECTION_ID || 'places';
export const PRODUCTS_COLLECTION_ID = process.env.EXPO_PUBLIC_PRODUCTS_COLLECTION_ID || 'products';
export const PRODUCT_CATEGORIES_COLLECTION_ID = process.env.EXPO_PUBLIC_PRODUCT_CATEGORIES_COLLECTION_ID || 'product_categories';
export const OFFERS_COLLECTION_ID = process.env.EXPO_PUBLIC_OFFERS_COLLECTION_ID || 'offers';
export const DISHES_COLLECTION_ID = process.env.EXPO_PUBLIC_DISHES_COLLECTION_ID || 'dishes';
export const HOME_CHEFS_COLLECTION_ID = process.env.EXPO_PUBLIC_HOME_CHEFS_COLLECTION_ID || 'home_chefs';
export const HOME_CHEF_DISHES_COLLECTION_ID = process.env.EXPO_PUBLIC_HOME_CHEF_DISHES_COLLECTION_ID || 'home_chef_dishes';
export const BUCKET_ID = process.env.EXPO_PUBLIC_BUCKET_ID || 'files';

// تهيئة العميل
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// تصدير الخدمات
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

console.log('✅ Appwrite initialized with:', {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: DATABASE_ID
});
