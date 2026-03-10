import Groq from 'groq-sdk';

// ⚠️ تنبيه أمني: لا تضع المفتاح مباشرة في الكود أبداً!
// ✅ الطريقة الصحيحة: استخدام متغيرات البيئة (Environment Variables)

// 👇 اقرأ المفتاح من متغير البيئة EXPO_PUBLIC_GROQ_API_KEY
// يجب أن تضيف هذا المتغير في ملف .env في مجلد المشروع
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// إذا لم يتم العثور على المفتاح، نعرض خطأ واضحاً
if (!GROQ_API_KEY) {
  console.error('❌ لم يتم العثور على مفتاح Groq API. تأكد من تعريف EXPO_PUBLIC_GROQ_API_KEY في ملف .env');
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

class GroqService {
  async ask(prompt, options = {}) {
    const { conversationHistory = [] } = options;

    try {
      const messages = [
        {
          role: 'system',
          content: 'أنت مساعد اسمك "مُنجز". رد بالعامية المصرية بطريقة ودية وطبيعية. ردودك قصيرة ومباشرة.'
        }
      ];

      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });

      messages.push({
        role: 'user',
        content: prompt
      });

      console.log('🚀 إرسال إلى Groq...');

      // استخدام أحد الموديلات المتاحة
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 200,
      });

      const reply = completion.choices[0]?.message?.content || 'آسف، ما فهمتش';
      
      console.log('✅ Groq استجاب:', reply.substring(0, 50) + '...');

      return {
        success: true,
        text: reply
      };

    } catch (error) {
      console.error('❌ Groq error:', error);
      
      const fallbackReplies = [
        'آسف، حصل خطأ. حاول تاني؟',
        'عذراً، مش قادر أرد دلوقتي',
        'فيه مشكلة في الاتصال. كلمني بعد شوية'
      ];
      
      return {
        success: true,
        text: fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)]
      };
    }
  }
}

export default new GroqService();
