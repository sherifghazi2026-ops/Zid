import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const RESTAURANTS_COLLECTION_ID = TABLES.RESTAURANTS;

export const getRestaurantByMerchantId = async (merchantId) => {
  try {
    const { data, error } = await supabase
      .from(RESTAURANTS_COLLECTION_ID)
      .select('*')
      .eq('merchant_id', merchantId)
      .single();
    if (error?.code === 'PGRST116') return { success: false, error: 'لا يوجد مطعم مرتبط' };
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getActiveRestaurants = async () => {
  try {
    const { data, error } = await supabase
      .from(RESTAURANTS_COLLECTION_ID)
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return { success: true, data: (data || []).map(item => ({ $id: item.id, ...item })) };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
