import { databases, DATABASE_ID, SERVICES_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// ✅ تعريف أنواع الخدمات
export const SERVICE_TYPES = {
  REGULAR: 'regular',        // خدمة عادية (نص + صوت + صور) -> ServiceScreen
  ITEMS_SERVICE: 'items_service', // خدمة بأصناف (مكوجي) -> ItemsServiceScreen
  ITEMS: 'items',            // خدمة بمنتجات (مطاعم) -> MerchantsListScreen
  PRODUCTS: 'products',      // خدمة بمنتجات (سوبر ماركت) -> ProductsServiceScreen
  AI: 'ai'                   // خدمة ذكاء اصطناعي -> AiMainModal
};

// ✅ الخدمات الأساسية
export const CORE_SERVICES = [
  {
    id: 'restaurant',
    name: 'مطاعم',
    type: SERVICE_TYPES.ITEMS,
    icon: 'restaurant-outline',
    color: '#EF4444',
    isActive: true,
    isVisible: true,
    hasItems: true,
    itemsCollection: 'dishes',
    subServices: [],
    merchantRole: 'merchant',
    merchantType: 'restaurant',
    order: 1,
    isCore: false
  },
  {
    id: 'home_chef',
    name: 'أكل بيتي',
    type: SERVICE_TYPES.ITEMS,
    icon: 'home-outline',
    color: '#F59E0B',
    isActive: true,
    isVisible: true,
    hasItems: true,
    itemsCollection: 'home_chef_dishes',
    subServices: [],
    merchantRole: 'merchant',
    merchantType: 'home_chef',
    order: 2,
    isCore: false
  }
];

// تهيئة الخدمات الأساسية
export const initializeCoreServices = async () => {
  try {
    console.log('🚀 تهيئة الخدمات الأساسية...');

    for (const service of CORE_SERVICES) {
      const existing = await databases.listDocuments(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        [Query.equal('id', service.id)]
      );

      if (existing.documents.length === 0) {
        console.log(`➕ إضافة ${service.name} إلى Appwrite...`);
        await databases.createDocument(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          ID.unique(),
          {
            ...service,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
        console.log(`✅ تم إضافة ${service.name}`);
      } else {
        console.log(`✅ ${service.name} موجودة بالفعل`);
      }
    }

    console.log('✅ تم تهيئة الخدمات الأساسية');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في تهيئة الخدمات:', error);
    return { success: false, error: error.message };
  }
};

// جلب جميع الخدمات
export const getAllServices = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.orderAsc('order')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب الخدمات الظاهرة
export const getVisibleServicesForHome = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [
        Query.equal('isVisible', true),
        Query.orderAsc('order')
      ]
    );

    const servicesWithDefaults = response.documents.map(service => ({
      ...service,
      itemsCollection: service.itemsCollection || null,
      subServices: service.subServices || []
    }));

    return { success: true, data: servicesWithDefaults };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب خدمة واحدة
export const getServiceById = async (serviceId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.equal('id', serviceId), Query.limit(1)]
    );
    if (response.documents.length > 0) {
      const service = response.documents[0];
      service.itemsCollection = service.itemsCollection || null;
      service.subServices = service.subServices || [];
      return { success: true, data: service };
    }
    return { success: false, error: 'الخدمة غير موجودة' };
  } catch (error) {
    console.error('خطأ في جلب الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// جلب خدمة بمعرف المستند
export const getServiceByDocId = async (docId) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      docId
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في جلب الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// إنشاء خدمة جديدة
export const createService = async (serviceData) => {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.equal('id', serviceData.id)]
    );

    if (existing.documents.length > 0) {
      return { success: false, error: 'هذا المعرف موجود بالفعل' };
    }

    // ✅ تحديد الشاشة المناسبة
    let screen = 'ServiceScreen'; // الخدمة العادية (نص + صوت + صور)
    
    switch(serviceData.type) {
      case SERVICE_TYPES.ITEMS_SERVICE:
        screen = 'ItemsServiceScreen';
        break;
      case SERVICE_TYPES.ITEMS:
        screen = 'MerchantsListScreen';
        break;
      case SERVICE_TYPES.PRODUCTS:
        screen = 'ProductsServiceScreen';
        break;
      case SERVICE_TYPES.AI:
        screen = 'AiMainModal';
        break;
      default:
        screen = 'ServiceScreen'; // ✅ الخدمة العادية
    }

    let itemsCollection = serviceData.itemsCollection || null;
    if (serviceData.type === SERVICE_TYPES.ITEMS_SERVICE && !itemsCollection) {
      itemsCollection = `${serviceData.id}_items`;
    } else if (serviceData.type === SERVICE_TYPES.ITEMS && !itemsCollection) {
      itemsCollection = `service_${serviceData.id}_items`;
    } else if (serviceData.type === SERVICE_TYPES.PRODUCTS && !itemsCollection) {
      itemsCollection = `products_${serviceData.id}`;
    }

    const newService = {
      id: serviceData.id,
      name: serviceData.name,
      type: serviceData.type || SERVICE_TYPES.REGULAR,
      screen: screen,
      icon: serviceData.icon || 'apps-outline',
      color: serviceData.color || '#6B7280',
      category: serviceData.category || 'other',
      isActive: serviceData.isActive !== false,
      isVisible: serviceData.isVisible !== false,
      hasItems: serviceData.hasItems || serviceData.type === SERVICE_TYPES.ITEMS || serviceData.type === SERVICE_TYPES.ITEMS_SERVICE || serviceData.type === SERVICE_TYPES.PRODUCTS,
      hasPickup: serviceData.hasPickup || false,
      itemsCollection: itemsCollection,
      subServices: serviceData.subServices || [],
      imageUrl: serviceData.imageUrl || null,
      maintenanceText: serviceData.maintenanceText || 'جاري التحديث',
      order: serviceData.order || 0,
      merchantRole: serviceData.merchantRole || 'merchant',
      merchantType: serviceData.merchantType || null,
      responseMessage: serviceData.responseMessage || 'سيتم التواصل معك قريباً',
      isCore: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('📦 إنشاء خدمة جديدة:', newService);

    const response = await databases.createDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      ID.unique(),
      newService
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// تحديث خدمة
export const updateService = async (serviceDocId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceDocId,
      {
        ...updateData,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// تفعيل/تعطيل خدمة
export const toggleServiceStatus = async (serviceDocId, isActive) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceDocId,
      { isActive, updatedAt: new Date().toISOString() }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تغيير حالة الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// إظهار/إخفاء خدمة
export const toggleServiceVisibility = async (serviceDocId, isVisible) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceDocId,
      { isVisible, updatedAt: new Date().toISOString() }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تغيير ظهور الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// حذف خدمة
export const deleteService = async (serviceDocId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceDocId
    );
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الخدمة:', error);
    return { success: false, error: error.message };
  }
};
