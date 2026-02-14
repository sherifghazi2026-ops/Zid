const API_KEY = "DwFjOWx31jB369PeEpIQGXc2g7qXGD9GJRGUd2D2VhwQgSuHzjFAJQQJ99CBACHYHv6XJ3w3AAAAACOGTZ35";
const ENDPOINT = "https://sherifghazi-7065-resource.openai.azure.com";
const DEPLOYMENT_NAME = "gpt-4o"; // غير هذا لاسم الـ deployment الصحيح

const azureService = {
  askAI: async (userMessage) => {
    try {
      const url = `${ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-08-01-preview`;
      
      console.log("🌐 Sending to Azure:", url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'api-key': API_KEY 
        },
        body: JSON.stringify({
          messages: [
            { 
              role: "system", 
              content: `أنت 'زايد'، مساعد محترم وراقي متخصص في مطاعم الشيخ زايد.
              
المطاعم المتاحة:
1. مطعم البركة (وجبات: كفتة، فراخ مشوية، رز، مكرونة)
2. بيتزا زايد (وجبات: بيتزا مارجريتا، بيتزا مشكل جبن، باستا)

قواعد العمل:
- رد بالعامية المصرية الراقية
- ساعد المستخدم في اختيار الوجبات
- لو طلب حاجة خارج القائمة، اعتذر بذكاء` 
            },
            { role: "user", content: userMessage }
          ]
        })
      });
      
      const data = await response.json();
      console.log("Response status:", response.status);

      if (!response.ok) {
        console.error("Azure Error:", data);
        return { 
          success: false, 
          text: "السيرفر بيقول: " + (data.error?.message || "مشكلة في الاتصال") 
        };
      }

      if (data.choices && data.choices.length > 0) {
        return { success: true, text: data.choices[0].message.content };
      }
      return { success: false, text: "أعتذر منك، في حاجة غلط في الرد." };
    } catch (e) {
      console.error("Fetch Error:", e);
      return { success: false, text: "في مشكلة في الشبكة، جرب تاني." };
    }
  }
};

export default azureService;
