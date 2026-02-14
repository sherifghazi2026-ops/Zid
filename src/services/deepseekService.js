// DeepSeek API مباشر - مجاني وسريع
const API_KEY = "sk-2ac00f7f133044d3a536f54e6fb66327";
const API_URL = "https://api.deepseek.com/v1/chat/completions";

const deepseekService = {
  askDeepSeek: async (userMessage, userLocation) => {
    try {
      console.log("🚀 Sending request to DeepSeek directly...");
      
      const systemPrompt = `أنت مساعد ذكي لتطبيق Zayed-ID متخصص في مطاعم الشيخ زايد.
      
قواعد العمل الأساسية:
1. تحدث باللهجة المصرية البيضاء (عامية أهل زايد).
2. ساعد المستخدم في تخصيص طلبه (مثل: بيتزا بدون بصل، سندوتش دبل صوص).
3. ردودك تكون نصاً عادياً خالياً من العلامات مثل (*) أو (#).
      
      ${userLocation ? `المستخدم موجود في الشيخ زايد` : ''}`;

      const requestBody = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log("DeepSeek response status:", response.status);

      if (!response.ok) {
        console.error("DeepSeek HTTP Error:", response.status, data);
        
        let errorMessage = "مشكلة في الاتصال";
        if (response.status === 401) errorMessage = "❌ مفتاح API غير صالح";
        else if (response.status === 402) errorMessage = "⚠️ الرصيد غير كافي (التوكنز خلصت)";
        else if (response.status === 429) errorMessage = "⚠️ تم تجاوز الحد المسموح";
        else errorMessage = `مشكلة في السيرفر (${response.status})`;
        
        return { success: false, text: errorMessage };
      }

      if (data.choices && data.choices[0]?.message?.content) {
        const text = data.choices[0].message.content.trim();
        return { success: true, text };
      }
      
      return { success: false, text: "مفيش رد من السيرفر" };

    } catch (error) {
      console.error("Fetch Error:", error);
      return { success: false, text: "تأكد من الاتصال بالنت وجرب تاني" };
    }
  }
};

export default deepseekService;
