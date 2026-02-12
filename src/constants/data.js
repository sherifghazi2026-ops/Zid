export const categories = [
  { id: '1', name: 'مطابخ', icon: 'restaurant', colorKey: 'مطابخ', description: 'تصميم وتصنيع' },
  { id: '2', name: 'سباكة', icon: 'water', colorKey: 'سباكة', description: 'إصلاح وتركيب' },
  { id: '3', name: 'رخام', icon: 'square', colorKey: 'رخام', description: 'تركيب وتلميع' },
  { id: '4', name: 'نجارة', icon: 'hammer', colorKey: 'نجارة', description: 'أثاث وديكور', customIcon: require('../../assets/wood.png') },
  { id: '5', name: 'مطاعم', icon: 'pizza', colorKey: 'مطاعم', description: 'وجبات وكافيهات' },
  { id: '6', name: 'بقاله', icon: 'basket', colorKey: 'بقاله', description: 'بقالات وسوبرماركت' },
  { id: '7', name: 'أثاث', icon: 'bed', colorKey: 'أثاث', description: 'أثاث منزلي ومكتبي' },
];

export const quickServices = [
  { id: '1', title: 'بقالة الخير', category: 'بقاله', icon: 'basket', time: '٣٠ دقيقة', price: '٢٥ ج.م' },
  { id: '2', title: 'سباكة المحترف', category: 'سباكة', icon: 'water', time: '٤٥ دقيقة', price: '٥٠ ج.م' },
  { id: '3', title: 'مطعم الذواق', category: 'مطاعم', icon: 'pizza', time: '٤٥ دقيقة', price: '٤٠ ج.م' },
  { id: '4', title: 'نجارة الأثاث', category: 'نجارة', icon: 'hammer', time: 'ساعتين', price: '١٢٠ ج.م' },
  { id: '5', title: 'رخام الشرق', category: 'رخام', icon: 'square', time: '٣ ساعات', price: '٢٠٠ ج.م' },
  { id: '6', title: 'مطابخ حديثة', category: 'مطابخ', icon: 'restaurant', time: '٤ ساعات', price: '٣٠٠ ج.م' },
];

export const serviceProviders = {
  مطابخ: [
    { id: 1, name: 'مطابخ حديثة', phone: '01012345678', rating: 4.5, experience: '١٠ سنوات' },
    { id: 2, name: 'ألوان للمطابخ', phone: '01087654321', rating: 4.8, experience: '١٥ سنة' },
  ],
  سباكة: [
    { id: 3, name: 'سباكة المحترف', phone: '01234567890', rating: 4.7, experience: '١٢ سنة' },
    { id: 4, name: 'أبو علي للسباكة', phone: '01555555555', rating: 4.9, experience: '٢٠ سنة' },
  ],
  رخام: [
    { id: 5, name: 'رخام الشرق', phone: '01111111111', rating: 4.6, experience: '١٨ سنة' },
  ],
  نجارة: [
    { id: 6, name: 'نجارة الأثاث', phone: '01099999999', rating: 4.8, experience: '٢٢ سنة' },
  ],
  مطاعم: [
    { id: 7, name: 'مطعم الذواق', phone: '01577777777', rating: 4.9, experience: '٨ سنوات' },
  ],
  بقاله: [
    { id: 8, name: 'بقالة الخير', phone: '01211111111', rating: 4.8, experience: '١٠ سنوات' },
    { id: 9, name: 'سوبر ماركت زايد', phone: '01044444444', rating: 4.9, experience: '٧ سنوات' },
  ],
  أثاث: [
    { id: 10, name: 'معرض الأثاث', phone: '01166666666', rating: 4.7, experience: '١٢ سنة' },
  ],
};
