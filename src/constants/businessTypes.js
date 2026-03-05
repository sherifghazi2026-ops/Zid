import { databases, DATABASE_ID } from '../appwrite/config';
import { SERVICES_COLLECTION_ID } from '../services/servicesService';
import { Query } from 'appwrite';

// المطاعم فقط ثابتة (لأنها AI)
const RESTAURANT_ONLY = [
  {
    id: 'restaurant',
    name: 'مطاعم',
    icon: 'restaurant-outline',
    color: '#EF4444'
  }
];

// دالة لجلب جميع الخدمات الأخرى (غير المطاعم) من Appwrite
export const getBusinessTypes = async () => {
  try {
    // جلب كل الخدمات ما عدا المطاعم
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.notEqual('id', 'restaurant'), // استثني المطاعم
        Query.orderAsc('name')
      ]
    );
    
    // تحويل الخدمات إلى نفس شكل BUSINESS_TYPES
    const otherServices = response.documents.map(service => ({
      id: service.id,
      name: service.name,
      icon: service.icon || 'business-outline',
      color: service.color || '#6B7280'
    }));
    
    // دمج المطاعم مع الخدمات الأخرى
    return [...RESTAURANT_ONLY, ...otherServices];
  } catch (error) {
    console.error('خطأ في جلب أنواع الأنشطة:', error);
    return RESTAURANT_ONLY; // لو فشل، أرجع المطاعم على الأقل
  }
};

// دالة مساعدة لجلب اسم النشاط بالعربي
export const getBusinessName = async (id) => {
  const types = await getBusinessTypes();
  const business = types.find(b => b.id === id);
  return business ? business.name : id;
};

// دالة مساعدة لجلب لون النشاط
export const getBusinessColor = async (id) => {
  const types = await getBusinessTypes();
  const business = types.find(b => b.id === id);
  return business ? business.color : '#6B7280';
};

// للاستخدام في الأماكن التي لا تدعم async
export const BUSINESS_TYPES = RESTAURANT_ONLY; // احتفظ بالقديم للتوافق
