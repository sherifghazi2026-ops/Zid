const express = require('express');
const app = express();
app.use(express.json());

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
    if (keyboard) {
      payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    }
    const response = await fetch(TELEGRAM_API + '/sendMessage', {
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
      payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    }
    const response = await fetch(TELEGRAM_API + '/editMessageText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('خطأ في تعديل رسالة:', error);
  }
};

// ==================== استقبال الطلب من التطبيق ====================
app.post('/api/new-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { orderId, phone, address, items, fullText, customerChatId } = req.body;
  
  customers[phone] = customerChatId;
  
  const newOrder = {
    id: orderId,
    phone,
    address,
    items,
    fullText,
    date: new Date().toLocaleString('ar-EG'),
    status: 'جديد',
    customerChatId,
    messageId: null
  };
  
  orders.push(newOrder);
  
  // رسالة مع أزرار
  const message = `🆕 <b>طلب جديد!</b>\n\n` +
                  `🆔 رقم الطلب: <b>${orderId}</b>\n` +
                  `📞 العميل: ${phone}\n` +
                  `📍 العنوان: ${address}\n` +
                  `📝 المنتجات: ${items}\n` +
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
  
  // إرسال الرسالة لقناة المندوبين
  const response = await fetch(TELEGRAM_API + '/sendMessage', {
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
  }
  
  // تأكيد للعميل
  await sendMessage(customerChatId,
    `✅ تم استلام طلبك رقم <b>${orderId}</b>\n` +
    `📦 الحالة: جديد\n` +
    `⏳ سنقوم بتحديثك عند تغيير الحالة`
  );
  
  res.json({ success: true });
});

// ==================== معالجة ضغط الأزرار ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const data = callback.data;
    
    await fetch(TELEGRAM_API + '/answerCallbackQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id })
    });
    
    const [action, orderId, param] = data.split('_');
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      await sendMessage(chatId, '❌ الطلب غير موجود');
      return res.sendStatus(200);
    }
    
    if (action === 'status') {
      const oldStatus = order.status;
      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      order.status = newStatus;
      
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
      
      const statusIcon = newStatus === 'جاري التوصيل' ? '🚚' : '✅';
      await sendMessage(order.customerChatId,
        `${statusIcon} <b>تحديث حالة الطلب #${orderId}</b>\n\n` +
        `الحالة: <b>${newStatus}</b>\n` +
        (newStatus === 'جاري التوصيل' ? '🚚 المندوب في الطريق إليك!' : '✅ تم توصيل طلبك بنجاح')
      );
      
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
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (text === '/start') {
      await sendMessage(chatId,
        `👋 مرحباً بك في نظام إدارة الطلبات Zayed-ID\n\n` +
        `📋 الأوامر المتاحة:\n` +
        `/orders - عرض كل الطلبات\n` +
        `/new - عرض الطلبات الجديدة\n` +
        `/stats - إحصائيات سريعة\n\n` +
        `أو استخدم الأزرار في الرسائل`
      );
    }
    
    const orderMatch = text.match(/(ORD-\d+)/i);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        const statusIcon = order.status === 'جديد' ? '🆕' :
                          order.status === 'جاري التوصيل' ? '🚚' : '✅';
        
        await sendMessage(chatId,
          `${statusIcon} <b>تفاصيل الطلب #${orderId}</b>\n\n` +
          `📦 الحالة: ${order.status}\n` +
          `📞 رقم التليفون: ${order.phone}\n` +
          `📍 العنوان: ${order.address}\n` +
          `📝 المنتجات: ${order.items}\n` +
          `⏰ تاريخ الطلب: ${order.date}`
        );
      } else {
        await sendMessage(chatId, '❌ الطلب غير موجود');
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت تليجرام شغال على بورت ${PORT}`);
});
