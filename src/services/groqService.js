import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ Groq API Key missing in .env');
}

const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

class GroqService {
  async ask(prompt, options = {}) {
    const { conversationHistory = [] } = options;
    try {
      const messages = [{ role: 'system', content: 'أنت مساعد اسمك "مُنجز". رد بالعامية المصرية.' }];
      conversationHistory.forEach(msg => messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text }));
      messages.push({ role: 'user', content: prompt });
      const completion = await groq.chat.completions.create({
        messages, model: 'llama-3.1-8b-instant', temperature: 0.7, max_tokens: 200,
      });
      const reply = completion.choices[0]?.message?.content || 'آسف، ما فهمتش';
      return { success: true, text: reply };
    } catch (error) {
      const fallback = ['آسف، حصل خطأ. حاول تاني؟', 'عذراً، مش قادر أرد دلوقتي', 'فيه مشكلة في الاتصال. كلمني بعد شوية'];
      return { success: true, text: fallback[Math.floor(Math.random() * fallback.length)] };
    }
  }
}

export default new GroqService();
