const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== إعدادات البوت ====================
const TELEGRAM_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DRIVER_CHANNEL_ID = "1814331589";

// تخزين البيانات
let customers = {};
let orders = [];

// ==================== دوال مساعدة ====================
const sendMessage = async (chatId, text, keyboard = null) => {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
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
    status: '✅ بوت Zayed-ID شغال على Railway!',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /': 'هذه الصفحة',
      'GET /api/orders/new': 'جلب الطلبات الجديدة',
      'POST /send-order': 'إرسال طلب جديد',
      'POST /upload-voice': 'رفع ملف صوتي'
    },
    stats: {
      totalOrders: orders.length
    }
  });
});

// ==================== جلب الطلبات الجديدة ====================
app.get('/api/orders/new', (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const newOrders = orders.filter(order => {
      const orderDate = new Date(order.date || 0);
      return orderDate > oneDayAgo;
    });
    
    res.json({ 
      success: true, 
      orders: newOrders.map(o => ({
        id: o.id,
        phone: o.phone,
        address: o.address,
        items: Array.isArray(o.items) ? o.items : [o.items],
        status: o.status || 'جديد',
        createdAt: o.date
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== رفع الملفات الصوتية ====================
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });
    }

    console.log('📥 تم استقبال ملف صوتي');
    
    // إنشاء مجلد uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    // حفظ الملف
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = path.join(uploadsDir, fileName);
    const audioBuffer = Buffer.from(audio, 'base64');
    fs.writeFileSync(filePath, audioBuffer);
    
    const fileUrl = `https://zayedid-production.up.railway.app/uploads/${fileName}`;
    
    res.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error('❌ خطأ في رفع الصوت:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== خدمة الملفات الصوتية ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== استقبال الطلبات ====================
app.post('/send-order', (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items, rawText } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    items: Array.isArray(items) ? items : (items ? [items] : []),
    date: new Date().toISOString(),
    status: 'جديد'
  };
  
  orders.push(newOrder);
  console.log(`✅ تم حفظ الطلب ${orderId}`);
  
  res.json({ success: true, orderId, message: 'تم استلام الطلب' });
});

// ==================== مسار اختبار بسيط ====================
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
  console.log(`🚀 سيرفر Zayed-ID شغال على بورت ${PORT}`);
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
});
