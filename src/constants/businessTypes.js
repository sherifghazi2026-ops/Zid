import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const BUSINESS_TYPES = [
  { id: 'restaurant', name: 'مطاعم', icon: 'restaurant-outline', color: '#EF4444' },
  { id: 'home_chef', name: 'أكل بيتي', icon: 'home-outline', color: '#F59E0B' }
];

export const getBusinessTypes = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .select('*')
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('order', { ascending: true });
    if (error) throw error;
    const otherServices = (data || []).map(service => ({
      id: service.id, name: service.name, icon: service.icon || 'apps-outline',
      color: service.color || '#6B7280', hasItems: service.has_items || false,
      type: service.type || 'service', is_active: service.is_active, is_visible: service.is_visible,
    }));
    return [...BUSINESS_TYPES, ...otherServices];
  } catch (error) {
    console.error('خطأ في جلب أنواع الأنشطة:', error);
    return BUSINESS_TYPES;
  }
};

export const getBusinessName = async (id) => {
  const types = await getBusinessTypes();
  return types.find(b => b.id === id)?.name || id;
};

export const getBusinessColor = async (id) => {
  const types = await getBusinessTypes();
  return types.find(b => b.id === id)?.color || '#6B7280';
};
