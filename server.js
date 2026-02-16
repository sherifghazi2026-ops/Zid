const express = require('express');
const app = express();

app.use(express.json({ limit: '50mb' }));

// ==================== إعدادات البوت ====================
const TELEGRAM_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DRIVER_CHANNEL_ID = "1814331589";

let orders = [];

// ==================== دوال مساعدة ====================
const sendToTelegram = async (message, keyboard = null) => {
  try {
    const payload = {
      chat_id: DRIVER_CHANNEL_ID,
      text: message,
      parse_mode: 'HTML'
    };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('خطأ في إرسال رسالة:', error);
  }
};

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ شغال',
    time: new Date().toISOString() 
  });
});

// ==================== جلب الطلبات الجديدة ====================
app.get('/api/orders/new', (req, res) => {
  res.json({ 
    success: true, 
    orders: orders.map(o => ({
      id: o.id,
      phone: o.phone,
      address: o.address,
      items: o.items || [],
      status: o.status || 'جديد',
      createdAt: o.date
    }))
  });
});

// ==================== رفع الصوت ====================
app.post('/upload-voice', (req, res) => {
  console.log('📥 طلب رفع صوت');
  res.json({ success: true, url: 'https://example.com/voice.ogg' });
});

// ==================== استقبال الطلب وإرساله لتليجرام ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  const newOrder = {
    id: orderId,
    phone,
    address,
    items: Array.isArray(items) ? items : [items],
    date: new Date().toISOString(),
    status: 'جديد'
  };
  
  orders.push(newOrder);
  
  // تجهيز الرسالة
  const itemsList = Array.isArray(items) ? items.join('، ') : items;
  const message = 
    `🆕 <b>طلب جديد من Zayed-ID</b>\n` +
    `──────────────────\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n\n` +
    `🛒 <b>المنتجات:</b>\n` +
    `${itemsList}\n` +
    `──────────────────\n` +
    `🆔 <code>${orderId}</code>`;
  
  // إرسال لتليجرام
  await sendToTelegram(message);
  
  res.json({ success: true, orderId });
});

// ==================== مسار اختبار ====================
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'السيرفر شغال!',
    time: new Date().toISOString()
  });
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر شغال على بورت ${PORT}`);
});
