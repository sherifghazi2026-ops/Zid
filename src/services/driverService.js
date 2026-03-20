import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const getAvailableDrivers = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('role', 'driver')
      .eq('active', true)
      .eq('is_available', true)
      .limit(50);

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      id: item.id,
      name: item.full_name || item.name,
      full_name: item.full_name,
      phone: item.phone,
      is_available: item.is_available,
      service_area: item.service_area,
      max_delivery_radius: item.max_delivery_radius,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب المناديب:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const updateDriverAvailability = async (driverId, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        is_available: data.is_available,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في تحديث حالة المندوب:', error);
    return { success: false, error: error.message };
  }
};
