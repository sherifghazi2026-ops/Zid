export const licensedRestaurants = [
  { id: 'r1', name: 'بيتزا زايد', cuisine: ['بيتزا', 'باستا'], address: 'الحي الثالث', phone: '01001234567', rating: 4.8, deliveryTime: '30-45', priceRange: 'متوسط',
    menu: [{ name: 'بيتزا مارجريتا', price: 85 }, { name: 'بيتزا بيبروني', price: 95 }] },
  { id: 'r2', name: 'سندوتشات وكبدة أبو طارق', cuisine: ['كبدة', 'سجق'], address: 'الحي الرابع', phone: '01012345678', rating: 4.9, deliveryTime: '20-35', priceRange: 'اقتصادي',
    menu: [{ name: 'سندوتش كبدة', price: 40 }, { name: 'سندوتش سجق', price: 45 }] },
  { id: 'r3', name: 'المشويات الملكية', cuisine: ['مشويات', 'كباب'], address: 'الحي الخامس', phone: '01023456789', rating: 4.7, deliveryTime: '40-55', priceRange: 'مرتفع',
    menu: [{ name: 'كفتة مشوية', price: 120 }, { name: 'كباب', price: 150 }] },
];

export const getRestaurantsByCuisine = (cuisineType) => licensedRestaurants.filter(r => r.cuisine.some(c => c.includes(cuisineType)));
export const getRestaurantsByPrice = (priceRange) => licensedRestaurants.filter(r => r.priceRange === priceRange);
export const getTopRatedRestaurants = () => licensedRestaurants.filter(r => r.rating >= 4.7);
export const getRestaurantById = (id) => licensedRestaurants.find(r => r.id === id);
export const searchRestaurants = (keyword) => licensedRestaurants.filter(r => r.name.includes(keyword) || r.cuisine.some(c => c.includes(keyword)));
export default licensedRestaurants;
