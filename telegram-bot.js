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
  },
  offers: {
    token: "8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4",
    api: "https://api.telegram.org/bot8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4"
  }
};

const DRIVER_CHANNEL_ID = "1814331589";

// تخزين البيانات في الذاكرة
let orders = [];
let offers = [];

// ==================== دوال المراسلة ====================
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
    console.error(`خطأ إرسال (${botType}):`, error);
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
    console.error(`خطأ تعديل (${botType}):`, error);
  }
};

// ==================== حفظ حالة الطلب ====================
app.get('/order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.id === orderId);
  if (order) {
    res.json({ 
      success: true, 
      status: order.status,
      driverPhone: order.driverPhone || null 
    });
  } else {
    res.json({ success: false, status: 'غير موجود' });
  }
});

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  const { phone, address, items, serviceName = 'سوبر ماركت', totalPrice } = req.body;
  const botType = serviceName === 'مكوجي' ? 'ironing' : 'main';
  const orderId = (serviceName === 'مكوجي' ? 'IRN-' : 'ORD-') + Math.floor(100000 + Math.random() * 900000);

  const newOrder = {
    id: orderId,
    phone,
    address,
    status: 'قيد الانتظار',
    serviceName,
    botType,
    driverPhone: null // رقم المندوب هيضاف بعدين
  };

  orders.push(newOrder);

  // الرسالة التي ستظهر للمندوب في القناة
  const message = 
    `🆕 <b>طلب جديد مستلم</b>\n` +
    `──────────────────\n` +
    `📞 <b>الهاتف:</b> ${phone}\n` +
    `📍 <b>العنوان:</b> ${address}\n` +
    `🛒 <b>الخدمة:</b> ${serviceName}\n` +
    `💰 <b>السعر:</b> ${totalPrice} ج\n` +
    `──────────────────\n` +
    `🎛 <b>التحكم في التتبع:</b>`;

  // أزرار التتبع تظهر فوراً مع الطلب
  const keyboard = [
    [
      { text: '🚚 جاري التوصيل', callback_data: `track_${orderId}_delivering` },
      { text: '✅ تم الاستلام', callback_data: `track_${orderId}_done` }
    ],
    [
      { text: '📞 إضافة رقم المندوب', callback_data: `addphone_${orderId}` }
    ]
  ];

  await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);
  res.json({ success: true, orderId });
});

// ==================== معالجة أزرار التتبع (Webhook) ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;

    // إغلاق مؤشر التحميل في تليجرام
    await fetch(`${BOTS.main.api}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id })
    });

    if (data.startsWith('track_')) {
      const [_, orderId, statusKey] = data.split('_');
      const order = orders.find(o => o.id === orderId);
      
      if (!order) return res.sendStatus(200);

      const statusText = statusKey === 'delivering' ? '🚚 جاري التوصيل' : '✅ تم الاستلام بنجاح';
      order.status = statusText;

      // تحديث الرسالة الأصلية لتوضيح الحالة الحالية
      const updatedText = callback.message.text.split('🎛')[0] + `\n📍 <b>الحالة الحالية:</b> ${statusText}`;
      
      // تحديد الأزرار الجديدة
      let newKeyboard = [];
      
      // إضافة زر إضافة رقم المندوب إذا لسه ما اتضافش
      if (!order.driverPhone) {
        newKeyboard.push([{ text: '📞 إضافة رقم المندوب', callback_data: `addphone_${orderId}` }]);
      }
      
      // أزرار التتبع
      if (statusKey === 'delivering') {
        newKeyboard.push([{ text: '✅ تم الاستلام النهائي', callback_data: `track_${orderId}_done` }]);
      }

      await editMessage(chatId, messageId, updatedText, newKeyboard.length > 0 ? newKeyboard : null, order.botType);
      
      // إرسال تنبيه بسيط في القناة بالتحديث
      await sendMessage(DRIVER_CHANNEL_ID, `🔔 تحديث: الطلب <code>${orderId}</code> أصبح: ${statusText}`, null, order.botType);
    }
    
    // إضافة رقم المندوب
    else if (data.startsWith('addphone_')) {
      const [_, orderId] = data.split('_');
      const order = orders.find(o => o.id === orderId);
      
      if (!order) return res.sendStatus(200);
      
      // إزالة الأزرار القديمة
      await editMessage(chatId, messageId, callback.message.text, [], order.botType);
      
      // طلب إدخال رقم التليفون
      await sendMessage(chatId, 
        `📞 <b>الرجاء إرسال رقم هاتف المندوب</b>\n\n` +
        `مثال: 01012345678\n` +
        `(سيظهر للعميل عند تتبع الطلب)`,
        null,
        order.botType
      );
      
      // تخزين مؤقت أننا في انتظار رقم لهذا الطلب
      global.waitingForPhone = { orderId, chatId, botType: order.botType };
    }
  }
  
  // استقبال رقم التليفون من المندوب
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    // التحقق من أننا ننتظر رقماً من هذا الشات
    if (global.waitingForPhone && global.waitingForPhone.chatId === chatId && text.match(/^01[0-9]{9}$/)) {
      const orderId = global.waitingForPhone.orderId;
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        order.driverPhone = text;
        
        await sendMessage(chatId,
          `✅ <b>تم حفظ رقم المندوب</b>\n\n` +
          `📞 الرقم: ${text}\n` +
          `سيظهر للعميل في شاشة التتبع.`,
          null,
          global.waitingForPhone.botType
        );
        
        delete global.waitingForPhone;
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ Zayed-ID Tracking System Active 🚀',
    ordersCount: orders.length,
    offersCount: offers.length
  });
});

// ==================== مسارات بوت العروض ====================
app.get('/api/offers', (req, res) => {
  const sortedOffers = [...offers].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ success: true, offers: sortedOffers });
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 سيرفر Zayed-ID شغال على بورت ${PORT}`);
  console.log(`🔗 رابط السيرفر: https://zayedid-production.up.railway.app`);
  console.log(`🤖 البوت الرئيسي: 8216105936`);
  console.log(`🤖 بوت المكوجي: 8216174777`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`📞 دعم إضافة رقم المندوب ✅`);
});
