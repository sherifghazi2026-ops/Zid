import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const REVIEWS_COLLECTION_ID = 'reviews';

export const createReview = async (reviewData) => {
  try {
    const { data: existing, error: checkError } = await supabase
      .from(REVIEWS_COLLECTION_ID)
      .select('id')
      .eq('order_id', reviewData.orderId)
      .limit(1);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      return { success: false, error: 'هذا الطلب تم تقييمه مسبقاً' };
    }

    const newReview = {
      order_id: reviewData.orderId,
      customer_id: reviewData.customerId,
      provider_id: reviewData.providerId,
      rating: reviewData.rating,
      comment: reviewData.comment || '',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(REVIEWS_COLLECTION_ID)
      .insert([newReview])
      .select()
      .single();

    if (error) throw error;

    await updateProviderAverageRating(reviewData.providerId);

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء التقييم:', error);
    return { success: false, error: error.message };
  }
};

export const getProviderReviews = async (providerId) => {
  try {
    const { data, error } = await supabase
      .from(REVIEWS_COLLECTION_ID)
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب التقييمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getProviderAverageRating = async (providerId) => {
  try {
    const reviews = await getProviderReviews(providerId);
    if (!reviews.success || reviews.data.length === 0) {
      return { success: true, average: 0, count: 0 };
    }
    const sum = reviews.data.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / reviews.data.length;
    return { success: true, average, count: reviews.data.length };
  } catch (error) {
    console.error('❌ خطأ في حساب متوسط التقييم:', error);
    return { success: false, error: error.message, average: 0, count: 0 };
  }
};

const updateProviderAverageRating = async (providerId) => {
  try {
    const { average, count } = await getProviderAverageRating(providerId);

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({
        average_rating: average,
        reviews_count: count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);

    if (error) throw error;

    console.log(`✅ تم تحديث متوسط تقييم مقدم الخدمة ${providerId}: ${average} (${count} تقييم)`);
  } catch (error) {
    console.log('⚠️ فشل تحديث متوسط التقييم:', error.message);
  }
};
