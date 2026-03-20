import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const HOME_CHEFS_COLLECTION_ID = TABLES.HOME_CHEFS;

export const getActiveHomeChefs = async () => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getHomeChefById = async (chefId) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .select('*')
      .eq('id', chefId)
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getHomeChefByUserId = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return { success: true, data: { $id: data.id, ...data } };
    return { success: false, error: 'لا يوجد شيف مرتبط' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createHomeChef = async (chefData) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .insert([{
        name: chefData.name,
        user_id: chefData.userId,
        bio: chefData.bio || '',
        image_url: chefData.image_url || null,
        specialties: chefData.specialties || [],
        delivery_fee: chefData.deliveryFee || 0,
        delivery_radius: chefData.deliveryRadius || 10,
        is_active: true,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateHomeChef = async (chefId, updateData) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', chefId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const toggleHomeChefStatus = async (chefId, is_active) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', chefId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteHomeChef = async (chefId) => {
  try {
    const { error } = await supabase.from(HOME_CHEFS_COLLECTION_ID).delete().eq('id', chefId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllHomeChefs = async () => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
