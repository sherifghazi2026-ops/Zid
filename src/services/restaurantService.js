import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const RESTAURANTS_COLLECTION_ID = TABLES.RESTAURANTS;

export const getRestaurantByMerchantId = async (merchantId) => {
  try {
    const { data, error } = await supabase
      .from(RESTAURANTS_COLLECTION_ID)
      .select('*')
      .eq('merchant_id', merchantId)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'لا يوجد مطعم مرتبط' };
      }
      throw error;
    }

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('خطأ في جلب المطعم:', error);
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

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب المطاعم:', error);
    return { success: false, error: error.message, data: [] };
  }
};
