import { databases, DATABASE_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

export const REVIEWS_COLLECTION_ID = 'reviews';

export const createReview = async (reviewData) => {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION_ID,
      [Query.equal('orderId', reviewData.orderId)]
    );
    if (existing.documents.length > 0) {
      return { success: false, error: 'هذا الطلب تم تقييمه مسبقاً' };
    }
    const newReview = {
      orderId: reviewData.orderId,
      customerId: reviewData.customerId,
      providerId: reviewData.providerId,
      rating: reviewData.rating,
      comment: reviewData.comment || '',
      createdAt: new Date().toISOString(),
    };
    const response = await databases.createDocument(
      DATABASE_ID,
      REVIEWS_COLLECTION_ID,
      ID.unique(),
      newReview
    );
    await updateProviderAverageRating(reviewData.providerId);
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء التقييم:', error);
    return { success: false, error: error.message };
  }
};

export const getProviderReviews = async (providerId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION_ID,
      [Query.equal('providerId', providerId), Query.orderDesc('createdAt'), Query.limit(100)]
    );
    return { success: true, data: response.documents };
  } catch (error) {
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
    return { success: false, error: error.message };
  }
};

const updateProviderAverageRating = async (providerId) => {
  try {
    const { average, count } = await getProviderAverageRating(providerId);
    await databases.updateDocument(DATABASE_ID, 'users', providerId, { averageRating: average, reviewsCount: count });
  } catch (error) {
    console.log('⚠️ فشل تحديث متوسط التقييم:', error);
  }
};
