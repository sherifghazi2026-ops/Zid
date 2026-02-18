const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json({ limit: '50mb' }));

// ==================== إعدادات البوتات ====================
const BOTS = {
  main: {
    token: "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A",
    api: "https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A"
  },
  ironing: {
    token: "8216174777:AAERldfUvyWcDsXWPHLrnvz4bmmkcQiTzus",
    api: "https://api.telegram.org/bot8216174777:AAERldfUvyWcDsXWPHLrnvz4bmmkcQiTzus"
  }
};

const DRIVER_CHANNEL_ID = "1814331589";

// تخزين البيانات
let customers = {};
let orders = [];
let pendingOrders = {}; // للطلبات المعلقة بانتظار رقم التليفون

// ==================== دوال مساعدة ====================
const sendMessage = async (chatId, text, keyboard = null, botType = 'main') => {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    
    const response = await fetch(`${BOTS[botType].api}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error(`خطأ في إرسال رسالة للبوت ${botType}:`, error);
  }
};

const sendVoice = async (chatId, voiceUrl, botType = 'main') => {
  try {
    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        voice: voiceUrl
      })
    });
    return await response.json();
  } catch (error) {
    console.error(`خطأ في إرسال الصوت للبوت ${botType}:`, error);
  }
};

const editMessage = async (chatId, messageId, text, keyboard = null, botType = 'main') => {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    
    const response = await fetch(`${BOTS[botType].api}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error(`خطأ في تعديل رسالة للبوت ${botType}:`, error);
  }
};

// ==================== فحص جميع المسارات ====================
app.get('/routes', (req, res) => {
  res.json({
    availableRoutes: [
      '/',
      '/send-order (POST)',
      '/upload-voice (POST)',
      '/voices/:filename (GET)',
      '/order-status/:orderId (GET)',
      '/active-orders (GET)',
      '/webhook (POST)',
      '/routes (GET)'
    ]
  });
});

// ==================== جلب حالة الطلب ====================
app.get('/order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.id === orderId);

  if (order) {
    res.json({ success: true, status: order.status, orderId });
  } else {
    res.json({ success: false, status: 'غير موجود', orderId });
  }
});

// ==================== جلب الطلبات النشطة ====================
app.get('/active-orders', (req, res) => {
  const activeOrders = orders.filter(o => o.status !== 'تم التوصيل');
  
  const formattedOrders = activeOrders.map(o => ({
    id: o.id,
    phone: o.phone,
    address: o.address,
    serviceName: o.serviceName || 'طلب',
    status: o.status,
    date: o.date
  }));

  res.json({ 
    success: true, 
    orders: formattedOrders
  });
});

// ==================== رفع الملفات الصوتية ====================
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;

    if (!audio) {
      return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });
    }

    console.log('📥 تم استقبال ملف صوتي');

    const audioBuffer = Buffer.from(audio, 'base64');
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = `/tmp/${fileName}`;

    fs.writeFileSync(filePath, audioBuffer);

    const fileUrl = `https://zayedid-production.up.railway.app/voices/${fileName}`;

    console.log('🔗 رابط الملف الصوتي:', fileUrl);

    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('❌ خطأ في رفع الصوت:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== خدمة الملفات الصوتية ====================
app.get('/voices/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = `/tmp/${filename}`;

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('الملف غير موجود');
  }
});

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.send('✅ بوت Zayed-ID شغال على Railway!');
});

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);

  const { phone, address, items, rawText, voiceUrl, serviceName = 'سوبر ماركت', totalPrice } = req.body;

  // اختيار البوت المناسب
  const botType = serviceName === 'مكوجي' ? 'ironing' : 'main';
  
  const orderId = serviceName === 'مكوجي' ? 'IRN-' + Math.floor(Math.random() * 1000000) : 'ORD-' + Math.floor(Math.random() * 1000000);

  // حالة الطلب حسب نوع الخدمة
  let initialStatus = 'تم استلام طلبك';
  if (serviceName === 'سوبر ماركت') initialStatus = 'جاري تجهيز الطلب';

  const newOrder = {
    id: orderId,
    phone,
    address,
    items: Array.isArray(items) ? items.join('، ') : items,
    fullText: rawText,
    date: new Date().toLocaleString('ar-EG'),
    status: initialStatus,
    customerChatId: phone,
    messageId: null,
    botType,
    serviceName,
    totalPrice: totalPrice || 0
  };

  orders.push(newOrder);

  // رسالة للمندوبين مع أزرار القبول فقط
  const message =
    `🆕 <b>طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address}\n\n` +
    `🛒 <b>المنتجات المطلوبة:</b>\n` +
    `──────────────────\n` +
    (Array.isArray(items) ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : items) + `\n` +
    `──────────────────\n` +
    `💰 <b>الإجمالي:</b> ${totalPrice} ج\n\n` +
    `🔻 <b>الحالة:</b> ${initialStatus}\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;

  // أزرار القبول فقط (بدون أزرار تغيير الحالة)
  const keyboard = [
    [
      { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
    ]
  ];

  const response = await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);

  if (response && response.ok) {
    newOrder.messageId = response.result.message_id;

    if (voiceUrl) {
      setTimeout(async () => {
        await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);
      }, 2000);
    }
  }

  res.json({ success: true, orderId });
});

// ==================== معالجة ضغط الأزرار من المندوبين ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const data = callback.data;

    await fetch(`https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id })
    });

    const [action, orderId] = data.split('_');

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      await sendMessage(chatId, '❌ الطلب غير موجود');
      return res.sendStatus(200);
    }

    // قبول الطلب
    if (action === 'accept') {
      // تخزين الطلب مؤقتاً لاستكمال البيانات
      pendingOrders[orderId] = order;
      
      // حذف أزرار القبول
      await editMessage(chatId, messageId, callback.message.text, [], order.botType);
      
      // طلب رقم التليفون من المندوب
      await sendMessage(chatId, 
        `📞 تم قبول الطلب #${orderId}\n\n` +
        `الرجاء إرسال رقم التليفون للتواصل مع العميل:`,
        null,
        order.botType
      );
    }

    // تحديث الحالة بعد إدخال رقم التليفون
    else if (action === 'status') {
      const [_, orderId, newStatus] = data.split('_');
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        order.status = newStatus === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
        
        // تحديث الرسالة
        const updatedMessage = callback.message.text.replace(/🔻 <b>الحالة:<\/b> .+/, `🔻 <b>الحالة:</b> ${order.status}`);
        await editMessage(chatId, messageId, updatedMessage, [
          [
            { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
            { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
          ]
        ], order.botType);
      }
    }
  }

  // معالجة الرسائل النصية (رقم التليفون بعد القبول)
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    // البحث عن طلب معلق لهذا المندوب
    const pendingOrder = Object.values(pendingOrders).find(o => o.phone === text);
    
    if (pendingOrder && text.match(/^01[0-9]{9}$/)) {
      // تحديث الطلب برقم التليفون
      pendingOrder.driverPhone = text;
      
      // إرسال طلب السعر
      await sendMessage(chatId,
        `💰 تم تسجيل رقم التليفون\n\n` +
        `الرجاء إدخال السعر الإجمالي للطلب:`,
        null,
        pendingOrder.botType
      );
      
      // تخزين مؤقت للمرحلة التالية
      pendingOrders[`price_${pendingOrder.id}`] = pendingOrder;
      delete pendingOrders[pendingOrder.id];
    }
    
    // استقبال السعر
    else if (text.match(/^\d+$/)) {
      const priceOrder = Object.values(pendingOrders).find(o => o.id && o.id.includes('price_'));
      if (priceOrder) {
        priceOrder.totalPrice = parseInt(text);
        
        // إرسال تأكيد للمندوب
        await sendMessage(chatId,
          `✅ تم تأكيد الطلب\n\n` +
          `💰 السعر الإجمالي: ${priceOrder.totalPrice} ج\n` +
          `🚚 تكلفة التوصيل: 0 ج\n\n` +
          `الآن يمكنك تحديث الحالة باستخدام الأزرار:`,
          [
            [
              { text: '🚚 جاري التوصيل', callback_data: `status_${priceOrder.id}_delivering` },
              { text: '✅ تم التوصيل', callback_data: `status_${priceOrder.id}_done` }
            ]
          ],
          priceOrder.botType
        );
        
        delete pendingOrders[`price_${priceOrder.id}`];
      }
    }
  }

  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت تليجرام شغال على بورت ${PORT}`);
  console.log(`🔗 رابط السيرفر: https://zayedid-production.up.railway.app`);
  console.log(`🤖 البوت الرئيسي: 8216105936`);
  console.log(`🤖 بوت المكوجي: 8216174777`);
});
