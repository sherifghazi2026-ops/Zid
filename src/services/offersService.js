import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const OFFERS_COLLECTION_ID = 'offers';

export const getAllOffers = async () => {
  try {
    const { data, error } = await supabase
      .from(OFFERS_COLLECTION_ID)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      is_active: item.is_active,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب العروض:', error);
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

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      is_active: item.is_active,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب العروض النشطة:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const uploadOfferImage = async (imageUri) => {
  try {
    console.log('📤 بدء رفع صورة العرض:', imageUri);

    const { uploadToImageKit } = await import('./uploadService');
    const fileName = `offer_${Date.now()}.jpg`;
    const result = await uploadToImageKit(imageUri, fileName, 'offers', 'common');

    if (result.success) {
      console.log('✅ تم رفع الصورة:', result.fileUrl);
      return { success: true, fileId: result.fileId, url: result.fileUrl };
    } else {
      console.error('❌ فشل رفع الصورة:', result.error);
      return { success: false, fileId: null, url: null };
    }
  } catch (error) {
    console.error('❌ فشل رفع الصورة:', error);
    return { success: true, fileId: null, url: null };
  }
};

export const createOffer = async (offerData) => {
  try {
    const newOffer = {
      title: offerData.title,
      description: offerData.description,
      image_url: offerData.image_url || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(OFFERS_COLLECTION_ID)
      .insert([newOffer])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        is_active: data.is_active,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('خطأ في إنشاء العرض:', error);
    return { success: false, error: error.message };
  }
};

export const deleteOffer = async (offerId, image_url) => {
  try {
    if (image_url && image_url.includes('imagekit.io')) {
      try {
        const { deleteFromImageKit } = await import('./uploadService');
        await deleteFromImageKit(image_url);
      } catch (e) {
        console.log('⚠️ لا يمكن حذف الصورة:', e.message);
      }
    }

    const { error } = await supabase
      .from(OFFERS_COLLECTION_ID)
      .delete()
      .eq('id', offerId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف العرض:', error);
    return { success: false, error: error.message };
  }
};
