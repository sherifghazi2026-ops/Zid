const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json({ limit: '50mb' })); // زيادة الحد لاستقبال الملفات الصوتية

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
    
    // إنشاء اسم ملف فريد
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = `/tmp/${fileName}`; // في Railway، /tmp مجلد مؤقت
    
    // حفظ الملف مؤقتاً
    fs.writeFileSync(filePath, audioBuffer);
    
    // رابط الملف الصوتي (مؤقت)
    const fileUrl = `https://zayedid-production.up.railway.app/voices/${fileName}`;
    
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
app.get('/voices/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = `/tmp/${filename}`;
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('الملف غير موجود');
  }
});

// ==================== جلب حالة الطلب ====================
app.get('/order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.id === orderId);
  
  if (order) {
    res.json({ success: true, status: order.status });
  } else {
    res.status(404).json({ success: false, error: 'الطلب غير موجود' });
  }
});

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.send('✅ بوت Zayed-ID شغال على Railway!');
});

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);

  const { phone, address, items, rawText, voiceUrl } = req.body;

  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);

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

  // رسالة منسقة
  const message = 
    `🆕 <b>طلب جديد من Zayed-ID</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address}\n\n` +
    `🛒 <b>المنتجات المطلوبة:</b>\n` +
    `──────────────────\n` +
    items.map((item, index) => `${index + 1}. ${item}`).join('\n') + `\n` +
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> جديد\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;

  // الأزرار
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
    
    // إذا في تسجيل صوتي، أرسله بعد الرسالة
    if (voiceUrl) {
      const voiceResult = await sendVoice(DRIVER_CHANNEL_ID, voiceUrl);
      if (voiceResult.ok) {
        console.log(`✅ تم إرسال التسجيل الصوتي للطلب ${orderId}`);
      } else {
        console.error('❌ فشل إرسال الصوت:', voiceResult);
      }
    }
  } else {
    console.error('❌ فشل إرسال الطلب:', result);
  }

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
      const updatedMessage = callback.message.text.replace('جديد', newStatus);
      
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
        `${statusIcon} <b>تحديث الطلب #${orderId}</b>\n` +
        `الحالة الجديدة: ${newStatus}`
      );
    }

    else if (action === 'call') {
      await sendMessage(chatId, `📞 <b>رقم العميل:</b>\n${order.phone}`);
    }

    else if (action === 'address') {
      await sendMessage(chatId, 
        `📍 <b>العنوان بالكامل:</b>\n${order.address}\n\n` +
        `📝 <b>المنتجات:</b>\n${order.items}`
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
  console.log(`🎤 مسار رفع الصوت: /upload-voice`);
  console.log(`🎧 مسار الملفات الصوتية: /voices/:filename`);
  console.log(`📊 مسار حالة الطلب: /order-status/:orderId`);
  console.log(`🤖 مسار الويب هوك: /webhook`);
});
