const API_KEY = "DwFjOWx31jB369PeEpIQGXc2g7qXGD9GJRGUd2D2VhwQgSuHzjFAJQQJ99CBACHYHv6XJ3w3AAAAACOGTZ35";
const ENDPOINT = "https://sherifghazi-7065-resource.cognitiveservices.azure.com/";
const DEPLOYMENT_NAME = "gpt-5.1-chat";

const azureService = {
  askAI: async (userMessage) => {
    try {
      console.log("🚀 Sending to Azure AI...");
      
      // رد تجريبي مؤقت (بدون استدعاء حقيقي لـ Azure)
      return { 
        success: true, 
        text: "مطبخ الشيف زايد تحت أمرك! هناخد طلبك دلوقتي. عايز إيه النهاردة؟" 
      };
      
    } catch (e) {
      console.error("Error:", e);
      return { success: false, text: "في مشكلة في الشبكة، جرب تاني." };
    }
  }
};

export default azureService;
