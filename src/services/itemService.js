import { supabase } from '../lib/supabaseClient';

export const getItems = async (collectionName) => {
  try {
    console.log(`🔍 جلب الأصناف من: ${collectionName}`);
    const { data, error } = await supabase
      .from(collectionName)
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب الأصناف:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const addItem = async (collectionName, itemData) => {
  try {
    if (!itemData.name) return { success: false, error: 'اسم الصنف مطلوب' };

    const newItem = {
      name: itemData.name,
      is_active: itemData.is_active !== false,
      created_at: new Date().toISOString(),
      prices: itemData.prices || null,
      image_url: itemData.image_url || null,
      service_id: itemData.serviceId || null,
    };

    const { data, error } = await supabase
      .from(collectionName)
      .insert([newItem])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    console.error('❌ خطأ في إضافة الصنف:', error);
    return { success: false, error: error.message };
  }
};

export const updateItem = async (collectionName, itemId, itemData) => {
  try {
    const updateData = {
      ...itemData,
      is_active: itemData.is_active !== undefined ? itemData.is_active : itemData.is_active,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(collectionName)
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteItem = async (collectionName, itemId) => {
  try {
    const { error } = await supabase.from(collectionName).delete().eq('id', itemId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const toggleItemStatus = async (collectionName, itemId, is_active) => {
  try {
    const { data, error } = await supabase
      .from(collectionName)
      .update({
        is_active: is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getActiveItems = async (collectionName) => {
  try {
    if (!collectionName) return { success: false, error: 'اسم الجدول مطلوب', data: [] };

    const { data, error } = await supabase
      .from(collectionName)
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
    console.error('❌ خطأ في جلب الأصناف النشطة:', error);
    return { success: false, error: error.message, data: [] };
  }
};
