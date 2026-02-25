import { databases, DATABASE_ID, storage, BUCKET_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const SERVICES_COLLECTION_ID = 'services';

// أنواع الخدمات (لكل خدمة طريقة عرض مختلفة)
export const SERVICE_TYPES = {
  TEXT_ONLY: 'text_only',
  ITEMS_WITH_COUNTER: 'items_counter',
  WITH_IMAGES: 'with_images',
  WITH_VOICE: 'with_voice',
  PHARMACY: 'pharmacy',
};

// الخدمات الافتراضية
export const DEFAULT_SERVICES = [
  { 
    id: 'supermarket', 
    name: 'سوبر ماركت', 
    icon: 'basket-outline', 
    screen: 'Grocery', 
    isActive: true, 
    isVisible: true,
    order: 1,
    type: 'text_only',
    hasVoice: true,
    hasImages: false,
    description: 'طلب منتجات السوبر ماركت',
    color: '#F59E0B'
  },
  { 
    id: 'restaurant', 
    name: 'مطاعم', 
    icon: 'restaurant-outline', 
    screen: 'Restaurant', 
    isActive: true, 
    isVisible: true,
    order: 2,
    type: 'text_only',
    hasVoice: true,
    hasImages: false,
    description: 'طلب من المطاعم',
    color: '#EF4444'
  },
  { 
    id: 'pharmacy', 
    name: 'صيدليات', 
    icon: 'medical-outline', 
    screen: 'Pharmacy', 
    isActive: true, 
    isVisible: true,
    order: 3,
    type: 'pharmacy',
    hasVoice: true,
    hasImages: true,
    requiresPrescription: true,
    description: 'طلب أدوية بروشتة',
    color: '#10B981'
  },
  { 
    id: 'ironing', 
    name: 'مكوجي', 
    icon: 'shirt-outline', 
    screen: 'Ironing', 
    isActive: true, 
    isVisible: true,
    order: 4,
    type: 'items_counter',
    hasVoice: true,
    hasImages: false,
    description: 'خدمة كي الملابس',
    color: '#3B82F6'
  },
  { 
    id: 'plumbing', 
    name: 'سباكة', 
    icon: 'water-outline', 
    screen: 'Plumbing', 
    isActive: true, 
    isVisible: true,
    order: 5,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'خدمات السباكة',
    color: '#3B82F6'
  },
  { 
    id: 'kitchen', 
    name: 'مطابخ', 
    icon: 'restaurant-outline', 
    screen: 'Kitchen', 
    isActive: true, 
    isVisible: true,
    order: 6,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'تصميم وتصنيع المطابخ',
    color: '#8B5CF6'
  },
  { 
    id: 'carpentry', 
    name: 'نجارة', 
    icon: 'hammer-outline', 
    screen: 'Carpentry', 
    isActive: true, 
    isVisible: true,
    order: 7,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'أعمال النجارة',
    color: '#8B5CF6'
  },
  { 
    id: 'marble', 
    name: 'رخام', 
    icon: 'apps-outline', 
    screen: 'Marble', 
    isActive: true, 
    isVisible: true,
    order: 8,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'تركيب وتلميع الرخام',
    color: '#EC4899'
  },
  { 
    id: 'winch', 
    name: 'ونش', 
    icon: 'car-outline', 
    screen: 'Winch', 
    isActive: true, 
    isVisible: true,
    order: 9,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'خدمات الونش والنقل',
    color: '#EC4899'
  },
  { 
    id: 'electrician', 
    name: 'كهربائي', 
    icon: 'flash-outline', 
    screen: 'Electrician', 
    isActive: true, 
    isVisible: true,
    order: 10,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'أعمال الكهرباء',
    color: '#F59E0B'
  },
  { 
    id: 'moving', 
    name: 'نقل اثاث', 
    icon: 'cube-outline', 
    screen: 'Moving', 
    isActive: true, 
    isVisible: true,
    order: 11,
    type: 'text_only',
    hasVoice: true,
    hasImages: true,
    description: 'نقل الأثاث',
    color: '#F59E0B'
  },
];

// تهيئة الخدمات
export const initializeServices = async () => {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.limit(1)]
    );

    if (existing.documents.length === 0) {
      for (const service of DEFAULT_SERVICES) {
        await databases.createDocument(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          ID.unique(),
          {
            ...service,
            updatedAt: new Date().toISOString()
          }
        );
      }
      console.log('✅ تم تهيئة الخدمات الافتراضية');
    }
  } catch (error) {
    console.error('خطأ في تهيئة الخدمات:', error);
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
    return { success: false, error: error.message };
  }
};

// جلب الخدمات الظاهرة فقط (للعملاء) - مع مراعاة isVisible
export const getVisibleServices = async () => {
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
    console.error('خطأ في جلب الخدمات الظاهرة:', error);
    return { success: false, error: error.message };
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
    return { 
      success: true, 
      data: response.documents.length > 0 ? response.documents[0] : null 
    };
  } catch (error) {
    console.error('خطأ في جلب الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// تحديث حالة الخدمة (تفعيل/تعطيل)
export const toggleServiceStatus = async (serviceId, isActive) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceId,
      { 
        isActive,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث حالة الخدمة:', error);
    return { success: false, error: error.message };
  }
};

// تحديث حالة الظهور (إخفاء/إظهار)
export const toggleServiceVisibility = async (serviceId, isVisible) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceId,
      { 
        isVisible,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('خطأ في تحديث ظهور الخدمة:', error);
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
      icon: serviceData.icon || 'construct-outline',
      screen: 'DynamicService',
      isActive: true,
      isVisible: true,
      order: serviceData.order || 999,
      type: serviceData.type || 'text_only',
      hasVoice: serviceData.hasVoice !== false,
      hasImages: serviceData.hasImages || false,
      requiresPrescription: serviceData.requiresPrescription || false,
      description: serviceData.description || '',
      color: serviceData.color || '#6B7280',
      imageUrl: serviceData.imageUrl || null,
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
    console.error('خطأ في إنشاء الخدمة:', error);
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
