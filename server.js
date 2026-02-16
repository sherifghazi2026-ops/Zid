const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== إعدادات البوت ====================
const TELEGRAM_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DRIVER_CHANNEL_ID = "1814331589";

let orders = [];
let pendingOrders = {};

// ==================== دوال مساعدة ====================
const sendToTelegram = async (chatId, message, keyboard = null) => {
  try {
    const payload = {
      chat_id: chatId,
      text: message,
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

const sendVoiceToTelegram = async (chatId, voiceUrl) => {
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

const editTelegramMessage = async (chatId, messageId, newText, keyboard) => {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: keyboard })
    };
    
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('خطأ في تعديل الرسالة:', error);
  }
};

// ==================== رفع الصوت ====================
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
      driverPhone: o.driverPhone || null,
      createdAt: o.date
    }))
  });
});

// ==================== استقبال الطلب مع الصوت ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items, serviceName = 'سوبر ماركت', voiceUrl } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    items: Array.isArray(items) ? items : [items],
    serviceName,
    date: new Date().toISOString(),
    status: 'في انتظار مندوب',
    driverPhone: null,
    messageId: null,
    voiceUrl: voiceUrl || null
  };
  
  orders.push(newOrder);
  
  // تجهيز أزرار القبول للمندوبين
  const keyboard = [
    [
      { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
    ]
  ];
  
  // تجهيز الرسالة
  const itemsList = Array.isArray(items) ? items.join('، ') : items;
  let message = 
    `🆕 <b>طلب جديد في انتظار مندوب</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n\n` +
    `🛒 <b>المشتجات المطلوبة:</b>\n` +
    `──────────────────\n` +
    `${itemsList}\n` +
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> في انتظار مندوب\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;
  
  if (voiceUrl) {
    message += `\n\n🎤 <b>تسجيل صوتي مرفق مع الطلب</b>`;
  }
  
  // إرسال الرسالة لتليجرام
  const result = await sendToTelegram(DRIVER_CHANNEL_ID, message, keyboard);
  
  if (result && result.ok) {
    newOrder.messageId = result.result.message_id;
    
    // إذا في ملف صوتي، نرسله بعد الرسالة
    if (voiceUrl) {
      const voiceResult = await sendVoiceToTelegram(DRIVER_CHANNEL_ID, voiceUrl);
      if (voiceResult && voiceResult.ok) {
        console.log(`✅ تم إرسال التسجيل الصوتي للطلب ${orderId}`);
      } else {
        console.error('❌ فشل إرسال الصوت:', voiceResult);
      }
    }
  }
  
  res.json({ success: true, orderId });
});

// ==================== ويب هوك لاستقبال الأزرار ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const messageId = callback.message.message_id;
    const chatId = callback.message.chat.id;
    const driverName = callback.from.first_name || 'مندوب';
    const driverUsername = callback.from.username || 'غير معروف';
    
    const [action, orderId, param] = data.split('_');
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
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

    if (action === 'accept') {
      if (order.acceptedBy) {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: '❌ هذا الطلب تم قبوله بالفعل',
            show_alert: true
          })
        });
        return res.sendStatus(200);
      }

      order.acceptedBy = {
        id: callback.from.id,
        name: driverName,
        username: driverUsername,
      };
      order.status = 'جديد';
      
      let newText = callback.message.text.replace(
        /🔻 <b>الحالة:<\/b> [^\n]+/, 
        `🔻 <b>الحالة:</b> جديد`
      );
      newText += `\n\n✅ تم قبول الطلب بواسطة @${driverUsername}\n📱 الرجاء إرسال رقم الموبايل للتواصل مع العميل`;
      
      const keyboard = [
        [
          { text: '📞 إرسال رقم الموبايل', callback_data: `phone_${orderId}` }
        ]
      ];
      
      await editTelegramMessage(chatId, messageId, newText, keyboard);
      
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '✅ تم قبول الطلب! الرجاء إرسال رقم موبايلك',
          show_alert: false
        })
      });
    }
    
    else if (action === 'phone') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '📝 الرجاء كتابة رقم موبايلك في المحادثة',
          show_alert: true
        })
      });
      
      await sendToTelegram(chatId, 
        `📱 مرحباً ${driverName}\n` +
        `الرجاء كتابة رقم موبايلك للتواصل مع العميل على الطلب ${orderId}\n` +
        `(مثال: 01234567890)`
      );
      
      pendingOrders[chatId] = { orderId, step: 'waiting_phone' };
    }
    
    else if (action === 'status' && order.acceptedBy) {
      if (order.acceptedBy.id !== callback.from.id) {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: '❌ أنت لست المندوب المسؤول عن هذا الطلب',
            show_alert: true
          })
        });
        return res.sendStatus(200);
      }

      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      order.status = newStatus;
      
      const keyboard = newStatus === 'تم التوصيل' ? [] : [
        [
          { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
          { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
        ]
      ];
      
      let newText = callback.message.text;
      newText = newText.replace(/🔻 <b>الحالة:<\/b> [^\n]+/, `🔻 <b>الحالة:</b> ${newStatus}`);
      
      if (order.driverPhone) {
        newText = newText.replace(/📱 رقم المندوب: [^\n]+/, `📱 رقم المندوب: ${order.driverPhone}`);
      } else {
        newText += `\n📱 رقم المندوب: ${order.driverPhone || 'في انتظار الإدخال'}`;
      }
      
      await editTelegramMessage(chatId, messageId, newText, keyboard);
      
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
  
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (pendingOrders[chatId] && pendingOrders[chatId].step === 'waiting_phone') {
      const { orderId } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.acceptedBy && order.acceptedBy.id === update.message.from.id) {
        order.driverPhone = text;
        
        const messageText = 
          `🆕 <b>طلب جديد</b>\n` +
          `──────────────────\n` +
          `📞 العميل: ${order.phone}\n` +
          `📍 ${order.address}\n` +
          `🛒 ${Array.isArray(order.items) ? order.items.join('، ') : order.items}\n` +
          `──────────────────\n` +
          `🔻 <b>الحالة:</b> ${order.status}\n` +
          `🆔 <code>${orderId}</code>\n` +
          `📱 رقم المندوب: ${text}`;
        
        const keyboard = [
          [
            { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
            { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
          ],
          [
            { text: '📞 اتصال بالعميل', callback_data: `call_${orderId}` },
            { text: '📍 العنوان', callback_data: `address_${orderId}` }
          ]
        ];
        
        await editTelegramMessage(DRIVER_CHANNEL_ID, order.messageId, messageText, keyboard);
        
        await sendToTelegram(chatId, '✅ تم حفظ رقمك بنجاح! يمكنك متابعة الطلب');
        
        delete pendingOrders[chatId];
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر شغال على بورت ${PORT}`);
  console.log(`📱 رفع الصوت: /upload-voice`);
  console.log(`📱 الملفات الصوتية: /uploads/`);
});
