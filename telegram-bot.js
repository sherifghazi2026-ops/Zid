const express = require('express');
const app = express();
app.use(express.json());

// ==================== إعدادات البوت ====================
const TELEGRAM_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DRIVER_CHANNEL_ID = "1814331589";

// تخزين البيانات (في الإنتاج استخدم قاعدة بيانات)
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
    
    if (keyboard) {
      payload.reply_markup = JSON.stringify({
        inline_keyboard: keyboard
      });
    }
    
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

const editMessage = async (chatId, messageId, text, keyboard = null) => {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (keyboard) {
      payload.reply_markup = JSON.stringify({
        inline_keyboard: keyboard
      });
    }
    
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

// ==================== الصفحة الرئيسية (للتحقق من أن السيرفر شغال) ====================
app.get('/', (req, res) => {
  res.send('✅ بوت Zayed-ID شغال على Railway!');
});

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items, rawText } = req.body;
  
  // إنشاء رقم طلب فريد
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  // تخزين العميل (مؤقتاً)
  customers[phone] = phone;
  
  const newOrder = {
    id: orderId,
    phone,
    address,
    items: items.join('، '),
    fullText: rawText,
    date: new Date().toLocaleString('ar-EG'),
    status: 'جديد',
    customerChatId: phone,
    messageId: null
  };
  
  orders.push(newOrder);
  
  // رسالة مع أزرار تفاعلية
  const message = `🆕 <b>طلب جديد!</b>\n\n` +
                  `🆔 رقم الطلب: <b>${orderId}</b>\n` +
                  `📞 العميل: ${phone}\n` +
                  `📍 العنوان: ${address}\n` +
                  `📝 المنتجات: ${items.join('، ')}\n` +
                  `⏰ الوقت: ${newOrder.date}\n\n` +
                  `🔻 الحالة الحالية: <b>جديد</b>`;
  
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
  } else {
    console.error('❌ فشل إرسال الطلب:', result);
  }
  
  // تأكيد للعميل (اختياري)
  // يمكن إرسال رسالة تأكيد للعميل إذا كان لديه محادثة مع البوت
  
  res.json({ success: true, orderId });
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
    
    // تأكيد استلام الضغط (عشان تختفي علامة التحميل)
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id })
    });
    
    // تحليل البيانات
    const [action, orderId, param] = data.split('_');
    
    // العثور على الطلب
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      await sendMessage(chatId, '❌ الطلب غير موجود');
      return res.sendStatus(200);
    }
    
    if (action === 'status') {
      const oldStatus = order.status;
      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      
      // تحديث الحالة
      order.status = newStatus;
      
      // تحديث رسالة المندوبين
      const updatedMessage = callback.message.text.replace(oldStatus, newStatus);
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
      
      // إرسال تحديث للعميل (لو عرفنا chatId بتاعه)
      // حالياً بنستخدم رقم التليفون كـ chatId مؤقت
      
      // إرسال إشعار للقناة
      const statusIcon = newStatus === 'جاري التوصيل' ? '🚚' : '✅';
      await sendMessage(DRIVER_CHANNEL_ID,
        `${statusIcon} تم تحديث الطلب #${orderId}\n` +
        `الحالة الجديدة: ${newStatus}`
      );
    }
    
    else if (action === 'call') {
      await sendMessage(chatId, `📞 رقم العميل: ${order.phone}`);
    }
    
    else if (action === 'address') {
      await sendMessage(chatId, `📍 العنوان بالكامل: ${order.address}\n\n📝 المنتجات: ${order.items}`);
    }
  }
  
  // معالجة الرسائل النصية
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (text === '/start') {
      await sendMessage(chatId,
        `👋 مرحباً بك في نظام إدارة الطلبات Zayed-ID\n\n` +
        `📋 الأوامر المتاحة:\n` +
        `/stats - عرض إحصائيات سريعة\n` +
        `/orders - عرض جميع الطلبات\n\n` +
        `أو استخدم الأزرار في الرسائل`
      );
    }
    
    else if (text === '/stats') {
      const stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'جديد').length,
        delivering: orders.filter(o => o.status === 'جاري التوصيل').length,
        done: orders.filter(o => o.status === 'تم التوصيل').length
      };
      
      await sendMessage(chatId,
        `📊 <b>إحصائيات الطلبات</b>\n\n` +
        `📦 إجمالي: ${stats.total}\n` +
        `🆕 جديد: ${stats.new}\n` +
        `🚚 جاري التوصيل: ${stats.delivering}\n` +
        `✅ تم التوصيل: ${stats.done}`
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
app.listen(PORT, () => {
  console.log(`🚀 بوت تليجرام شغال على بورت ${PORT}`);
  console.log(`🔗 رابط السيرفر: https://zayedid-production.up.railway.app`);
  console.log(`📱 مسار استقبال الطلبات: /send-order`);
  console.log(`🤖 مسار الويب هوك: /webhook`);
});
