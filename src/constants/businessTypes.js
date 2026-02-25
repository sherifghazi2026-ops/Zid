// قائمة الأنشطة التجارية المدعومة في التطبيق
export const BUSINESS_TYPES = [
  { 
    id: 'supermarket', 
    name: 'سوبر ماركت', 
    icon: 'basket-outline',
    color: '#F59E0B'
  },
  { 
    id: 'restaurant', 
    name: 'مطاعم', 
    icon: 'restaurant-outline',
    color: '#EF4444'
  },
  { 
    id: 'pharmacy', 
    name: 'صيدليات', 
    icon: 'medical-outline',
    color: '#10B981'
  },
  { 
    id: 'ironing', 
    name: 'مكوجي', 
    icon: 'shirt-outline',
    color: '#3B82F6'
  },
  { 
    id: 'kitchen', 
    name: 'مطابخ', 
    icon: 'restaurant-outline',
    color: '#8B5CF6'
  },
  { 
    id: 'winch', 
    name: 'ونش', 
    icon: 'car-outline',
    color: '#EC4899'
  },
  { 
    id: 'electrician', 
    name: 'كهربائي', 
    icon: 'flash-outline',
    color: '#F59E0B'
  },
  { 
    id: 'plumbing', 
    name: 'سباكة', 
    icon: 'water-outline',
    color: '#3B82F6'
  },
  { 
    id: 'carpentry', 
    name: 'نجارة', 
    icon: 'hammer-outline',
    color: '#8B5CF6'
  },
  { 
    id: 'marble', 
    name: 'رخام', 
    icon: 'apps-outline',
    color: '#EC4899'
  },
  { 
    id: 'moving', 
    name: 'نقل اثاث', 
    icon: 'cube-outline',
    color: '#F59E0B'
  },
];

// دالة مساعدة لجلب اسم النشاط بالعربي
export const getBusinessName = (id) => {
  const business = BUSINESS_TYPES.find(b => b.id === id);
  return business ? business.name : id;
};

// دالة مساعدة لجلب لون النشاط
export const getBusinessColor = (id) => {
  const business = BUSINESS_TYPES.find(b => b.id === id);
  return business ? business.color : '#6B7280';
};

export default BUSINESS_TYPES;
