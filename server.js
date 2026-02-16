const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات تليجرام
const TELEGRAM_BOT_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_CHAT_ID = "1814331589";
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

app.use(cors());
app.use(express.json());

const voicesDir = path.join(__dirname, 'voices');
if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir);

// وظيفة التنظيف: مسح الملفات الأقدم من 7 أيام
const cleanOldVoices = () => {
  const expirationTime = 7 * 24 * 60 * 60 * 1000; // 7 أيام بالملي ثانية
  fs.readdir(voicesDir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(voicesDir, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && (Date.now() - stats.mtimeMs > expirationTime)) {
          fs.unlink(filePath, () => console.log('🗑️ تم مسح ملف قديم:', file));
        }
      });
    });
  });
};
setInterval(cleanOldVoices, 12 * 60 * 60 * 1000); // فحص كل 12 ساعة

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, voicesDir),
  filename: (req, file, cb) => cb(null, `voice-${Date.now()}${path.extname(file.originalname) || '.ogg'}`)
});
const upload = multer({ storage: storage });

app.post('/upload-voice', upload.single('voice'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const fileUrl = `${req.protocol}://${req.get('host')}/voices/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

app.post('/api/orders', async (req, res) => {
  const { phone, address, items, voiceUrl } = req.body;
  const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  
  const msg = `🆕 <b>طلب جديد من Zayed-ID</b>\n` +
              `______________________________\n\n` +
              `📞 <b>الهاتف:</b> ${phone}\n` +
              `📍 <b>العنوان:</b> ${address}\n` +
              `🛒 <b>المنتجات:</b> ${Array.isArray(items) ? items.join(', ') : items}\n` +
              `${voiceUrl ? `🎤 <b>بصمة صوتية:</b> ${voiceUrl}` : ''}\n` +
              `______________________________\n` +
              `🆔 <b>رقم الطلب:</b> ${orderId}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "✅ تم التوصيل", callback_data: "done" }, { text: "🚚 جاري التوصيل", callback_data: "shipping" }],
      [{ text: "📞 اتصل بالعميل", url: `tel:${phone}` }]
    ]
  };

  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, msg, { parse_mode: 'HTML', reply_markup: JSON.stringify(keyboard) });
    res.json({ success: true, orderId });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.use('/voices', express.static(voicesDir));
app.get('/', (req, res) => res.send('🚀 Zayed-ID Server Active - Cleaning every 7 days'));

app.listen(PORT, '0.0.0.0', () => console.log('Server is running...'));
