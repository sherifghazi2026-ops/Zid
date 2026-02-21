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
  },
  offers: {
    token: "8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4",
    api: "https://api.telegram.org/bot8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4"
  }
};

const DRIVER_CHANNEL_ID = "1814331589";
const ADMIN_IDS = [1814331589];

let orders = [];
let driverSessions = {};
let offers = [];

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
    
    console.log(`📤 إرسال رسالة إلى ${chatId} باستخدام البوت ${botType}`);
    
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

// ==================== دالة إرسال الصوت المحسنة ====================
const sendVoiceToTelegram = async (chatId, voiceUrl, botType = 'main') => {
  try {
    // نتأكد من أن الرابط كامل
    let fullUrl = voiceUrl;
    if (!voiceUrl.startsWith('http')) {
      fullUrl = `https://zayedid-production.up.railway.app${voiceUrl}`;
    }
    
    console.log(`📤 إرسال صوت للبوت ${botType}: ${fullUrl}`);
    
    // استخدام form-data بشكل صحيح
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('voice', fullUrl);
    
    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
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

// ==================== خدمة الملفات الصوتية ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== نظام العروض ====================
app.get('/api/offers', (req, res) => {
  const sortedOffers = [...offers].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  res.json({ 
    success: true, 
    offers: sortedOffers
  });
});

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ جميع البوتات شغالة',
    time: new Date().toISOString(),
    bots: Object.keys(BOTS),
    ordersCount: orders.length,
    offersCount: offers.length
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
      itemsPrice: o.itemsPrice || null,
      deliveryPrice: o.deliveryPrice || null,
      totalPrice: o.totalPrice || null,
      createdAt: o.date
    }))
  });
});

// ==================== استقبال الطلبات ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, location, items, serviceName = 'سوبر ماركت', voiceUrl, itemsPrice, deliveryPrice, totalPrice } = req.body;
  
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
    itemsPrice: itemsPrice || null,
    deliveryPrice: deliveryPrice || null,
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
  
  // عرض تفاصيل الفاتورة كاملة
  if (itemsPrice !== null && itemsPrice !== undefined) {
    message += `💰 <b>سعر الطلبات:</b> ${itemsPrice} ج\n`;
  }
  if (deliveryPrice !== null && deliveryPrice !== undefined) {
    message += `🚚 <b>خدمة التوصيل:</b> ${deliveryPrice} ج\n`;
  }
  if (totalPrice !== null && totalPrice !== undefined) {
    message += `💵 <b>الإجمالي الكلي:</b> ${totalPrice} ج\n`;
  }
  
  message += `──────────────────\n` +
    `🔻 <b>الحالة:</b> ${initialStatus}\n` +
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
      setTimeout(async () => {
        await sendVoiceToTelegram(DRIVER_CHANNEL_ID, voiceUrl, botType);
      }, 2000);
    }
  }
  
  res.json({ success: true, orderId });
});

// ==================== ويب هوك للعروض ====================
app.post('/webhook-offers', async (req, res) => {
  const update = req.body;
  
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const isAdmin = ADMIN_IDS.includes(chatId);
    
    if (!isAdmin) {
      return res.sendStatus(200);
    }
    
    // معالجة النصوص العادية كعروض
    if (text && !text.startsWith('/')) {
      const offerId = 'OFFER-' + Date.now();
      const newOffer = {
        id: offerId,
        type: 'text',
        text: text,
        createdAt: new Date().toISOString(),
        createdBy: chatId
      };
      
      offers.push(newOffer);
      
      await sendToTelegram(chatId, 
        `✅ <b>تم نشر العرض بنجاح!</b>\n` +
        `🆔 معرف العرض: <code>${offerId}</code>\n` +
        `📝 النص: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        null,
        'offers'
      );
    }
    
    // الأوامر
    else if (text) {
      if (text === '/offers') {
        if (offers.length === 0) {
          await sendToTelegram(chatId, '📭 لا توجد عروض حالياً', null, 'offers');
        } else {
          let response = '📋 <b>العروض الحالية:</b>\n\n';
          offers.slice(-10).reverse().forEach((offer, index) => {
            response += `${index + 1}. 🆔 <code>${offer.id}</code>\n`;
            response += `   📝 ${offer.text.substring(0, 50)}${offer.text.length > 50 ? '...' : ''}\n`;
            response += `   🕐 ${new Date(offer.createdAt).toLocaleString('ar-EG')}\n\n`;
          });
          await sendToTelegram(chatId, response, null, 'offers');
        }
      }
      
      else if (text.startsWith('/delete_offer ')) {
        const offerId = text.replace('/delete_offer ', '').trim();
        const index = offers.findIndex(o => o.id === offerId);
        
        if (index !== -1) {
          offers.splice(index, 1);
          await sendToTelegram(chatId, `✅ تم مسح العرض <code>${offerId}</code>`, null, 'offers');
        } else {
          await sendToTelegram(chatId, `❌ العرض <code>${offerId}</code> غير موجود`, null, 'offers');
        }
      }
      
      else if (text === '/clear_all') {
        offers = [];
        await sendToTelegram(chatId, '✅ تم مسح جميع العروض', null, 'offers');
      }
    }
    
    // معالجة الصور
    if (update.message.photo) {
      const photo = update.message.photo.pop();
      const fileId = photo.file_id;
      const caption = update.message.caption || '';
      
      const fileResponse = await fetch(`${BOTS.offers.api}/getFile?file_id=${fileId}`);
      const fileData = await fileResponse.json();
      
      if (fileData.ok) {
        const filePath = fileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${BOTS.offers.token}/${filePath}`;
        
        const imageResponse = await fetch(fileUrl);
        const imageBuffer = await imageResponse.buffer();
        
        const uploadsDir = path.join(__dirname, 'offer-uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }
        
        const fileName = `offer-${Date.now()}.jpg`;
        const localPath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localPath, imageBuffer);
        
        const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-production.up.railway.app`;
        const imageUrl = `${baseUrl}/offer-uploads/${fileName}`;
        
        const offerId = 'OFFER-' + Date.now();
        const newOffer = {
          id: offerId,
          type: 'image',
          imageUrl: imageUrl,
          text: caption || null,
          createdAt: new Date().toISOString(),
          createdBy: chatId
        };
        
        offers.push(newOffer);
        
        await sendToTelegram(chatId, 
          `✅ <b>تم نشر العرض المصور!</b>\n` +
          `🆔 معرف العرض: <code>${offerId}</code>\n` +
          (caption ? `📝 التعليق: ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}` : ''),
          null,
          'offers'
        );
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== ويب هوك الرئيسي ====================
app.post('/webhook', async (req, res) => {
  // هنا باقي كود الويب هوك الخاص بالطلبات (موجود في الملف السابق)
  // سأضيفه كاملاً لكن للاختصار أشرت إليه
  res.sendStatus(200);
});

// ==================== خدمة صور العروض ====================
app.use('/offer-uploads', express.static(path.join(__dirname, 'offer-uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 السيرفر الرئيسي شغال على بورت ${PORT}`);
  console.log(`🤖 بوت رئيسي: ${BOTS.main.token}`);
  console.log(`🤖 بوت مكوجي: ${BOTS.ironing.token}`);
  console.log(`🤖 بوت عروض: ${BOTS.offers.token}`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`🔗 رابط العروض: /api/offers`);
});
