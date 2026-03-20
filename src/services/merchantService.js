import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const getMerchantsByType = async (serviceType) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('role', 'merchant')
      .eq('merchant_type', serviceType)
      .eq('active', true)
      .order('full_name', { ascending: true });
    if (error) throw error;
    const formatted = (data || []).map(item => ({
      $id: item.id,
      id: item.id,
      name: item.full_name,
      full_name: item.full_name,
      phone: item.phone,
      image_url: item.image_url,
      merchant_type: item.merchant_type,
      delivery_fee: item.delivery_fee || 0,
      delivery_time: item.delivery_time || 30,
      place_name: item.place_name,
      is_available: item.is_available,
    }));
    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getMerchantById = async (merchantId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', merchantId)
      .single();
    if (error) throw error;
    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        name: data.full_name,
        phone: data.phone,
        image_url: data.image_url,
        merchant_type: data.merchant_type,
        delivery_fee: data.delivery_fee || 0,
        delivery_time: data.delivery_time || 30,
        place_name: data.place_name,
        is_available: data.is_available,
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
