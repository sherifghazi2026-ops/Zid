// Azure DeepSeek Service
const API_KEY = "DwFjOWx31jB369PeEpIQGXc2g7qXGD9GJRGUd2D2VhwQgSuHzjFAJQQJ99CBACHYHv6XJ3w3AAAAACOGTZ35";
const ENDPOINT = "https://your-resource.openai.azure.com"; // غير ده
const DEPLOYMENT_NAME = "DeepSeek-R1"; // اسم الـ deployment

const azureDeepSeekService = {
  askDeepSeek: async (userMessage, userLocation) => {
    try {
      console.log("🚀 Sending request to Azure DeepSeek...");
      
      const systemPrompt = `أنت مساعد ذكي لتطبيق Zayed-ID متخصص في مطاعم الشيخ زايد.
      
قواعد العمل:
1. تحدث باللهجة المصرية البيضاء.
2. ساعد المستخدم في تخصيص طلبه.
3. ردودك تكون نصاً عادياً.`;

      const response = await fetch(`${ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2025-01-01-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, text: "مشكلة في الاتصال: " + data.error.message };
      }

      if (data.choices && data.choices[0]?.message?.content) {
        const text = data.choices[0].message.content.trim();
        return { success: true, text };
      }
      
      return { success: false, text: "مفيش رد" };

    } catch (error) {
      return { success: false, text: "تأكد من الاتصال بالنت" };
    }
  }
};

export default azureDeepSeekService;
