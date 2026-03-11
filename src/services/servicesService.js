import { databases, DATABASE_ID, SERVICES_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// الخدمات الثابتة (مطاعم وأكل بيتي)
export const CORE_SERVICES = [
  {
    id: 'restaurant',
    name: 'مطاعم',
    type: 'ai',
    icon: 'restaurant-outline',
    color: '#EF4444',
    isActive: true,
    isVisible: true,
    hasItems: true,
    itemsCollection: 'dishes',
    merchantRole: 'merchant',
    merchantType: 'restaurant',
    order: 1,
    isCore: true
  },
  {
    id: 'home_chef',
    name: 'أكل بيتي',
    type: 'ai',
    icon: 'home-outline',
    color: '#F59E0B',
    isActive: true,
    isVisible: true,
    hasItems: true,
    itemsCollection: 'home_chef_dishes',
    merchantRole: 'merchant',
    merchantType: 'home_chef',
    order: 2,
    isCore: true
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

// جلب الخدمات الظاهرة في الصفحة الرئيسية
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
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب خدمة واحدة بالـ id
export const getServiceById = async (serviceId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.equal('id', serviceId), Query.limit(1)]
    );
    if (response.documents.length > 0) {
      return { success: true, data: response.documents[0] };
    }
    return { success: false, error: 'الخدمة غير موجودة' };
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

    const newService = {
      id: serviceData.id,
      name: serviceData.name,
      type: serviceData.type || 'service',
      icon: serviceData.icon || 'apps-outline',
      color: serviceData.color || '#6B7280',
      category: serviceData.category || 'other',
      isActive: serviceData.isActive !== false,
      isVisible: serviceData.isVisible !== false,
      hasItems: serviceData.hasItems || false,
      screen: serviceData.screen || 'ServiceScreen',
      imageUrl: serviceData.imageUrl || null,
      maintenanceText: serviceData.maintenanceText || 'جاري التحديث',
      order: serviceData.order || 0,
      // حقول إضافية للخدمات بأصناف ومنتجات
      itemsCollection: serviceData.itemsCollection || null,
      merchantRole: serviceData.merchantRole || 'merchant',
      merchantType: serviceData.merchantType || null,
      // 👇 الخدمات الفرعية (مهم جداً)
      subServices: serviceData.subServices || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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

// تحديث خدمة أساسية
export const updateCoreService = async (serviceId, updateData) => {
  try {
    const services = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.equal('id', serviceId)]
    );

    if (services.documents.length === 0) {
      return { success: false, error: 'الخدمة غير موجودة' };
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      services.documents[0].$id,
      {
        ...updateData,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الخدمة الأساسية:', error);
    return { success: false, error: error.message };
  }
};
