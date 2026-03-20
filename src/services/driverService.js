import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const getAvailableDrivers = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('role', 'driver')
      .eq('active', true)
      .eq('is_available', true);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const updateDriverAvailability = async (driverId, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', driverId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
