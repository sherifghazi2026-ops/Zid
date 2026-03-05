import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVICES_COLLECTION_ID = 'services';

// مفتاح تخزين الخدمات الأساسية
const CORE_SERVICES_STORAGE_KEY = 'core_services_state';

// الخدمات الأساسية (القيم الافتراضية)
const DEFAULT_CORE_SERVICES = [
  {
    id: 'restaurant',
    name: 'المطاعم',
    type: 'ai',
    icon: 'restaurant-outline',
    color: '#F59E0B',
    category: 'ai',
    isActive: true,
    isVisible: true,
    isCore: true,
    maintenanceText: 'جاري التحديث',
  },
  {
    id: 'home_chef',
    name: 'أكل بيتي',
    type: 'ai',
    icon: 'home-outline',
    color: '#EF4444',
    category: 'ai',
    isActive: true,
    isVisible: true,
    isCore: true,
    maintenanceText: 'جاري التحديث',
  }
];

// دالة لجلب الخدمات الأساسية من AsyncStorage
export const getCoreServices = async () => {
  try {
    const stored = await AsyncStorage.getItem(CORE_SERVICES_STORAGE_KEY);
    if (stored) {
      return { success: true, data: JSON.parse(stored) };
    }
    // إذا لم تكن مخزنة، نخزن القيم الافتراضية
    await AsyncStorage.setItem(CORE_SERVICES_STORAGE_KEY, JSON.stringify(DEFAULT_CORE_SERVICES));
    return { success: true, data: DEFAULT_CORE_SERVICES };
  } catch (error) {
    console.error('خطأ في جلب الخدمات الأساسية:', error);
    return { success: false, error: error.message, data: DEFAULT_CORE_SERVICES };
  }
};

// دالة لتحديث خدمة أساسية
export const updateCoreService = async (serviceId, updateData) => {
  try {
    // جلب الخدمات الحالية
    const { data: currentServices } = await getCoreServices();
    
    // تحديث الخدمة المطلوبة
    const updatedServices = currentServices.map(service => 
      service.id === serviceId ? { ...service, ...updateData } : service
    );
    
    // حفظ في AsyncStorage
    await AsyncStorage.setItem(CORE_SERVICES_STORAGE_KEY, JSON.stringify(updatedServices));
    
    return { success: true, data: updatedServices.find(s => s.id === serviceId) };
  } catch (error) {
    console.error('خطأ في تحديث الخدمة الأساسية:', error);
    return { success: false, error: error.message };
  }
};

// إعادة تعيين الخدمات الأساسية إلى الوضع الافتراضي
export const resetCoreServices = async () => {
  try {
    await AsyncStorage.setItem(CORE_SERVICES_STORAGE_KEY, JSON.stringify(DEFAULT_CORE_SERVICES));
    return { success: true, data: DEFAULT_CORE_SERVICES };
  } catch (error) {
    console.error('خطأ في إعادة تعيين الخدمات الأساسية:', error);
    return { success: false, error: error.message };
  }
};

export const getAllServices = async () => {
  try {
    // جلب الخدمات من Appwrite
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.orderAsc('order'), Query.orderAsc('name')]
    );
    
    // جلب الخدمات الأساسية من AsyncStorage
    const { data: coreServices } = await getCoreServices();
    
    // دمج الكل
    const allServices = [...coreServices, ...response.documents];
    
    return { success: true, data: allServices };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    // في حالة الفشل، نعيد الخدمات الأساسية على الأقل
    const { data: coreServices } = await getCoreServices();
    return { success: true, data: coreServices };
  }
};

// للصفحة الرئيسية - تجلب الخدمات المرئية فقط
export const getVisibleServicesForHome = async () => {
  try {
    // جلب الخدمات من Appwrite
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [
        Query.equal('isVisible', true),
        Query.orderAsc('order'),
        Query.orderAsc('name')
      ]
    );
    
    // جلب الخدمات الأساسية من AsyncStorage
    const { data: coreServices } = await getCoreServices();
    
    // تصفية الخدمات الأساسية المرئية
    const visibleCoreServices = coreServices.filter(s => s.isVisible === true);
    
    return { 
      success: true, 
      data: [...visibleCoreServices, ...response.documents] 
    };
  } catch (error) {
    console.error('خطأ في جلب الخدمات للصفحة الرئيسية:', error);
    // في حالة الفشل، نعيد الخدمات الأساسية المرئية على الأقل
    const { data: coreServices } = await getCoreServices();
    const visibleCoreServices = coreServices.filter(s => s.isVisible === true);
    return { success: true, data: visibleCoreServices };
  }
};

// للاستخدام العام - تجلب الخدمات المرئية والنشطة فقط
export const getVisibleServices = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [
        Query.equal('isVisible', true),
        Query.equal('isActive', true),
        Query.orderAsc('order'),
        Query.orderAsc('name')
      ]
    );
    
    // جلب الخدمات الأساسية من AsyncStorage
    const { data: coreServices } = await getCoreServices();
    
    // تصفية الخدمات الأساسية النشطة والمرئية
    const activeCoreServices = coreServices.filter(s => s.isActive === true && s.isVisible === true);
    
    return { 
      success: true, 
      data: [...activeCoreServices, ...response.documents] 
    };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message };
  }
};

export const getServiceById = async (serviceId) => {
  try {
    // البحث في الخدمات الأساسية أولاً
    const { data: coreServices } = await getCoreServices();
    const coreService = coreServices.find(s => s.id === serviceId);
    if (coreService) {
      return { success: true, data: coreService };
    }
    
    // ثم البحث في قاعدة البيانات
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.equal('id', serviceId), Query.limit(1)]
    );
    return {
      success: true,
      data: response.documents.length > 0 ? response.documents[0] : null
    };
  } catch (error) {
    console.error('خطأ في جلب الخدمة:', error);
    return { success: false, error: error.message };
  }
};

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
      screen: serviceData.screen || 'ServiceScreen',
      icon: serviceData.icon || 'apps-outline',
      color: serviceData.color || '#6B7280',
      category: serviceData.category || 'other',
      isActive: serviceData.isActive !== false,
      isVisible: serviceData.isVisible !== false,
      isCore: false,
      hasItems: serviceData.hasItems || false,
      imageUrl: serviceData.imageUrl || null,
      maintenanceText: serviceData.maintenanceText || 'جاري التحديث',
      order: serviceData.order || 0,
      createdAt: new Date().toISOString(),
    };

    console.log('📦 بيانات الخدمة المحفوظة:', newService);

    const response = await databases.createDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      ID.unique(),
      newService
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في إنشاء الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const updateService = async (serviceDocId, updateData) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceDocId,
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث الخدمة:', error);
    return { success: false, error: error.message };
  }
};

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

export const toggleServiceStatus = async (serviceDocId, isActive) => {
  return updateService(serviceDocId, { isActive });
};

export const toggleServiceVisibility = async (serviceDocId, isVisible) => {
  return updateService(serviceDocId, { isVisible });
};

export const initializeCoreServices = async () => {
  try {
    const services = await getAllServices();
    console.log('📋 الخدمات الموجودة:', services.data.map(s => s.id));
    return { success: true };
  } catch (error) {
    console.error('خطأ في تهيئة الخدمات:', error);
    return { success: false };
  }
};
