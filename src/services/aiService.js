const API_KEY = "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";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

const aiService = {
  askAI: async (userMessage, userLocation) => {
    try {
      console.log("🚀 Sending request to OpenRouter...");
      
      const systemPrompt = `أنت مساعد ذكي لتطبيق Zayed-ID متخصص في مطاعم الشيخ زايد.
      
قواعد العمل الأساسية:
1. تحدث باللهجة المصرية البيضاء (عامية أهل زايد).
2. ساعد المستخدم في تخصيص طلبه (مثل: بيتزا بدون بصل، سندوتش دبل صوص).
3. ردودك تكون نصاً عادياً خالياً من العلامات مثل (*) أو (#).
      
      ${userLocation ? `المستخدم موجود في الشيخ زايد` : ''}`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': 'http://localhost:19006',
          'X-Title': 'Zayed-ID'
        },
        body: JSON.stringify({
          model: 'microsoft/phi-3-mini-128k-instruct:free', // ✅ مجاني ومضمون
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error("OpenRouter Error:", data.error);
        return { success: false, text: "مشكلة في الاتصال: " + (data.error.message || "حاول تاني") };
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

export default aiService;
