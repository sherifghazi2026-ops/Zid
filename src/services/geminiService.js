// خدمة محلية مؤقتة بدون API
class GeminiService {
  async ask(prompt, options = {}) {
    const { conversationHistory = [] } = options;
    
    // تأخير بسيط عشان يبان وكأنه بيفكر
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lastUserMessage = prompt.toLowerCase();
    
    // ردود بسيطة على الكلمات المفتاحية
    if (lastUserMessage.includes('ازيك') || lastUserMessage.includes('عامل ايه')) {
      return {
        success: true,
        text: 'الحمد لله، أنا بخير. وانت عامل ايه؟'
      };
    }
    
    if (lastUserMessage.includes('الحمد لله') || lastUserMessage.includes('تمام')) {
      return {
        success: true,
        text: 'الحمد لله دايماً. عايز تطلب حاجة معينة؟'
      };
    }
    
    if (lastUserMessage.includes('شكراً') || lastUserMessage.includes('شكرا')) {
      return {
        success: true,
        text: 'العفو على طول، تحت أمرك'
      };
    }
    
    if (lastUserMessage.includes('عايز اكل') || lastUserMessage.includes('جوعان')) {
      return {
        success: true,
        text: 'عندنا تشكيلة كبيرة من الأكل. عايز إيه بالظبط؟'
      };
    }
    
    // الرد الافتراضي
    return {
      success: true,
      text: 'آسف، ما فهمتش طلبك. ممكن توضح أكثر؟'
    };
  }
}

export default new GeminiService();
