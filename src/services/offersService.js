import { supabase } from '../lib/supabaseClient';

export const OFFERS_COLLECTION_ID = 'offers';

export const getAllOffers = async () => {
  try {
    const { data, error } = await supabase
      .from(OFFERS_COLLECTION_ID)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getActiveOffers = async () => {
  try {
    const { data, error } = await supabase
      .from(OFFERS_COLLECTION_ID)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const createOffer = async (offerData) => {
  try {
    const { data, error } = await supabase
      .from(OFFERS_COLLECTION_ID)
      .insert([{
        title: offerData.title,
        description: offerData.description,
        image_url: offerData.image_url || null,
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

export const deleteOffer = async (offerId, image_url) => {
  try {
    if (image_url?.includes('imagekit.io')) {
      const { deleteFromImageKit } = await import('./uploadService');
      await deleteFromImageKit(image_url);
    }
    const { error } = await supabase.from(OFFERS_COLLECTION_ID).delete().eq('id', offerId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
