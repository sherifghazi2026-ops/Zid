import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const DISHES_COLLECTION_ID = TABLES.DISHES;

export const getMyDishes = async (providerId, providerType) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .select('*')
      .eq('provider_id', providerId)
      .eq('provider_type', providerType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب الأطباق:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getRestaurantDishes = async (restaurantId) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .select('*')
      .eq('provider_id', restaurantId)
      .eq('provider_type', 'restaurant')
      .eq('status', 'approved')
      .eq('is_available', true);

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب أطباق المطعم:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getChefDishes = async (chefId) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .select('*')
      .eq('provider_id', chefId)
      .eq('provider_type', 'home_chef')
      .eq('status', 'approved')
      .eq('is_available', true);

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب أطباق الشيف:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getPendingDishes = async () => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب الأطباق قيد المراجعة:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const createDish = async (dishData) => {
  try {
    const now = new Date().toISOString();
    const newDish = {
      name: dishData.name,
      description: dishData.description || null,
      price: parseFloat(dishData.price),
      category: dishData.category || null,
      ingredients: dishData.ingredients || null,
      images: dishData.images || [],
      video_url: dishData.videoUrl || null,
      provider_id: dishData.providerId,
      provider_type: dishData.providerType,
      is_available: dishData.isAvailable !== false,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    console.log('📦 إرسال إلى Supabase:', newDish);

    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .insert([newDish])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطبق:', error);
    return { success: false, error: error.message };
  }
};

export const updateDish = async (dishId, updateData) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dishId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في تحديث الطبق:', error);
    return { success: false, error: error.message };
  }
};

export const deleteDish = async (dishId, image_urls = []) => {
  try {
    if (image_urls && image_urls.length > 0) {
      const { deleteFromImageKit } = await import('./uploadService');
      for (const url of image_urls) {
        try {
          await deleteFromImageKit(url);
        } catch (e) {
          console.log('⚠️ فشل حذف صورة:', e.message);
        }
      }
    }

    const { error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .delete()
      .eq('id', dishId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الطبق:', error);
    return { success: false, error: error.message };
  }
};

export const approveDish = async (dishId) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dishId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في الموافقة على الطبق:', error);
    return { success: false, error: error.message };
  }
};

export const rejectDish = async (dishId, reason) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dishId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في رفض الطبق:', error);
    return { success: false, error: error.message };
  }
};

export const toggleDishAvailability = async (dishId, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from(DISHES_COLLECTION_ID)
      .update({
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dishId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في تغيير حالة التوفر:', error);
    return { success: false, error: error.message };
  }
};
