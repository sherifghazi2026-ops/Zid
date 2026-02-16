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
    
    // إضافة الأزرار إذا موجودة
    if (keyboard) {
      payload.reply_markup = JSON.stringify({ 
        inline_keyboard: keyboard 
      });
      console.log('📋 إرسال مع أزرار:', JSON.stringify(keyboard));
    }
    
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('📥 رد تليجرام:', result.ok ? '✅ تم الإرسال' : '❌ فشل');
    return result;
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

// ==================== جلب الطلبات النشطة ====================
app.get('/active-orders', (req, res) => {
  const activeOrders = orders.filter(o => o.status !== 'تم التوصيل');
  
  res.json({ 
    success: true, 
    orders: activeOrders.map(o => ({
      id: o.id,
      phone: o.phone,
      address: o.address,
      items: o.items || [],
      status: o.status || 'جديد',
      serviceName: o.serviceName || 'سوبر ماركت',
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
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items, serviceName = 'سوبر ماركت' } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    items: Array.isArray(items) ? items : [items],
    serviceName,
    date: new Date().toISOString(),
    status: 'جديد'
  };
  
  orders.push(newOrder);
  
  // تجهيز الأزرار الأربعة
  const keyboard = [
    [
      { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
      { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
    ],
    [
      { text: '📞 اتصال', callback_data: `call_${orderId}` },
      { text: '📍 العنوان', callback_data: `address_${orderId}` }
    ]
  ];
  
  // تجهيز الرسالة
  const itemsList = Array.isArray(items) ? items.join('، ') : items;
  const message = 
    `🆕 <b>طلب جديد من Zayed-ID</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n\n` +
    `🛒 <b>المشتجات المطلوبة:</b>\n` +
    `──────────────────\n` +
    `${itemsList}\n` +
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> جديد\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;
  
  // إرسال لتليجرام مع الأزرار
  await sendToTelegram(message, keyboard);
  
  res.json({ success: true, orderId });
});

// ==================== ويب هوك لاستقبال الأزرار ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  console.log('🔄 استقبال Webhook:', JSON.stringify(update).substring(0, 200));
  
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const messageId = callback.message.message_id;
    const chatId = callback.message.chat.id;
    
    // تحليل البيانات
    const [action, orderId, param] = data.split('_');
    
    // العثور على الطلب
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      // رد سريع
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '❌ الطلب غير موجود',
          show_alert: true
        })
      });
      return res.sendStatus(200);
    }

    // معالجة الإجراءات
    if (action === 'status') {
      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      order.status = newStatus;
      
      // تجهيز الأزرار المحدثة
      const keyboard = newStatus === 'تم التوصيل' ? [] : [
        [
          { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
          { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
        ],
        [
          { text: '📞 اتصال', callback_data: `call_${orderId}` },
          { text: '📍 العنوان', callback_data: `address_${orderId}` }
        ]
      ];
      
      // تحديث الرسالة
      const newText = callback.message.text.replace(/🔻 <b>الحالة:<\/b> [^\n]+/, `🔻 <b>الحالة:</b> ${newStatus}`);
      
      await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'HTML',
          reply_markup: keyboard.length ? JSON.stringify({ inline_keyboard: keyboard }) : undefined
        })
      });
      
      // رد على الضغطة
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: `✅ تم تغيير الحالة إلى ${newStatus}`,
          show_alert: false
        })
      });
    }
    else if (action === 'call') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: `📞 رقم العميل: ${order.phone}`,
          show_alert: true
        })
      });
    }
    else if (action === 'address') {
      const itemsList = Array.isArray(order.items) ? order.items.join('، ') : order.items;
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: `📍 ${order.address}\n🛒 ${itemsList}`,
          show_alert: true
        })
      });
    }
  }
  
  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر شغال على بورت ${PORT}`);
  console.log(`📱 active-orders: /active-orders`);
  console.log(`🤖 webhook: /webhook`);
});
