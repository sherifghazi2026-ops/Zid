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

const sendVoice = async (chatId, voiceUrl) => {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        voice: voiceUrl
      })
    });
    return await response.json();
  } catch (error) {
    console.error('خطأ في إرسال الصوت:', error);
  }
};

const editMessage = async (chatId, messageId, text, keyboard = null) => {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('خطأ في تعديل رسالة:', error);
  }
};

// ==================== رفع الملفات الصوتية ====================
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });
    }

    console.log('📥 تم استقبال ملف صوتي، حجمه:', Math.floor(audio.length / 1024), 'KB');

    // تحويل Base64 إلى Buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // التأكد من وجود مجلد uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    // إنشاء اسم ملف فريد
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = path.join(uploadsDir, fileName);
    
    // حفظ الملف
    fs.writeFileSync(filePath, audioBuffer);
    
    // رابط الملف الصوتي
    const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-production.up.railway.app`;
    const fileUrl = `${baseUrl}/uploads/${fileName}`;
    
    console.log('🔗 رابط الملف الصوتي:', fileUrl);
    
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

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ بوت Zayed-ID شغال على Railway!',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /': 'هذه الصفحة',
      'GET /api/orders/new': 'جلب الطلبات الجديدة (آخر 24 ساعة)',
      'POST /send-order': 'إرسال طلب جديد',
      'POST /upload-voice': 'رفع ملف صوتي',
      'POST /clear-orders': 'مسح جميع الطلبات',
      'POST /webhook': 'ويب هوك تليجرام (للأزرار)'
    },
    stats: {
      totalOrders: orders.length
    }
  });
});

// ==================== جلب الطلبات الجديدة فقط ====================
app.get('/api/orders/new', (req, res) => {
  try {
    // فلترة آخر 24 ساعة
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const newOrders = orders.filter(order => {
      const orderDate = new Date(order.date || 0);
      return orderDate > oneDayAgo;
    });
    
    console.log(`📤 إرسال ${newOrders.length} طلب جديد`);
    res.json({ 
      success: true, 
      orders: newOrders.map(o => ({
        id: o.id,
        phone: o.phone,
        address: o.address,
        items: Array.isArray(o.items) ? o.items : [o.items],
        status: o.status || 'جديد',
        createdAt: o.date,
        source: 'telegram'
      }))
    });
  } catch (error) {
    console.error('خطأ:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== مسح جميع الطلبات ====================
app.post('/clear-orders', (req, res) => {
  try {
    orders = [];
    customers = {};
    console.log('🧹 تم مسح جميع الطلبات من السيرفر');
    res.json({ success: true, message: 'تم المسح بنجاح' });
  } catch (error) {
    console.error('خطأ في المسح:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items, rawText, voiceUrl } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    items: Array.isArray(items) ? items : (items ? [items] : []),
    fullText: rawText || '',
    date: new Date().toISOString(),
    status: 'جديد',
    customerChatId: phone,
    messageId: null,
    voiceUrl
  };
  
  orders.push(newOrder);
  
  // رسالة منسقة للمندوبين
  const itemsList = Array.isArray(newOrder.items) ? newOrder.items.join('، ') : newOrder.items;
  const message = 
    `🆕 <b>طلب جديد من Zayed-ID</b>\n` +
    `──────────────────\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n\n` +
    `🛒 <b>المنتجات المطلوبة:</b>\n` +
    `──────────────────\n` +
    `${itemsList}\n` +
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> جديد\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;
  
  // الأزرار للمندوبين
  const keyboard = [
    [
      { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
      { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
    ],
    [
      { text: '📞 الاتصال بالعميل', callback_data: `call_${orderId}` },
      { text: '📍 عرض العنوان', callback_data: `address_${orderId}` }
    ]
  ];
  
  // إرسال الرسالة إلى قناة المندوبين مع الأزرار
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: DRIVER_CHANNEL_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({ inline_keyboard: keyboard })
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      newOrder.messageId = result.result.message_id;
      console.log(`✅ تم إرسال الطلب ${orderId} إلى القناة مع أزرار`);

      // إذا في تسجيل صوتي، أرسله بعد الرسالة
      if (voiceUrl) {
        const voiceResult = await sendVoice(DRIVER_CHANNEL_ID, voiceUrl);
        if (voiceResult && voiceResult.ok) {
          console.log(`✅ تم إرسال التسجيل الصوتي للطلب ${orderId}`);
        } else {
          console.error('❌ فشل إرسال الصوت:', voiceResult);
        }
      }
    } else {
      console.error('❌ فشل إرسال الطلب:', result);
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال الطلب لتليجرام:', error);
  }
  
  res.json({ success: true, orderId, message: 'تم استلام الطلب' });
});

// ==================== معالجة ضغط الأزرار من المندوبين ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  // معالجة الضغط على الأزرار
  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const data = callback.data;
    
    // تأكيد استلام الضغط
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id })
    });
    
    // تحليل البيانات
    const parts = data.split('_');
    const action = parts[0];
    const orderId = parts[1];
    const param = parts[2];
    
    // العثور على الطلب
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      await sendMessage(chatId, '❌ الطلب غير موجود');
      return res.sendStatus(200);
    }

    if (action === 'status') {
      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      
      // تحديث الحالة
      order.status = newStatus;
      
      // تحديث رسالة المندوبين
      let updatedMessage = callback.message.text;
      updatedMessage = updatedMessage.replace(/🔻 <b>الحالة:<\/b> [^<]+/, `🔻 <b>الحالة:</b> ${newStatus}`);
      
      await editMessage(chatId, messageId, updatedMessage, [
        [
          { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
          { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
        ],
        [
          { text: '📞 الاتصال بالعميل', callback_data: `call_${orderId}` },
          { text: '📍 عرض العنوان', callback_data: `address_${orderId}` }
        ]
      ]);

      // إرسال إشعار للتحديث
      const statusIcon = newStatus === 'جاري التوصيل' ? '🚚' : '✅';
      await sendMessage(DRIVER_CHANNEL_ID,
        `${statusIcon} <b>تحديث الطلب #${orderId}</b>\n` +
        `الحالة الجديدة: ${newStatus}`
      );
    }
    else if (action === 'call') {
      await sendMessage(chatId, `📞 <b>رقم العميل:</b>\n${order.phone}`);
    }
    else if (action === 'address') {
      const itemsList = Array.isArray(order.items) ? order.items.join('، ') : order.items;
      await sendMessage(chatId,
        `📍 <b>العنوان:</b>\n${order.address}\n\n` +
        `📝 <b>المنتجات:</b>\n${itemsList}`
      );
    }
  }

  // معالجة الرسائل النصية
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === '/start') {
      await sendMessage(chatId,
        `👋 <b>مرحباً بك في نظام إدارة الطلبات Zayed-ID</b>\n\n` +
        `📋 الأوامر المتاحة:\n` +
        `/stats - عرض إحصائيات سريعة\n` +
        `/orders - عرض جميع الطلبات`
      );
    }
    else if (text === '/stats') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'جديد').length,
        delivering: orders.filter(o => o.status === 'جاري التوصيل').length,
        done: orders.filter(o => o.status === 'تم التوصيل').length,
        last24h: orders.filter(o => new Date(o.date || 0) > oneDayAgo).length
      };

      await sendMessage(chatId,
        `📊 <b>إحصائيات الطلبات</b>\n\n` +
        `📦 إجمالي: ${stats.total}\n` +
        `🆕 جديد: ${stats.new}\n` +
        `🚚 جاري التوصيل: ${stats.delivering}\n` +
        `✅ تم التوصيل: ${stats.done}\n` +
        `⏱️ آخر 24 ساعة: ${stats.last24h}`
      );
    }
    else if (text === '/orders') {
      if (orders.length === 0) {
        await sendMessage(chatId, 'لا توجد طلبات حالياً');
      } else {
        let response = '📋 <b>جميع الطلبات:</b>\n\n';
        orders.slice(-5).reverse().forEach(order => {
          const statusIcon = order.status === 'جديد' ? '🆕' :
                            order.status === 'جاري التوصيل' ? '🚚' : '✅';
          response += `${statusIcon} طلب #${order.id}\n`;
          response += `📞 ${order.phone}\n`;
          response += `📍 ${order.address}\n`;
          response += `──────────────\n`;
        });
        await sendMessage(chatId, response);
      }
    }
  }

  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر Zayed-ID شغال على بورت ${PORT}`);
  console.log(`🔗 الرابط: https://zayedid-production.up.railway.app`);
  console.log(`📱 المسارات المتاحة:`);
  console.log(`   GET  /              - الصفحة الرئيسية`);
  console.log(`   GET  /api/orders/new - الطلبات الجديدة`);
  console.log(`   POST /send-order     - إرسال طلب`);
  console.log(`   POST /upload-voice   - رفع صوت`);
  console.log(`   POST /clear-orders   - مسح الكل`);
  console.log(`   POST /webhook        - ويب هوك تليجرام`);
});
