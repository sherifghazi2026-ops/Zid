// المطاعم وأكل بيتي فقط (لأنهم AI)
export const BUSINESS_TYPES = [
  {
    id: 'restaurant',
    name: 'مطاعم',
    icon: 'restaurant-outline',
    color: '#EF4444'
  },
  {
    id: 'home_chef',
    name: 'أكل بيتي',
    icon: 'home-outline',
    color: '#F59E0B'
  }
];

// دالة لجلب الخدمات من Appwrite (للمكوجي والخدمات اللي ليها أصناف)
export const getBusinessTypes = async () => {
  try {
    const { databases, DATABASE_ID } = require('../appwrite/config');
    const { SERVICES_COLLECTION_ID } = require('../services/servicesService');
    const { Query } = require('appwrite');

    // جلب الخدمات النشطة والمرئية
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.equal('isVisible', true),
        Query.orderAsc('order')
      ]
    );

    // تحويل الخدمات إلى نفس الشكل
    const otherServices = response.documents.map(service => ({
      id: service.id,
      name: service.name,
      icon: service.icon || 'apps-outline',
      color: service.color || '#6B7280',
      hasItems: service.hasItems || false,
      type: service.type || 'service',
      isActive: service.isActive,
      isVisible: service.isVisible,
    }));

    // دمج المطاعم وأكل بيتي مع الخدمات الأخرى
    return [...BUSINESS_TYPES, ...otherServices];
  } catch (error) {
    console.error('خطأ في جلب أنواع الأنشطة:', error);
    return BUSINESS_TYPES; // لو فشل، أرجع المطاعم وأكل بيتي بس
  }
};

export const getBusinessName = async (id) => {
  const types = await getBusinessTypes();
  const business = types.find(b => b.id === id);
  return business ? business.name : id;
};

export const getBusinessColor = async (id) => {
  const types = await getBusinessTypes();
  const business = types.find(b => b.id === id);
  return business ? business.color : '#6B7280';
};
