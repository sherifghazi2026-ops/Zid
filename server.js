const express = require('express');
const app = express();

app.use(express.json({ limit: '50mb' }));

let orders = [];

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

// ==================== استقبال الطلب ====================
app.post('/send-order', (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  orders.push({
    id: orderId,
    phone,
    address,
    items: Array.isArray(items) ? items : [items],
    date: new Date().toISOString(),
    status: 'جديد'
  });
  
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
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
});
