const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
// إعداد multer لاستقبال الملفات الصوتية في الذاكرة
const upload = multer({ storage: multer.memoryStorage() });

app.use(bodyParser.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const CHAT_ID = process.env.CHAT_ID || "1814331589";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.get('/', (req, res) => {
  res.send('🚀 Zayed-ID Backend is Live and Improved!');
});

// المسار الأصلي لإرسال الطلبات النصية
app.post('/send-order', async (req, res) => {
  try {
    const { phone, address, items } = req.body;
    let message = `🧾 *طلب جديد*\n\n👤 الهاتف: ${phone}\n📍 العنوان: ${address}\n🛒 الأصناف: ${Array.isArray(items) ? items.join(', ') : items}`;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error sending message:", error.message);
    res.status(500).json({ success: false });
  }
});

// المسار الجديد لحل مشكلة الـ SyntaxError في الأندرويد
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  console.log("🎤 Received audio request - Preventing app crash...");
  // بنرد بـ success عشان الأبلكيشن يكمل إرسال الطلب النصي وميقفش
  res.status(200).json({ success: true, message: "Audio endpoint reached" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
