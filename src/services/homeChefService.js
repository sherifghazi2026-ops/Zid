import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const HOME_CHEFS_COLLECTION_ID = TABLES.HOME_CHEFS;

export const getActiveHomeChefs = async () => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب الشيفات:', error);
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

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('خطأ في جلب الشيف:', error);
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

    if (data) {
      return {
        success: true,
        data: {
          $id: data.id,
          ...data,
          created_at: data.created_at,
        }
      };
    }
    return { success: false, error: 'لا يوجد شيف مرتبط' };
  } catch (error) {
    console.error('خطأ في جلب الشيف:', error);
    return { success: false, error: error.message };
  }
};

export const createHomeChef = async (chefData) => {
  try {
    const newChef = {
      name: chefData.name,
      user_id: chefData.userId,
      bio: chefData.bio || '',
      image_url: chefData.image_url || null,
      cover_image: chefData.coverImage || null,
      health_cert_url: chefData.healthCertUrl || null,
      is_verified: false,
      specialties: chefData.specialties || [],
      delivery_radius: chefData.deliveryRadius || 10,
      delivery_fee: chefData.deliveryFee || 0,
      min_order: chefData.minOrder || 0,
      is_active: true,
      dishes_count: 0,
      rating: 0,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .insert([newChef])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('خطأ في إنشاء الشيف:', error);
    return { success: false, error: error.message };
  }
};

export const updateHomeChef = async (chefId, updateData) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('خطأ في تحديث الشيف:', error);
    return { success: false, error: error.message };
  }
};

export const toggleHomeChefStatus = async (chefId, is_active) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const verifyHomeChef = async (chefId) => {
  try {
    const { data, error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteHomeChef = async (chefId) => {
  try {
    const { error } = await supabase
      .from(HOME_CHEFS_COLLECTION_ID)
      .delete()
      .eq('id', chefId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الشيف:', error);
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

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب الشيفات:', error);
    return { success: false, error: error.message, data: [] };
  }
};
