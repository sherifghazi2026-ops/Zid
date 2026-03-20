import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

const PRODUCTS_COLLECTION = TABLES.PRODUCTS;

export const ensureProductsCollection = async () => {
  try {
    const { error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('⚠️ جدول products غير موجود.');
      return false;
    }
    console.log('✅ جدول products موجود');
    return true;
  } catch (error) {
    console.log('⚠️ خطأ في التحقق من جدول products:', error);
    return false;
  }
};

export const getMerchantProductsByService = async (merchantId, serviceId) => {
  try {
    console.log(`🔍 جلب منتجات التاجر ${merchantId} للخدمة ${serviceId}`);

    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .or(`and(service_id.eq.${serviceId},is_template.eq.true),and(merchant_id.eq.${merchantId},is_template.eq.false)`)
      .eq('status', 'approved')
      .eq('is_available', true)
      .order('name', { ascending: true });

    if (error) throw error;

    console.log(`✅ تم جلب ${data?.length || 0} منتج للتاجر`);

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name || '',
      service_id: item.service_id,
      image_url: item.image_url,
      is_available: item.is_available,
      is_template: item.is_template,
      created_at: item.created_at || item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات التاجر:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getProductsByService = async (serviceId) => {
  try {
    console.log(`🔍 جلب المنتجات للخدمة ${serviceId}`);

    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_template', true)
      .eq('status', 'approved')
      .eq('is_available', true)
      .order('name', { ascending: true });

    if (error) throw error;

    console.log(`✅ تم جلب ${data?.length || 0} منتج من products`);

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name || '',
      service_id: item.service_id,
      image_url: item.image_url,
      is_available: item.is_available,
      is_template: item.is_template,
      created_at: item.created_at || item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getAllProducts = async () => {
  try {
    console.log('🔍 جلب جميع المنتجات من Supabase...');

    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    console.log(`✅ تم جلب ${data?.length || 0} منتج`);

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name || '',
      service_id: item.service_id,
      image_url: item.image_url,
      is_available: item.is_available,
      is_template: item.is_template,
      created_at: item.created_at || item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getMerchantProducts = async (merchantId) => {
  try {
    console.log(`🔍 جلب منتجات التاجر ${merchantId}`);

    if (!merchantId) {
      console.error('❌ merchantId مطلوب');
      return { success: false, error: 'merchantId مطلوب', data: [] };
    }

    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_template', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ تم جلب ${data?.length || 0} منتج للتاجر`);

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name || '',
      service_id: item.service_id,
      image_url: item.image_url,
      is_available: item.is_available,
      is_template: item.is_template,
      created_at: item.created_at || item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات التاجر:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const addProduct = async (productData) => {
  try {
    const isTemplate = !productData.merchant_id || productData.merchant_id === 'admin';

    let merchantName = '';
    if (productData.merchant_id && !isTemplate) {
      try {
        const { data: merchantData } = await supabase
          .from(TABLES.PROFILES)
          .select('full_name')
          .eq('id', productData.merchant_id)
          .single();

        merchantName = merchantData?.full_name || '';
      } catch (e) {
        console.log('⚠️ لا يمكن جلب اسم التاجر');
      }
    }

    const newProduct = {
      name: productData.name,
      description: productData.description || '',
      price: parseFloat(productData.price),
      image_url: productData.image_url || '',
      is_available: productData.is_available !== false,
      status: 'pending',
      merchant_id: isTemplate ? null : productData.merchant_id,
      merchant_name: merchantName,
      service_id: productData.service_id || 'products',
      is_template: isTemplate,
      created_at: new Date().toISOString(),
    };

    console.log('📦 إضافة منتج:', newProduct);

    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .insert([newProduct])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ تم إضافة المنتج بنجاح:', data.id);

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        merchant_id: data.merchant_id,
        merchant_name: data.merchant_name || '',
        service_id: data.service_id,
        image_url: data.image_url,
        is_available: data.is_available,
        is_template: data.is_template,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إضافة المنتج:', error);
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    const updateFields = { ...productData };
    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .update(updateFields)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        merchant_id: data.merchant_id,
        merchant_name: data.merchant_name || '',
        service_id: data.service_id,
        image_url: data.image_url,
        is_available: data.is_available,
        is_template: data.is_template,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتج:', error);
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .delete()
      .eq('id', productId);

    if (error) throw error;

    console.log(`✅ تم حذف المنتج ${productId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف المنتج:', error);
    return { success: false, error: error.message };
  }
};

export const approveProduct = async (productId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ تمت الموافقة على المنتج ${productId}`);

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        merchant_id: data.merchant_id,
        merchant_name: data.merchant_name || '',
        service_id: data.service_id,
        image_url: data.image_url,
        is_available: data.is_available,
        is_template: data.is_template,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في الموافقة:', error);
    return { success: false, error: error.message };
  }
};

export const rejectProduct = async (productId, reason) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ تم رفض المنتج ${productId}`);

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        merchant_id: data.merchant_id,
        merchant_name: data.merchant_name || '',
        service_id: data.service_id,
        image_url: data.image_url,
        is_available: data.is_available,
        is_template: data.is_template,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في الرفض:', error);
    return { success: false, error: error.message };
  }
};

export const getPendingProducts = async () => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name || '',
      service_id: item.service_id,
      image_url: item.image_url,
      is_available: item.is_available,
      is_template: item.is_template,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات المعلقة:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getTemplateProductsByService = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS_COLLECTION)
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_template', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name || '',
      service_id: item.service_id,
      image_url: item.image_url,
      is_available: item.is_available,
      is_template: item.is_template,
      created_at: item.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات القالب:', error);
    return { success: false, error: error.message, data: [] };
  }
};
