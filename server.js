const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// إعدادات البوت (يفضل ترفعها كـ Variables في Railway)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const CHAT_ID = process.env.CHAT_ID || "1814331589";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// 1. نقطة اختبار للسيرفر
app.get('/', (req, res) => {
  res.send('🚀 Zayed-ID Backend is Live and Running!');
});

// 2. استقبال الطلبات من تطبيق الموبايل وإرسالها للتليجرام
app.post('/send-order', async (req, res) => {
  const { phone, address, items, rawText } = req.body;

  let message = `🧾 *طلب جديد من التطبيق*\n\n`;
  message += `👤 الهاتف: ${phone}\n`;
  message += `📍 العنوان: ${address}\n\n`;
  message += `🛒 الأصناف:\n${items.map((it, i) => `${i+1}. ${it}`).join('\n')}\n`;
  if (rawText) message += `\n📝 ملاحظات: ${rawText}`;

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    res.status(200).json({ success: true, message: 'Order sent to Telegram' });
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    res.status(500).json({ success: false, error: 'Failed to send order' });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

