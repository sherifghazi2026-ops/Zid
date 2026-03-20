import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const REVIEWS_COLLECTION_ID = 'reviews';

export const createReview = async (reviewData) => {
  try {
    const { data: existing } = await supabase
      .from(REVIEWS_COLLECTION_ID)
      .select('id')
      .eq('order_id', reviewData.orderId)
      .limit(1);
    if (existing?.length > 0) return { success: false, error: 'تم التقييم مسبقاً' };

    const { data, error } = await supabase
      .from(REVIEWS_COLLECTION_ID)
      .insert([{
        order_id: reviewData.orderId,
        customer_id: reviewData.customerId,
        provider_id: reviewData.providerId,
        rating: reviewData.rating,
        comment: reviewData.comment || '',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw error;
    await updateProviderAverageRating(reviewData.providerId);
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getProviderReviews = async (providerId) => {
  try {
    const { data, error } = await supabase
      .from(REVIEWS_COLLECTION_ID)
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getProviderAverageRating = async (providerId) => {
  try {
    const result = await getProviderReviews(providerId);
    if (!result.success || result.data.length === 0) return { success: true, average: 0, count: 0 };
    const sum = result.data.reduce((acc, r) => acc + r.rating, 0);
    return { success: true, average: sum / result.data.length, count: result.data.length };
  } catch (error) {
    return { success: false, error: error.message, average: 0, count: 0 };
  }
};

const updateProviderAverageRating = async (providerId) => {
  try {
    const { average, count } = await getProviderAverageRating(providerId);
    await supabase.from(TABLES.PROFILES).update({
      average_rating: average,
      reviews_count: count,
      updated_at: new Date().toISOString(),
    }).eq('id', providerId);
  } catch (error) {
    console.log('⚠️ فشل تحديث متوسط التقييم:', error.message);
  }
};
