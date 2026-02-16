const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const CHAT_ID = process.env.CHAT_ID || "1814331589";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.get('/', (req, res) => {
  res.send('🚀 Zayed-ID Backend is Live and Updated!');
});

app.post('/send-order', async (req, res) => {
  try {
    const { phone, address, items } = req.body;
    
    // تنسيق الرسالة بشكل أفضل
    let itemsList = Array.isArray(items) ? items.join(', ') : items;
    let message = `🧾 *طلب جديد*\n\n👤 الهاتف: ${phone}\n📍 العنوان: ${address || 'غير محدد'}\n🛒 الأصناف: ${itemsList}`;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    console.log("✅ Order sent to Telegram successfully");
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error sending to Telegram:", error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
