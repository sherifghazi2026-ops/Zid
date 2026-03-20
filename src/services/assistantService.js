import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const ASSISTANT_SCREENS = {
  HOME: 'home',
  RESTAURANT: 'restaurant',
  HOME_CHEF: 'home_chef',
  OFFERS: 'offers',
  CART: 'cart',
  PROFILE: 'profile',
  ORDERS: 'orders',
  ADMIN: 'admin',
  SERVICE: 'service'
};

export const ASSISTANT_POSITIONS = {
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center'
};

export const AVAILABLE_MODELS = [
  { label: 'Llama 3.3 70B (ممتاز)', value: 'llama-3.3-70b-versatile' },
  { label: 'Llama 3.1 8B (سريع)', value: 'llama-3.1-8b-instant' },
  { label: 'Gemma 2 9B (خفيف)', value: 'gemma2-9b-it' },
  { label: 'Llama 3 70B (قوي)', value: 'llama3-70b-8192' }
];

export const getAllServices = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getAssistantsForScreen = async (screenName, serviceId = null) => {
  try {
    console.log(`🔍 جلب المساعدين للشاشة: ${screenName}, الخدمة ID: ${serviceId || 'عام'}`);

    let query = supabase
      .from(TABLES.ASSISTANTS)
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true })
      .limit(20);

    if (screenName === 'service' && serviceId) {
      console.log(`📌 تصفية حسب service_id: ${serviceId}`);
      query = query.eq('service_id', serviceId);
    } else {
      console.log(`📌 تصفية حسب الشاشة: ${screenName}`);
      query = query.eq('screen', screenName);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    console.log(`✅ تم جلب ${formattedData.length} مساعد للشاشة ${screenName}`);
    return { success: true, data: formattedData };

  } catch (error) {
    console.log('⚠️ المساعدين مش متاحين حالياً:', error.message);
    return { success: true, data: [] };
  }
};

export const getAllAssistants = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ASSISTANTS)
      .select('*')
      .order('screen', { ascending: true })
      .order('order', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      ...item,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب جميع المساعدين:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const createAssistant = async (assistantData) => {
  try {
    const newAssistant = {
      name: assistantData.name,
      screen: assistantData.screen,
      icon: assistantData.icon || 'chatbubble',
      color: assistantData.color || '#4F46E5',
      system_prompt: assistantData.systemPrompt || 'أنت مساعد ذكي اسمك "مُنجز". رد بالعامية المصرية.',
      welcome_message: assistantData.welcomeMessage || 'أهلاً! أنا مُنجز. كيف أقدر أساعدك؟',
      position: assistantData.position || 'bottom-right',
      is_active: assistantData.is_active !== undefined ? assistantData.is_active : true,
      order: assistantData.order || 0,
      service_id: assistantData.serviceId || null,
      service_name: assistantData.serviceName || null,
      model: assistantData.model || 'llama-3.3-70b-versatile',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.ASSISTANTS)
      .insert([newAssistant])
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
    console.error('❌ خطأ في إنشاء مساعد:', error);
    return { success: false, error: error.message };
  }
};

export const updateAssistant = async (assistantId, assistantData) => {
  try {
    const updateData = {
      ...assistantData,
      service_id: assistantData.serviceId || null,
      service_name: assistantData.serviceName || null,
      model: assistantData.model || 'llama-3.3-70b-versatile',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.ASSISTANTS)
      .update(updateData)
      .eq('id', assistantId)
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
    console.error('❌ خطأ في تحديث مساعد:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAssistant = async (assistantId) => {
  try {
    const { error } = await supabase
      .from(TABLES.ASSISTANTS)
      .delete()
      .eq('id', assistantId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف مساعد:', error);
    return { success: false, error: error.message };
  }
};

export const toggleAssistantStatus = async (assistantId, is_active) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ASSISTANTS)
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', assistantId)
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
    console.error('❌ خطأ في تغيير حالة المساعد:', error);
    return { success: false, error: error.message };
  }
};
