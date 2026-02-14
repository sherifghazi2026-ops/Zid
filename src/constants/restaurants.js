// ملف بيانات مطاعم الشيخ زايد المرخصة
// جميع المطاعم المذكورة حاصلة على تراخيص صحية وشهادات كاترينج

export const licensedRestaurants = [
  {
    id: 'r1',
    name: 'بيتزا زايد',
    cuisine: ['بيتزا', 'باستا', 'سندوتشات'],
    location: { lat: 30.019, lng: 31.017 },
    address: 'الحي الثالث - مول سيتي سكيب',
    phone: '01001234567',
    rating: 4.8,
    healthLicense: true,
    cateringCert: true,
    deliveryTime: '30-45 دقيقة',
    priceRange: 'متوسط',
    menu: [
      { name: 'بيتزا مارجريتا', price: 85, options: ['صوص إضافي', 'جبنة إضافية'] },
      { name: 'بيتزا بيبروني', price: 95, options: ['صوص إضافي', 'فلفل حار'] },
      { name: 'باستا ألفريدو', price: 70, options: ['دجاج', 'مشروم'] },
      { name: 'سندوتش برجر', price: 55, options: ['عيش برجر', 'جبنة', 'كاتشب'] }
    ],
    features: ['توصيل مجاني للطلبات فوق 200 ج', 'منطقة عائلية', 'دفع إلكتروني']
  },
  {
    id: 'r2',
    name: 'سندوتشات وكبدة أبو طارق',
    cuisine: ['كبدة', 'سجق', 'مخ', 'سندوتشات'],
    location: { lat: 30.021, lng: 31.020 },
    address: 'الحي الرابع - شارع النخيل',
    phone: '01012345678',
    rating: 4.9,
    healthLicense: true,
    cateringCert: true,
    deliveryTime: '20-35 دقيقة',
    priceRange: 'اقتصادي',
    menu: [
      { name: 'سندوتش كبدة', price: 40, options: ['عيش فينو', 'عيش بلدي', 'طحينة'] },
      { name: 'سندوتش سجق', price: 45, options: ['عيش فينو', 'سجق إضافي'] },
      { name: 'كبدة بالعيش البلدي', price: 60, options: ['بصل', 'فلفل', 'طحينة'] },
      { name: 'ساندوتش كبدة دبل', price: 70, options: ['صوص ثومية', 'بصل'] }
    ],
    features: ['توصيل سريع', 'مفتوح 24 ساعة', 'مناسب للطلبات الكبيرة']
  },
  {
    id: 'r3',
    name: 'المشويات الملكية',
    cuisine: ['مشويات', 'كفتة', 'كباب', 'فراخ'],
    location: { lat: 30.025, lng: 31.025 },
    address: 'الحي الخامس - مول الشيخ زايد',
    phone: '01023456789',
    rating: 4.7,
    healthLicense: true,
    cateringCert: true,
    deliveryTime: '40-55 دقيقة',
    priceRange: 'مرتفع',
    menu: [
      { name: 'كفتة مشوية', price: 120, options: ['أرز', 'خبز', 'سلطة'] },
      { name: 'كباب', price: 150, options: ['أرز', 'خبز', 'مشروم'] },
      { name: 'فراخ مشوية', price: 90, options: ['أرز', 'خبز', 'بطاطس'] },
      { name: 'طبق مشويات مشكل', price: 250, options: ['لحم', 'فراخ', 'كفتة'] }
    ],
    features: ['شوي على الفحم', 'لحوم طازجة', 'مناسب للعزائم']
  },
  {
    id: 'r4',
    name: 'بيتزا وكريب زايد الجديدة',
    cuisine: ['بيتزا', 'كريب', 'سندوتشات'],
    location: { lat: 30.018, lng: 31.015 },
    address: 'الحي الثاني - شارع 26',
    phone: '01034567890',
    rating: 4.6,
    healthLicense: true,
    cateringCert: true,
    deliveryTime: '25-40 دقيقة',
    priceRange: 'اقتصادي',
    menu: [
      { name: 'كريب حادق', price: 50, options: ['جبنة', 'فراخ', 'تونة'] },
      { name: 'بيتزا خضار', price: 75, options: ['زيتون', 'مشروم', 'فلفل'] },
      { name: 'سندوتش شاورما', price: 55, options: ['عيش فينو', 'عيش بلدي', 'صوص'] },
      { name: 'كريب نوتيلا', price: 45, options: ['موز', 'فراولة'] }
    ],
    features: ['عروض أسبوعية', 'مناسب للأطفال', 'توصيل مجاني']
  },
  {
    id: 'r5',
    name: 'سمك و بحريات زايد',
    cuisine: ['سمك', 'جمبري', 'مأكولات بحرية'],
    location: { lat: 30.022, lng: 31.028 },
    address: 'الحي السادس - شارع البحر',
    phone: '01045678901',
    rating: 4.8,
    healthLicense: true,
    cateringCert: true,
    deliveryTime: '35-50 دقيقة',
    priceRange: 'مرتفع',
    menu: [
      { name: 'سمك مشوي', price: 140, options: ['أرز', 'سلطة'] },
      { name: 'جمبري', price: 180, options: ['أرز', 'بطاطس'] },
      { name: 'كاليماري', price: 120, options: ['صوص'] },
      { name: 'طبق مكس بحري', price: 220, options: ['أرز', 'خبز'] }
    ],
    features: ['أسماك طازجة', 'منتجعات صحية', 'صحي']
  }
];

// دالة لجلب المطاعم حسب نوع الأكل
export const getRestaurantsByCuisine = (cuisineType) => {
  return licensedRestaurants.filter(r => 
    r.cuisine.some(c => c.includes(cuisineType))
  );
};

// دالة لجلب المطاعم حسب السعر
export const getRestaurantsByPrice = (priceRange) => {
  return licensedRestaurants.filter(r => r.priceRange === priceRange);
};

// دالة لجلب المطاعم حسب التقييم (أعلى من 4.5)
export const getTopRatedRestaurants = () => {
  return licensedRestaurants.filter(r => r.rating >= 4.7);
};

// دالة لجلب مطعم معين بالـ ID
export const getRestaurantById = (id) => {
  return licensedRestaurants.find(r => r.id === id);
};

// دالة للبحث عن مطاعم حسب الكلمة المفتاحية
export const searchRestaurants = (keyword) => {
  const lowerKeyword = keyword.toLowerCase();
  return licensedRestaurants.filter(r => 
    r.name.toLowerCase().includes(lowerKeyword) ||
    r.cuisine.some(c => c.toLowerCase().includes(lowerKeyword)) ||
    r.menu.some(item => item.name.toLowerCase().includes(lowerKeyword))
  );
};

export default licensedRestaurants;
