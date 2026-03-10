import { databases, DATABASE_ID, ASSISTANTS_COLLECTION_ID, SERVICES_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

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

// الموديلات المتاحة
export const AVAILABLE_MODELS = [
  { label: 'Llama 3.3 70B (ممتاز)', value: 'llama-3.3-70b-versatile' },
  { label: 'Llama 3.1 8B (سريع)', value: 'llama-3.1-8b-instant' },
  { label: 'Gemma 2 9B (خفيف)', value: 'gemma2-9b-it' },
  { label: 'Llama 3 70B (قوي)', value: 'llama3-70b-8192' }
];

// جلب جميع الخدمات
export const getAllServices = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      [Query.orderAsc('order')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب الخدمات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب المساعدين لشاشة محددة
export const getAssistantsForScreen = async (screenName) => {
  try {
    console.log(`🔍 جلب المساعدين للشاشة: ${screenName}`);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      [
        Query.equal('screen', screenName),
        Query.equal('isActive', true),
        Query.orderAsc('order'),
        Query.limit(20)
      ]
    );
    
    return { success: true, data: response.documents };
    
  } catch (error) {
    console.log('⚠️ المساعدين مش متاحين حالياً');
    return { success: true, data: [] };
  }
};

// جلب جميع المساعدين (للأدمن)
export const getAllAssistants = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      [Query.orderAsc('screen'), Query.orderAsc('order')]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب جميع المساعدين:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// إنشاء مساعد جديد
export const createAssistant = async (assistantData) => {
  try {
    const newAssistant = {
      name: assistantData.name,
      screen: assistantData.screen,
      icon: assistantData.icon || 'chatbubble',
      color: assistantData.color || '#4F46E5',
      systemPrompt: assistantData.systemPrompt || 'أنت مساعد ذكي اسمك "مُنجز". رد بالعامية المصرية.',
      welcomeMessage: assistantData.welcomeMessage || 'أهلاً! أنا مُنجز. كيف أقدر أساعدك؟',
      position: assistantData.position || 'bottom-right',
      isActive: assistantData.isActive !== undefined ? assistantData.isActive : true,
      order: assistantData.order || 0,
      serviceId: assistantData.serviceId || null,
      serviceName: assistantData.serviceName || null,
      model: assistantData.model || 'llama-3.3-70b-versatile', // ✅ الموديل الافتراضي
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      ID.unique(),
      newAssistant
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء مساعد:', error);
    return { success: false, error: error.message };
  }
};

// تحديث مساعد
export const updateAssistant = async (assistantId, assistantData) => {
  try {
    const updateData = {
      ...assistantData,
      serviceId: assistantData.serviceId || null,
      serviceName: assistantData.serviceName || null,
      model: assistantData.model || 'llama-3.3-70b-versatile',
      updatedAt: new Date().toISOString()
    };

    const response = await databases.updateDocument(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      assistantId,
      updateData
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث مساعد:', error);
    return { success: false, error: error.message };
  }
};

// حذف مساعد
export const deleteAssistant = async (assistantId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      assistantId
    );
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف مساعد:', error);
    return { success: false, error: error.message };
  }
};

// تفعيل/تعطيل مساعد
export const toggleAssistantStatus = async (assistantId, isActive) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      assistantId,
      { isActive, updatedAt: new Date().toISOString() }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تغيير حالة المساعد:', error);
    return { success: false, error: error.message };
  }
};
