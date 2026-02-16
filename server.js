const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const CHAT_ID = process.env.CHAT_ID || "1814331589";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.get('/', (req, res) => {
  res.send('🚀 Zayed-ID Backend is Live!');
});

app.post('/send-order', async (req, res) => {
  try {
    const { phone, address, items, rawText } = req.body;
    let message = `🧾 *طلب جديد*\n\n👤 الهاتف: ${phone}\n📍 العنوان: ${address}\n🛒 الأصناف: ${items.join(', ')}`;
    
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// السر هنا: 0.0.0.0
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
