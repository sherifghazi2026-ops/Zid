import { databases, DATABASE_ID, ASSISTANTS_COLLECTION_ID, SERVICES_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// جلب المساعدين لشاشة محددة
export const getAssistantsForScreen = async (screenName, serviceIdentifier = null) => {
  try {
    console.log(`🔍 جلب المساعدين للشاشة: ${screenName}, المعرف: ${serviceIdentifier || 'عام'}`);

    // ✅ جلب كل المساعدين النشطين
    const allAssistants = await databases.listDocuments(
      DATABASE_ID,
      ASSISTANTS_COLLECTION_ID,
      [Query.equal('isActive', true)]
    );
    
    console.log(`📦 إجمالي المساعدين النشطين: ${allAssistants.documents.length}`);

    // ✅ فلترة حسب الشاشة أولاً
    let filtered = allAssistants.documents.filter(a => a.screen === screenName);
    console.log(`📌 بعد فلترة الشاشة (${screenName}): ${filtered.length} مساعد`);

    // ✅ إذا كانت شاشة خدمة وفيها serviceIdentifier
    if (screenName === 'service' && serviceIdentifier) {
      // جلب الاسم العربي للخدمة (للمقارنة مع serviceName)
      let arabicServiceName = serviceIdentifier;
      
      try {
        const serviceResponse = await databases.listDocuments(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          [Query.equal('id', serviceIdentifier), Query.limit(1)]
        );
        
        if (serviceResponse.documents.length > 0) {
          arabicServiceName = serviceResponse.documents[0].name;
          console.log(`✅ الاسم العربي للخدمة: ${arabicServiceName}`);
        }
      } catch (e) {
        console.log('⚠️ لم نتمكن من جلب الاسم العربي');
      }

      // فلترة دقيقة: المساعد الخاص بهذه الخدمة فقط
      filtered = filtered.filter(a => {
        // إذا كان المساعد عام (serviceId = null) نستبعده
        if (!a.serviceId || a.serviceId === '') {
          return false; // ❌ لا نريد المساعدين العامين
        }
        
        // المساعد الخاص بهذه الخدمة (serviceId = serviceIdentifier)
        // أو المساعد الخاص بالاسم العربي (serviceName = arabicServiceName)
        return a.serviceId === serviceIdentifier || a.serviceName === arabicServiceName;
      });
      
      console.log(`📌 بعد فلترة الخدمة (${serviceIdentifier}): ${filtered.length} مساعد خاص`);
    }

    return { success: true, data: filtered };

  } catch (error) {
    console.log('⚠️ المساعدين مش متاحين حالياً:', error.message);
    return { success: true, data: [] };
  }
};

// باقي الدوال كما هي...
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
