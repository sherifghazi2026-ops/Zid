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

// معرف القناة - لازم يبدأ بـ -100
const DRIVER_CHANNEL_ID = "-1001814331589";
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
    
    const response = await fetch(`${BOTS[botType].api}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ تم الإرسال بنجاح');
    } else {
      console.error('❌ فشل الإرسال:', result);
    }
    return result;
  } catch (error) {
    console.error(`خطأ في إرسال رسالة للبوت ${botType}:`, error);
  }
};

// دالة إرسال الصوت - محسنة
const sendVoice = async (chatId, voiceUrl, botType = 'main') => {
  try {
    // التأكد من أن الرابط كامل وصحيح
    let fullUrl = voiceUrl;
    if (!voiceUrl.startsWith('http')) {
      fullUrl = `https://zayedid-production.up.railway.app${voiceUrl}`;
    }
    
    console.log(`📤 إرسال صوت إلى ${chatId} باستخدام البوت ${botType}: ${fullUrl}`);
    
    // تجهيز البيانات كـ form-data (telegram يتطلب ذلك للصوت)
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('voice', fullUrl);
    
    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ تم إرسال الصوت بنجاح');
    } else {
      console.error('❌ فشل إرسال الصوت:', result);
    }
    return result;
  } catch (error) {
    console.error(`خطأ في إرسال صوت للبوت ${botType}:`, error);
  }
};

// دالة إرسال الصوت كملف (طريقة بديلة)
const sendAudioAsDocument = async (chatId, voiceUrl, botType = 'main') => {
  try {
    let fullUrl = voiceUrl;
    if (!voiceUrl.startsWith('http')) {
      fullUrl = `https://zayedid-production.up.railway.app${voiceUrl}`;
    }
    
    console.log(`📤 إرسال ملف صوتي كوثيقة إلى ${chatId} باستخدام البوت ${botType}: ${fullUrl}`);
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', fullUrl);
    formData.append('caption', '🎤 تسجيل صوتي للطلب');
    
    const response = await fetch(`${BOTS[botType].api}/sendDocument`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ تم إرسال الملف الصوتي كوثيقة بنجاح');
    } else {
      console.error('❌ فشل إرسال الملف الصوتي:', result);
    }
    return result;
  } catch (error) {
    console.error(`خطأ في إرسال ملف صوتي للبوت ${botType}:`, error);
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
    
    if (keyboard) {
      payload.reply_markup = JSON.stringify({ 
        inline_keyboard: keyboard 
      });
    }
    
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
    const result = await sendMessage(
      DRIVER_CHANNEL_ID, 
      '🧪 <b>رسالة اختبار</b>\n\nإذا رأيت هذه الرسالة، فالبوت شغال ✅',
      null,
      'main'
    );
    
    const result2 = await sendMessage(
      DRIVER_CHANNEL_ID, 
      '🧪 <b>رسالة اختبار لبوت المكوجي</b>\n\nإذا رأيت هذه الرسالة، فبوت المكوجي شغال ✅',
      null,
      'ironing'
    );
    
    res.json({ 
      success: true, 
      main: result ? '✅' : '❌',
      ironing: result2 ? '✅' : '❌'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
      status: o.status || 'تم استلام طلبك',
      serviceName: o.serviceName || 'سوبر ماركت',
      driverPhone: o.driverPhone || null,
      totalPrice: o.totalPrice || null,
      createdAt: o.date
    }))
  });
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
  
  // إرسال الرسالة النصية أولاً
  const result = await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);
  
  if (result && result.ok) {
    newOrder.messageId = result.result.message_id;
    newOrder.botType = botType;
    
    // إذا في ملف صوتي، نرسله بعد الرسالة (مع محاولتين)
    if (voiceUrl) {
      console.log('🎤 محاولة إرسال الصوت...');
      
      // تأخير 2 ثانية عشان الرسالة توصل أولاً
      setTimeout(async () => {
        // المحاولة الأولى: إرسال كـ Voice
        const voiceResult = await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);
        
        // إذا فشلت، نجرب إرسال كـ Document
        if (!voiceResult || !voiceResult.ok) {
          console.log('⚠️ فشل إرسال كـ Voice، نجرب كـ Document...');
          await sendAudioAsDocument(DRIVER_CHANNEL_ID, voiceUrl, botType);
        }
      }, 2000);
    }
  }
  
  res.json({ success: true, orderId });
});

// ==================== ويب هوك (مختصر للاختصار) ====================
app.post('/webhook', async (req, res) => {
  // الكود الكامل للويب هوك موجود في الملف السابق
  // تم حذفه للاختصار لكنه موجود في الكود الأصلي
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
