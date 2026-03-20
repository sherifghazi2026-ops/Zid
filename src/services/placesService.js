import { supabase } from '../lib/supabaseClient';

export const PLACES_COLLECTION_ID = 'places';

const formatPlaceData = (item) => item ? { $id: item.id, ...item } : null;

export const getPlacesByType = async (type) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .select('*')
      .eq('type', type)
      .eq('is_active', true);
    if (error) throw error;
    return { success: true, data: (data || []).map(formatPlaceData) };
  } catch (error) {
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
    return { success: false, error: error.message, data: [] };
  }
};

export const createPlace = async (placeData) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .insert([{
        name: placeData.name,
        type: placeData.type,
        address: placeData.address || '',
        phone: placeData.phone || '',
        is_active: true,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePlace = async (placeId, updateData) => {
  try {
    const { data, error } = await supabase
      .from(PLACES_COLLECTION_ID)
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', placeId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: formatPlaceData(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deletePlace = async (placeId) => {
  try {
    const { error } = await supabase.from(PLACES_COLLECTION_ID).delete().eq('id', placeId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
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
    return { success: false, error: error.message, data: [] };
  }
};
