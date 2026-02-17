const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

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

// معرف القناة - غير هذا الرقم بالرقم الصحيح اللي جبته من getUpdates
const DRIVER_CHANNEL_ID = "-1001814331589"; // ⚠️ غير هذا الرقم
const ADMIN_IDS = [1814331589];

let orders = [];
let driverSessions = {};

// ==================== دوال مساعدة ====================
const sendMessage = async (chatId, text, keyboard = null, botType = 'main') => {
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
    
    console.log(`📤 إرسال رسالة إلى ${chatId} باستخدام البوت ${botType}`);
    console.log(`📝 نص الرسالة: ${text.substring(0, 100)}...`);
    
    const response = await fetch(`${BOTS[botType].api}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ تم الإرسال بنجاح');
    } else {
      console.error('❌ فشل الإرسال:', JSON.stringify(result));
    }
    return result;
  } catch (error) {
    console.error(`خطأ في إرسال رسالة للبوت ${botType}:`, error);
  }
};

// دالة إرسال الصوت
const sendVoice = async (chatId, voiceUrl, botType = 'main') => {
  try {
    let fullUrl = voiceUrl;
    if (!voiceUrl.startsWith('http')) {
      fullUrl = `https://zayedid-production.up.railway.app${voiceUrl}`;
    }
    
    console.log(`📤 إرسال صوت إلى ${chatId} باستخدام البوت ${botType}: ${fullUrl}`);
    
    // تليجرام يقبل رابط مباشر للصوت
    const payload = {
      chat_id: chatId,
      voice: fullUrl
    };
    
    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ تم إرسال الصوت بنجاح');
    } else {
      console.error('❌ فشل إرسال الصوت:', JSON.stringify(result));
    }
    return result;
  } catch (error) {
    console.error(`خطأ في إرسال صوت للبوت ${botType}:`, error);
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

    const audioBuffer = Buffer.from(audio, 'base64');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, audioBuffer);
    
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
    status: '✅ جميع البوتات شغالة',
    time: new Date().toISOString(),
    bots: Object.keys(BOTS),
    ordersCount: orders.length
  });
});

// ==================== مسار اختبار للبوت ====================
app.get('/test-bot', async (req, res) => {
  try {
    console.log('🧪 اختبار إرسال رسالة إلى القناة:', DRIVER_CHANNEL_ID);
    
    const result = await sendMessage(
      DRIVER_CHANNEL_ID, 
      '🧪 <b>رسالة اختبار من السيرفر</b>\n\nإذا رأيت هذه الرسالة، فالبوت شغال ✅',
      null,
      'main'
    );
    
    res.json({ 
      success: true, 
      result: result,
      channelId: DRIVER_CHANNEL_ID
    });
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== استقبال الطلبات ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, items, serviceName = 'سوبر ماركت', voiceUrl, totalPrice } = req.body;
  
  let orderId;
  if (serviceName === 'مكوجي') {
    orderId = 'IRN-' + Math.floor(Math.random() * 1000000);
  } else {
    orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  }
  
  const initialStatus = serviceName === 'مكوجي' ? 'تم استلام طلبك' : 'في انتظار مندوب';
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    items: Array.isArray(items) ? items : (items ? [items] : []),
    serviceName,
    date: new Date().toISOString(),
    status: initialStatus,
    driverPhone: null,
    totalPrice: totalPrice || null,
    messageId: null,
    voiceUrl: voiceUrl || null,
    acceptedBy: null
  };
  
  orders.push(newOrder);
  
  const keyboard = [
    [
      { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
    ]
  ];
  
  const itemsList = Array.isArray(items) ? items.join('\n') : (items || 'طلب بدون تفاصيل');
  
  const botType = serviceName === 'مكوجي' ? 'ironing' : 'main';
  
  let message = 
    `🆕 <b>طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n` +
    `📦 <b>تفاصيل الطلب:</b>\n` +
    `──────────────────\n` +
    `${itemsList}\n` +
    `──────────────────\n`;
  
  if (totalPrice) {
    message += `💰 <b>الإجمالي:</b> ${totalPrice} ج\n`;
  }
  
  message += `🔻 <b>الحالة:</b> ${initialStatus}\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;
  
  if (voiceUrl) {
    message += `\n\n🎤 <b>تسجيل صوتي مرفق مع الطلب</b>`;
  }
  
  console.log(`📤 محاولة إرسال الطلب إلى القناة ${DRIVER_CHANNEL_ID} باستخدام البوت ${botType}`);
  
  // إرسال الرسالة النصية أولاً
  const result = await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);
  
  if (result && result.ok) {
    newOrder.messageId = result.result.message_id;
    newOrder.botType = botType;
    console.log(`✅ تم إرسال الطلب بنجاح، messageId: ${result.result.message_id}`);
    
    // إذا في ملف صوتي، نرسله بعد الرسالة
    if (voiceUrl) {
      console.log('🎤 محاولة إرسال الصوت...');
      
      // تأخير 2 ثانية
      setTimeout(async () => {
        await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);
      }, 2000);
    }
  } else {
    console.error('❌ فشل إرسال الطلب:', result);
  }
  
  res.json({ success: true, orderId });
});

// ==================== ويب هوك ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  console.log('🔄 استقبال Webhook:', JSON.stringify(update).substring(0, 200));
  
  // معالجة الأزرار
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const messageId = callback.message.message_id;
    const chatId = callback.message.chat.id;
    const messageText = callback.message.text;
    const driverName = callback.from.first_name || 'مندوب';
    const driverId = callback.from.id;
    
    console.log(`🔄 ضغط على زر: ${data} من ${driverName} (${driverId})`);
    
    const parts = data.split('_');
    const action = parts[0];
    const orderId = parts[1];
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      await sendMessage(chatId, '❌ الطلب غير موجود', null, 'main');
      return res.sendStatus(200);
    }

    const botType = order.botType || 'main';

    if (action === 'accept') {
      if (!order.acceptedBy) {
        order.acceptedBy = { id: driverId, name: driverName };
        order.status = order.serviceName === 'مكوجي' ? 'طلبك تحت التنفيذ' : 'جديد';
        
        let newText = messageText.replace(
          /🔻 <b>الحالة:<\/b> [^\n]+/, 
          `🔻 <b>الحالة:</b> ${order.status}`
        );
        newText += `\n\n✅ تم قبول الطلب بواسطة ${driverName}`;
        
        await sendMessage(chatId, newText, null, botType);
        
        await sendMessage(chatId, 
          `📱 مرحباً ${driverName}\n` +
          `لقد قبلت الطلب ${orderId}\n\n` +
          `الرجاء إرسال رقم موبايلك للتواصل مع العميل:`,
          null,
          botType
        );
        
        driverSessions[driverId] = {
          orderId: orderId,
          step: 'waiting_phone',
          botType: botType
        };
      } else {
        let msg = order.acceptedBy.id === driverId 
          ? '✅ أنت قبلت هذا الطلب بالفعل'
          : `❌ هذا الطلب تم قبوله بواسطة ${order.acceptedBy.name}`;
        
        await sendMessage(chatId, msg, null, botType);
      }
    }
  }
  
  // معالجة الرسائل النصية
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (driverSessions[chatId]) {
      const session = driverSessions[chatId];
      const order = orders.find(o => o.id === session.orderId);
      
      if (order && session.step === 'waiting_phone') {
        order.driverPhone = text;
        await sendMessage(chatId, '✅ تم حفظ الرقم!', null, session.botType);
        delete driverSessions[chatId];
      }
    }
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 السيرفر الرئيسي شغال على بورت ${PORT}`);
  console.log(`🤖 بوت رئيسي: ${BOTS.main.token}`);
  console.log(`🤖 بوت مكوجي: ${BOTS.ironing.token}`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`🔗 رابط الاختبار: /test-bot`);
});
