import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const SERVICE_TYPES = {
  REGULAR: 'regular',
  ITEMS_SERVICE: 'items_service',
  ITEMS: 'items',
  PRODUCTS: 'products',
  AI: 'ai'
};

export const getAllServices = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      id: item.id,
      service_id: item.service_id || item.id,
      name: item.name,
      type: item.type || SERVICE_TYPES.REGULAR,
      screen: item.screen,
      icon: item.icon || 'apps-outline',
      color: item.color || '#6B7280',
      category: item.category || 'other',
      is_active: item.is_active !== false,
      is_visible: item.is_visible !== false,
      has_items: item.has_items || false,
      has_pickup: item.has_pickup || false,
      items_collection: item.items_collection || null,
      sub_services: item.sub_services || [],
      image_url: item.image_url || null,
      maintenance_text: item.maintenance_text || 'جاري التحديث',
      order: item.order || 0,
      merchant_role: item.merchant_role || 'merchant',
      merchant_type: item.merchant_type || null,
      response_message: item.response_message || 'سيتم التواصل معك قريباً',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getVisibleServicesForHome = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .select('*')
      .eq('is_visible', true)
      .order('order', { ascending: true });

    if (error) throw error;

    const servicesWithDefaults = (data || []).map(service => ({
      $id: service.id,
      id: service.id,
      service_id: service.service_id || service.id,
      name: service.name,
      type: service.type || SERVICE_TYPES.REGULAR,
      screen: service.screen,
      icon: service.icon || 'apps-outline',
      color: service.color || '#6B7280',
      category: service.category || 'other',
      is_active: service.is_active !== false,
      is_visible: service.is_visible !== false,
      has_items: service.has_items || false,
      has_pickup: service.has_pickup || false,
      items_collection: service.items_collection || null,
      sub_services: service.sub_services || [],
      image_url: service.image_url || null,
      maintenance_text: service.maintenance_text || 'جاري التحديث',
      order: service.order || 0,
      merchant_role: service.merchant_role || 'merchant',
      merchant_type: service.merchant_type || null,
      response_message: service.response_message || 'سيتم التواصل معك قريباً',
      created_at: service.created_at,
      updated_at: service.updated_at,
    }));

    return { success: true, data: servicesWithDefaults };
  } catch (error) {
    console.error('خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getServiceById = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'الخدمة غير موجودة' };
      }
      throw error;
    }

    const service = {
      $id: data.id,
      id: data.id,
      service_id: data.service_id || data.id,
      name: data.name,
      type: data.type || SERVICE_TYPES.REGULAR,
      screen: data.screen,
      icon: data.icon || 'apps-outline',
      color: data.color || '#6B7280',
      category: data.category || 'other',
      is_active: data.is_active !== false,
      is_visible: data.is_visible !== false,
      has_items: data.has_items || false,
      has_pickup: data.has_pickup || false,
      items_collection: data.items_collection || null,
      sub_services: data.sub_services || [],
      image_url: data.image_url || null,
      maintenance_text: data.maintenance_text || 'جاري التحديث',
      order: data.order || 0,
      merchant_role: data.merchant_role || 'merchant',
      merchant_type: data.merchant_type || null,
      response_message: data.response_message || 'سيتم التواصل معك قريباً',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { success: true, data: service };
  } catch (error) {
    console.error('خطأ في جلب الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const createService = async (serviceData) => {
  try {
    const { data: existing, error: checkError } = await supabase
      .from(TABLES.SERVICES)
      .select('id')
      .eq('id', serviceData.id);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      return { success: false, error: 'هذا المعرف موجود بالفعل' };
    }

    let screen = 'ServiceScreen';
    switch(serviceData.type) {
      case SERVICE_TYPES.ITEMS_SERVICE:
        screen = 'ItemsServiceScreen';
        break;
      case SERVICE_TYPES.ITEMS:
        screen = 'MerchantsListScreen';
        break;
      case SERVICE_TYPES.PRODUCTS:
        screen = 'ProductsServiceScreen';
        break;
      case SERVICE_TYPES.AI:
        screen = 'AiMainModal';
        break;
    }

    const newService = {
      id: serviceData.id,
      service_id: serviceData.id,
      name: serviceData.name,
      type: serviceData.type || SERVICE_TYPES.REGULAR,
      screen: screen,
      icon: serviceData.icon || 'apps-outline',
      color: serviceData.color || '#6B7280',
      category: serviceData.category || 'other',
      is_active: serviceData.is_active !== false,
      is_visible: serviceData.is_visible !== false,
      has_items: serviceData.has_items || serviceData.type === SERVICE_TYPES.ITEMS || serviceData.type === SERVICE_TYPES.ITEMS_SERVICE,
      has_pickup: serviceData.has_pickup || false,
      items_collection: serviceData.items_collection || null,
      sub_services: serviceData.sub_services || [],
      image_url: serviceData.image_url || null,
      maintenance_text: serviceData.maintenance_text || 'جاري التحديث',
      order: serviceData.order || 0,
      merchant_role: serviceData.merchant_role || 'merchant',
      merchant_type: serviceData.merchant_type || null,
      response_message: serviceData.response_message || 'سيتم التواصل معك قريباً',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📦 إنشاء خدمة جديدة:', newService);

    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .insert([newService])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const updateService = async (serviceDocId, updateData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceDocId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في تحديث الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const toggleServiceStatus = async (serviceDocId, is_active) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceDocId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في تغيير حالة الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const toggleServiceVisibility = async (serviceDocId, is_visible) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .update({
        is_visible,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceDocId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    };
  } catch (error) {
    console.error('خطأ في تغيير ظهور الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const deleteService = async (serviceDocId) => {
  try {
    const { error } = await supabase
      .from(TABLES.SERVICES)
      .delete()
      .eq('id', serviceDocId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف الخدمة:', error);
    return { success: false, error: error.message };
  }
};

export const initializeCoreServices = async () => {
  try {
    console.log('🚀 جاري تهيئة الخدمات الأساسية لمشروع Zid...');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في تهيئة الخدمات:', error);
    return { success: false, error };
  }
};
