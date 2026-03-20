import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

const PRODUCTS = TABLES.PRODUCTS;

export const getMerchantProductsByService = async (merchantId, serviceId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .select('*')
      .or(`service_id.eq.${serviceId},merchant_id.eq.${merchantId}`)
      .eq('status', 'approved')
      .eq('is_available', true);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getProductsByService = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_template', true)
      .eq('status', 'approved')
      .eq('is_available', true);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getAllProducts = async () => {
  try {
    const { data, error } = await supabase.from(PRODUCTS).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getMerchantProducts = async (merchantId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_template', false);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const addProduct = async (productData) => {
  try {
    const isTemplate = !productData.merchant_id || productData.merchant_id === 'admin';
    let merchantName = '';
    if (productData.merchant_id && !isTemplate) {
      const { data: m } = await supabase.from(TABLES.PROFILES).select('full_name').eq('id', productData.merchant_id).single();
      merchantName = m?.full_name || '';
    }
    const { data, error } = await supabase
      .from(PRODUCTS)
      .insert([{
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
      }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase.from(PRODUCTS).delete().eq('id', productId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const approveProduct = async (productId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const rejectProduct = async (productId, reason) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getPendingProducts = async () => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getTemplateProductsByService = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCTS)
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_template', true);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
