import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    const { data: profile } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', data.user.id)
      .single();
    return {
      success: true,
      data: { $id: data.user.id, ...data.user, ...profile },
      session: data.session,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signUp = async (email, password, userData = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userData },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from(TABLES.PROFILES).insert([{
        id: data.user.id,
        email: data.user.email,
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        role: userData.role || 'user',
        created_at: new Date().toISOString(),
      }]);
    }
    return { success: true, data: { $id: data.user?.id, ...data.user } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return { success: false, error: 'لا يوجد مستخدم' };
    const { data: profile } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', user.id)
      .single();
    return { success: true, data: { $id: user.id, ...user, ...profile } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('role', role);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
