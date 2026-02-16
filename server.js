const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(bodyParser.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const CHAT_ID = process.env.CHAT_ID || "1814331589";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.post('/send-order', async (req, res) => {
  try {
    const { phone, address, items } = req.body;
    const orderId = Math.floor(100000 + Math.random() * 900000);
    
    // تنسيق الرسالة بنفس شكل الصورة الاحترافي
    let message = `🆕 *طلب تم التوصيل من Zayed-ID*\n` +
                  `______________________________\n\n` +
                  `👤 *معلومات العميل:*\n` +
                  `📞 ${phone}\n` +
                  `📍 ${address}\n\n` +
                  `🛒 *المنتجات المطلوبة:*\n` +
                  `______________________________\n` +
                  `1. ${Array.isArray(items) ? items.join(', ') : items}\n` +
                  `______________________________\n\n` +
                  `🔻 *الحالة:* جديد\n` +
                  `🆔 *رقم الطلب:* ORD-${orderId}`;

    // إضافة الأزرار التفاعلية (Inline Keyboard)
    const keyboard = {
      inline_keyboard: [
        [{ text: "✅ تم التوصيل", callback_data: "done" }, { text: "🚚 جاري التوصيل", callback_data: "shipping" }],
        [{ text: "📍 عرض العنوان", callback_data: "location" }, { text: "📞 الاتصال بالعميل", url: `tel:${phone}` }]
      ]
    };

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: JSON.stringify(keyboard)
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ success: false });
  }
});

// استقبال ورفع البصمة الصوتية لتظهر تحت الطلب
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    if (req.file) {
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      formData.append('voice', req.file.buffer, { filename: 'voice.m4a' });
      
      await axios.post(`${TELEGRAM_API}/sendVoice`, formData, {
        headers: formData.getHeaders()
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
