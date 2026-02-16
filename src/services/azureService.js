const API_KEY = "DwFjOWx31jB369PeEpIQGXc2g7qXGD9GJRGUd2D2VhwQgSuHzjFAJQQJ99CBACHYHv6XJ3w3AAAAACOGTZ35";
const ENDPOINT = "https://sherifghazi-7065-resource.cognitiveservices.azure.com/";
const DEPLOYMENT_NAME = "gpt-5.1-chat";

const azureService = {
  askAI: async (userMessage) => {
    try {
      console.log("🚀 Sending to Azure AI...");
      const url = `${ENDPOINT}openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-05-01-preview`;
      
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
              content: `أنت مساعد ذكي لتطبيق Zayed-ID للمطاعم في الشيخ زايد. رد بالعامية المصرية.` 
            },
            { role: "user", content: userMessage }
          ]
        })
      });
      
      const data = await response.json();
      console.log("Azure response status:", response.status);
      
      if (response.ok && data.choices && data.choices.length > 0) {
        return { success: true, text: data.choices[0].message.content };
      } else {
        console.error("Azure error:", data);
        return { success: false, text: "عذراً، لم أستطع الرد الآن." };
      }
    } catch (e) {
      console.error("Fetch error:", e);
      return { success: false, text: "في مشكلة في الشبكة، جرب تاني." };
    }
  }
};

export default azureService;
