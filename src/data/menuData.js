export const restaurants = [
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
    menu: [
      { name: 'بيتزا مارجريتا', price: 85, options: ['صوص إضافي', 'جبنة إضافية'] },
      { name: 'بيتزا بيبروني', price: 95, options: ['صوص إضافي', 'فلفل حار'] }
    ]
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
    menu: [
      { name: 'سندوتش كبدة', price: 40, options: ['عيش فينو', 'عيش بلدي', 'طحينة'] },
      { name: 'سندوتش سجق', price: 45, options: ['عيش فينو', 'سجق إضافي'] }
    ]
  }
];

export const getLicensedRestaurants = () => {
  return restaurants.filter(r => r.healthLicense && r.cateringCert);
};
