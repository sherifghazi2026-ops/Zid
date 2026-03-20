import { supabase } from '../lib/supabaseClient';

export const PLACES_COLLECTION_ID = 'places';

export const initializePlacesCollection = async () => {
  try {
    const { error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('⚠️ جدول "places" غير موجود في قاعدة البيانات.');
      return false;
    }
    console.log('✅ جدول "places" متصل وجاهز.');
    return true;
  } catch (error) {
    console.error('⚠️ خطأ في تهيئة الأماكن:', error);
    return false;
  }
};

const formatPlaceData = (item) => {
  if (!item) return null;
  return {
    ...item,
    $id: item.id,
    id: item.id,
    merchant_id: item.merchant_id,
    merchant_name: item.merchant_name,
    is_active: item.is_active,
    is_assigned: item.is_assigned,
    created_at: item.created_at,
    updated_at: item.updated_at,
    type: item.type,
    name: item.name,
    address: item.address,
    phone: item.phone,
  };
};

export const getPlacesByType = async (type) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []).map(formatPlaceData) };
  } catch (error) {
    console.error('خطأ في جلب الأماكن بالنوع:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getAvailablePlacesByType = async (type) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .or('merchant_id.is.null,merchant_id.eq.""');

    if (error) throw error;
    return { success: true, data: (data || []).map(formatPlaceData) };
  } catch (error) {
    console.error('خطأ في جلب الأماكن المتاحة:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getPlaceById = async (placeId) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .select('*')
      .eq('id', placeId)
      .single();

    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    console.error('خطأ في جلب بيانات المكان:', error);
    return { success: false, error: error.message };
  }
};

export const createPlace = async (placeData) => {
  try {
    const newPlace = {
      name: placeData.name,
      type: placeData.type,
      address: placeData.address || '',
      phone: placeData.phone || '',
      merchant_id: null,
      merchant_name: null,
      is_active: true,
      is_assigned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .insert([newPlace])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    console.error('خطأ في إنشاء المكان:', error);
    return { success: false, error: error.message };
  }
};

export const updatePlace = async (placeId, updateData) => {
  try {
    const updateFields = {};

    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.type !== undefined) updateFields.type = updateData.type;
    if (updateData.address !== undefined) updateFields.address = updateData.address;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.merchant_id !== undefined) updateFields.merchant_id = updateData.merchant_id;
    if (updateData.merchantId !== undefined) updateFields.merchant_id = updateData.merchantId;
    if (updateData.merchant_name !== undefined) updateFields.merchant_name = updateData.merchant_name;
    if (updateData.merchantName !== undefined) updateFields.merchant_name = updateData.merchantName;
    if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active;
    if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
    if (updateData.is_assigned !== undefined) updateFields.is_assigned = updateData.is_assigned;
    if (updateData.isAssigned !== undefined) updateFields.is_assigned = updateData.isAssigned;

    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .update(updateFields)
      .eq('id', placeId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    console.error('خطأ في تحديث المكان:', error);
    return { success: false, error: error.message };
  }
};

export const assignMerchantToPlace = async (placeId, merchantId, merchantName) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .update({
        merchant_id: merchantId,
        merchant_name: merchantName,
        is_assigned: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', placeId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    console.error('خطأ في ربط التاجر بالمكان:', error);
    return { success: false, error: error.message };
  }
};

export const unassignPlace = async (placeId) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .update({
        merchant_id: null,
        merchant_name: null,
        is_assigned: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', placeId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    console.error('خطأ في فك ارتباط المكان:', error);
    return { success: false, error: error.message };
  }
};

export const deletePlace = async (placeId) => {
  try {
    const { error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .delete()
      .eq('id', placeId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف المكان:', error);
    return { success: false, error: error.message };
  }
};

export const getAllPlaces = async () => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []).map(formatPlaceData) };
  } catch (error) {
    console.error('خطأ في جلب كل الأماكن:', error);
    return { success: false, error: error.message, data: [] };
  }
};
