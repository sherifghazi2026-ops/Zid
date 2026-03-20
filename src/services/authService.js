import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('⚠️ خطأ في جلب الملف الشخصي:', profileError);
    }

    return {
      success: true,
      data: {
        $id: data.user.id,
        ...data.user,
        ...profile,
        created_at: data.user.created_at,
      },
      session: data.session,
    };
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في تسجيل الخروج:', error);
    return { success: false, error: error.message };
  }
};

export const signUp = async (email, password, userData = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from(TABLES.PROFILES)
        .insert([{
          id: data.user.id,
          email: data.user.email,
          full_name: userData.full_name || '',
          phone: userData.phone || '',
          avatar_url: userData.avatar_url || null,
          role: userData.role || 'user',
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (profileError) {
        console.error('❌ خطأ في إنشاء الملف الشخصي:', profileError);
      }
    }

    return {
      success: true,
      data: {
        $id: data.user?.id,
        ...data.user,
        ...userData,
        created_at: data.user?.created_at,
      },
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الحساب:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
      return { success: false, error: 'لا يوجد مستخدم مسجل' };
    }

    const { data: profile, error: profileError } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      success: true,
      data: {
        $id: user.id,
        ...user,
        ...profile,
        created_at: user.created_at,
      },
    };
  } catch (error) {
    console.error('❌ خطأ في جلب المستخدم:', error);
    return { success: false, error: error.message };
  }
};

export const getUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('role', role)
      .limit(100);

    if (error) throw error;

    const formattedData = (data || []).map(user => ({
      $id: user.id,
      ...user,
      name: user.full_name || user.name,
      created_at: user.created_at,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error(`خطأ في جلب ${role}:`, error);
    return { success: false, error: error.message, data: [] };
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
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
      },
    };
  } catch (error) {
    console.error('❌ خطأ في تحديث الملف:', error);
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'yourapp://reset-password',
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
    return { success: false, error: error.message };
  }
};

export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في تغيير كلمة المرور:', error);
    return { success: false, error: error.message };
  }
};

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error('❌ خطأ في جلب الجلسة:', error);
    return { success: false, error: error.message };
  }
};

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};
