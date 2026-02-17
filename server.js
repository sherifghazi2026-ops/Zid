const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // 👈 نضيف هذه المكتبة

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

const DRIVER_CHANNEL_ID = "1814331589";
const ADMIN_IDS = [1814331589];

let orders = [];
let driverSessions = {};

// ==================== دوال مساعدة ====================
const sendToTelegram = async (chatId, message, keyboard = null, botType = 'main') => {
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

// ==================== دالة إرسال الصوت المعدلة ====================
const sendVoiceToTelegram = async (chatId, voiceUrl, botType = 'main') => {
  try {
    // نتأكد من أن الرابط كامل
    let fullUrl = voiceUrl;
    if (!voiceUrl.startsWith('http')) {
      fullUrl = `https://zayedid-production.up.railway.app${voiceUrl}`;
    }
    
    console.log(`📤 محاولة إرسال صوت للبوت ${botType}: ${fullUrl}`);
    
    // الطريقة الأولى: إرسال كـ voice باستخدام form-data
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('voice', fullUrl);
    
    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ تم إرسال الصوت بنجاح كـ Voice');
      return result;
    } else {
      console.log('⚠️ فشل إرسال كـ Voice، نجرب كـ Document...');
      
      // الطريقة الثانية: إرسال كـ document (ملف)
      const docFormData = new FormData();
      docFormData.append('chat_id', chatId);
      docFormData.append('document', fullUrl);
      docFormData.append('caption', '🎤 تسجيل صوتي للطلب');
      
      const docResponse = await fetch(`${BOTS[botType].api}/sendDocument`, {
        method: 'POST',
        body: docFormData
      });
      
      const docResult = await docResponse.json();
      if (docResult.ok) {
        console.log('✅ تم إرسال الصوت بنجاح كـ Document');
      } else {
        console.error('❌ فشل إرسال الصوت بالطريقتين:', docResult);
      }
      return docResult;
    }
  } catch (error) {
    console.error(`خطأ في إرسال صوت للبوت ${botType}:`, error);
  }
};

const editTelegramMessage = async (chatId, messageId, newText, keyboard, botType = 'main') => {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'HTML'
    };
    
    if (keyboard && keyboard.length > 0) {
      payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    } else {
      payload.reply_markup = JSON.stringify({ inline_keyboard: [] });
    }
    
    await fetch(`${BOTS[botType].api}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error(`خطأ في تعديل رسالة للبوت ${botType}:`, error);
  }
};

// ==================== رفع الصوت ====================
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });
    }

    console.log('📥 تم استقبال ملف صوتي');

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

// ==================== جلب الطلبات النشطة ====================
app.get('/active-orders', (req, res) => {
  const activeOrders = orders.filter(o => o.status !== 'تم التوصيل');
  
  res.json({ 
    success: true, 
    orders: activeOrders.map(o => ({
      id: o.id,
      phone: o.phone,
      address: o.address,
      location: o.location || null,
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
  
  const { phone, address, location, items, serviceName = 'سوبر ماركت', voiceUrl, totalPrice } = req.body;
  
  // تنسيق رقم الطلب حسب نوع الخدمة
  let orderId;
  if (serviceName === 'مكوجي') {
    orderId = 'IRN-' + Math.floor(Math.random() * 1000000);
  } else {
    orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  }
  
  // الحالة الافتراضية حسب نوع الخدمة
  const initialStatus = serviceName === 'مكوجي' ? 'تم استلام طلبك' : 'في انتظار مندوب';
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    location: location || null,
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
  
  // اختيار البوت المناسب حسب نوع الخدمة
  const botType = serviceName === 'مكوجي' ? 'ironing' : 'main';
  
  let message = 
    `🆕 <b>طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n` +
    (location ? `📍 مشاركة الموقع متاحة\n` : '') +
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
  
  // إرسال الرسالة
  const result = await sendToTelegram(DRIVER_CHANNEL_ID, message, keyboard, botType);
  
  if (result && result.ok) {
    newOrder.messageId = result.result.message_id;
    newOrder.botType = botType;
    
    // إذا في ملف صوتي، نرسله بعد الرسالة
    if (voiceUrl) {
      // ننتظر 2 ثانية عشان الرسالة توصل الأول
      setTimeout(async () => {
        await sendVoiceToTelegram(DRIVER_CHANNEL_ID, voiceUrl, botType);
      }, 2000);
    }
  }
  
  res.json({ success: true, orderId });
});

// ==================== باقي الكود (نفسه) ====================
// ... (ويب هوك وكل حاجة زي ما هي)

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 السيرفر الرئيسي شغال على بورت ${PORT}`);
  console.log(`🤖 بوت رئيسي: ${BOTS.main.token}`);
  console.log(`🤖 بوت مكوجي: ${BOTS.ironing.token}`);
});
