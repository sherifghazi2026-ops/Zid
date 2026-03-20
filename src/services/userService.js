import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';
import { signIn } from './authService';

export const loginUser = async (phone, password) => {
  try {
    if (!phone || phone.length < 10) return { success: false, error: 'رقم الهاتف غير صحيح' };
    const email = `${phone}@phone.auth`;
    const result = await signIn(email, password);
    if (!result.success) return result;
    if (result.data && result.data.active === false) return { success: false, error: 'هذا الحساب غير نشط' };
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase.from(TABLES.PROFILES).select('*').limit(100);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const getUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase.from(TABLES.PROFILES).select('*').eq('role', role);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const toggleUserStatus = async (userId, active) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase.from(TABLES.PROFILES).delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const verifyMerchant = async (userId, isVerified) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const verifyChef = verifyMerchant;

export const acceptTerms = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserLocation = async (userId, location) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ location_lat: location.latitude, location_lng: location.longitude })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateAvailability = async (userId, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ is_available: isAvailable })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateDriverAvailability = updateAvailability;
