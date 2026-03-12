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

// جلب المساعدين لشاشة محددة (مع إمكانية تحديد serviceId)
export const getAssistantsForScreen = async (screenName, serviceId = null) => {
  try {
    console.log(`🔍 جلب المساعدين للشاشة: ${screenName}, الخدمة ID: ${serviceId || 'عام'}`);

    // أولاً: جلب كل المساعدين لنرى ماذا يوجد (للتشخيص)
    const allAssistants = await databases.listDocuments(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      [Query.limit(100)]
    );
    console.log(`📋 جميع المساعدين في قاعدة البيانات (${allAssistants.documents.length}):`);
    allAssistants.documents.forEach((a, i) => {
      console.log(`   ${i+1}. ${a.name} - screen: ${a.screen}, serviceId: ${a.serviceId}, isActive: ${a.isActive}`);
    });

    const queries = [
      Query.equal('isActive', true),
      Query.orderAsc('order'),
      Query.limit(20)
    ];

    // إذا كانت الشاشة هي 'service'، نضيف شرط الـ serviceId (Document ID)
    if (screenName === 'service' && serviceId) {
      console.log(`📌 تصفية حسب serviceId (Document ID): ${serviceId}`);
      queries.push(Query.equal('serviceId', serviceId));
    } else {
      // للشاشات الأخرى، نجلب المساعدين المخصصين لتلك الشاشة فقط
      console.log(`📌 تصفية حسب الشاشة: ${screenName}`);
      queries.push(Query.equal('screen', screenName));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      queries
    );

    console.log(`✅ تم جلب ${response.documents.length} مساعد للشاشة ${screenName}`);
    
    // طباعة تفاصيل المساعدين للتحقق
    response.documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.name} - serviceId: ${doc.serviceId}, screen: ${doc.screen}`);
    });

    return { success: true, data: response.documents };

  } catch (error) {
    console.log('⚠️ المساعدين مش متاحين حالياً:', error.message);
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
      model: assistantData.model || 'llama-3.3-70b-versatile',
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
