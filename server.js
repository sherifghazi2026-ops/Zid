const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// الإعدادات - يفضل رفعها كـ Variables في Railway
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const CHAT_ID = process.env.CHAT_ID || "1814331589";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// نقطة اختبار للسيرفر
app.get('/', (req, res) => {
  res.send('🚀 Zayed-ID Backend is Live and Running!');
});

// استقبال الطلبات من الأبليكيشن وإرسالها للتليجرام
app.post('/send-order', async (req, res) => {
  try {
    const { phone, address, items, rawText } = req.body;

    let message = `🧾 *طلب جديد من تطبيق Zayed-ID*\n\n`;
    message += `👤 الهاتف: \`${phone}\` \n`;
    message += `📍 العنوان: ${address}\n\n`;
    message += `🛒 *الأصناف:* \n`;
    
    if (items && Array.isArray(items)) {
      items.forEach((it, i) => {
        message += `${i + 1}. ${it}\n`;
      });
    }

    if (rawText) {
      message += `\n📝 *ملاحظات:* ${rawText}`;
    }

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    res.status(200).json({ success: true, message: 'Sent to Telegram' });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// تشغيل السيرفر مع ربطه بكل الواجهات (0.0.0.0)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Zayed-ID Server is running on port ${PORT}`);
});
