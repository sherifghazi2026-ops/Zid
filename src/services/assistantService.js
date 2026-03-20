import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const ASSISTANT_SCREENS = {
  HOME: 'home', RESTAURANT: 'restaurant', HOME_CHEF: 'home_chef',
  OFFERS: 'offers', CART: 'cart', PROFILE: 'profile',
  ORDERS: 'orders', ADMIN: 'admin', SERVICE: 'service'
};

export const ASSISTANT_POSITIONS = {
  BOTTOM_RIGHT: 'bottom-right', BOTTOM_LEFT: 'bottom-left', BOTTOM_CENTER: 'bottom-center'
};

export const AVAILABLE_MODELS = [
  { label: 'Llama 3.3 70B (ممتاز)', value: 'llama-3.3-70b-versatile' },
  { label: 'Llama 3.1 8B (سريع)', value: 'llama-3.1-8b-instant' },
  { label: 'Gemma 2 9B (خفيف)', value: 'gemma2-9b-it' },
  { label: 'Llama 3 70B (قوي)', value: 'llama3-70b-8192' }
];

export const getAssistantsForScreen = async (screenName, serviceId = null) => {
  try {
    let query = supabase.from(TABLES.ASSISTANTS).select('*').eq('is_active', true).order('order', { ascending: true });
    if (screenName === 'service' && serviceId) query = query.eq('service_id', serviceId);
    else query = query.eq('screen', screenName);
    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: true, data: [] };
  }
};

export const getAllAssistants = async () => {
  try {
    const { data, error } = await supabase.from(TABLES.ASSISTANTS).select('*').order('screen').order('order');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const createAssistant = async (assistantData) => {
  try {
    const { data, error } = await supabase.from(TABLES.ASSISTANTS).insert([{
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
    }]).select().single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateAssistant = async (assistantId, assistantData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ASSISTANTS)
      .update({ ...assistantData, updated_at: new Date().toISOString() })
      .eq('id', assistantId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteAssistant = async (assistantId) => {
  try {
    const { error } = await supabase.from(TABLES.ASSISTANTS).delete().eq('id', assistantId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const toggleAssistantStatus = async (assistantId, is_active) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ASSISTANTS)
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', assistantId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: { $id: data.id, ...data } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
