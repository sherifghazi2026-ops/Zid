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
const ADMIN_IDS = [1814331589]; // اليوزر اللي مسموح له ينشر عروض (حط الID بتاعك)

let orders = [];
let pendingOrders = {};
let offers = []; // مصفوفة العروض

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

const sendPhotoToTelegram = async (chatId, photoUrl, caption = '') => {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        parse_mode: 'HTML'
      })
    });
    return await response.json();
  } catch (error) {
    console.error('خطأ في إرسال الصورة:', error);
  }
};

// ==================== رفع الصور ====================
app.post('/upload-photo', async (req, res) => {
  try {
    const { photo } = req.body;
    
    if (!photo) {
      return res.status(400).json({ success: false, error: 'لا يوجد صورة' });
    }

    console.log('📥 تم استقبال صورة');

    // تحويل Base64 إلى Buffer
    const photoBuffer = Buffer.from(photo, 'base64');
    
    // التأكد من وجود مجلد uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    // إنشاء اسم ملف فريد
    const fileName = `offer-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    
    // حفظ الملف
    fs.writeFileSync(filePath, photoBuffer);
    
    // رابط الملف
    const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-production.up.railway.app`;
    const fileUrl = `${baseUrl}/uploads/${fileName}`;
    
    console.log('🔗 رابط الصورة:', fileUrl);
    
    res.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== خدمة الملفات ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ شغال',
    time: new Date().toISOString(),
    offersCount: offers.length
  });
});

// ==================== جلب العروض للتطبيق ====================
app.get('/api/offers', (req, res) => {
  // ترتيب العروض من الأحدث للأقدم
  const sortedOffers = [...offers].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  res.json({ 
    success: true, 
    offers: sortedOffers
  });
});

// ==================== مسح عرض (للاستخدام من تليجرام) ====================
app.post('/api/offers/delete/:offerId', (req, res) => {
  const { offerId } = req.params;
  const index = offers.findIndex(o => o.id === offerId);
  
  if (index !== -1) {
    offers.splice(index, 1);
    res.json({ success: true, message: 'تم مسح العرض' });
  } else {
    res.status(404).json({ success: false, error: 'العرض غير موجود' });
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
      status: o.status || 'جديد',
      serviceName: o.serviceName || 'سوبر ماركت',
      driverPhone: o.driverPhone || null,
      createdAt: o.date
    }))
  });
});

// ==================== رفع الصوت (للطلبات) ====================
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
    
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('❌ خطأ في رفع الصوت:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== استقبال الطلبات ====================
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
  
  const keyboard = [
    [
      { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
    ]
  ];
  
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
  
  const result = await sendToTelegram(DRIVER_CHANNEL_ID, message, keyboard);
  
  if (result && result.ok) {
    newOrder.messageId = result.result.message_id;
    
    if (voiceUrl) {
      const voiceResult = await sendVoiceToTelegram(DRIVER_CHANNEL_ID, voiceUrl);
      if (voiceResult && voiceResult.ok) {
        console.log(`✅ تم إرسال التسجيل الصوتي للطلب ${orderId}`);
      }
    }
  }
  
  res.json({ success: true, orderId });
});

// ==================== ويب هوك لاستقبال كل حاجة من تليجرام ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  // معالجة الرسائل النصية
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const isAdmin = ADMIN_IDS.includes(chatId);
    
    // رسالة عادية - لو من الأدمن نحولها لعرض
    if (isAdmin && text && !text.startsWith('/')) {
      // نص عادي من الأدمن = عرض نصي
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
        `📝 النص: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
      );
    }
    
    // أوامر التحكم
    else if (isAdmin && text) {
      if (text === '/offers') {
        if (offers.length === 0) {
          await sendToTelegram(chatId, '📭 لا توجد عروض حالياً');
        } else {
          let response = '📋 <b>العروض الحالية:</b>\n\n';
          offers.slice(-5).reverse().forEach((offer, index) => {
            response += `${index + 1}. 🆔 <code>${offer.id}</code>\n`;
            if (offer.type === 'text') {
              response += `   📝 ${offer.text.substring(0, 30)}${offer.text.length > 30 ? '...' : ''}\n`;
            } else {
              response += `   🖼️ عرض مصور\n`;
            }
            response += `   🕐 ${new Date(offer.createdAt).toLocaleString('ar-EG')}\n\n`;
          });
          await sendToTelegram(chatId, response);
        }
      }
      
      else if (text.startsWith('/delete_offer ')) {
        const offerId = text.replace('/delete_offer ', '').trim();
        const index = offers.findIndex(o => o.id === offerId);
        
        if (index !== -1) {
          offers.splice(index, 1);
          await sendToTelegram(chatId, `✅ تم مسح العرض <code>${offerId}</code>`);
        } else {
          await sendToTelegram(chatId, `❌ العرض <code>${offerId}</code> غير موجود`);
        }
      }
    }
    
    // معالجة الصور
    if (update.message.photo) {
      const isAdmin = ADMIN_IDS.includes(chatId);
      
      if (isAdmin) {
        // الصورة وصلت - ناخد أعلى جودة
        const photo = update.message.photo.pop();
        const fileId = photo.file_id;
        const caption = update.message.caption || '';
        
        // نجيب رابط الصورة
        const fileResponse = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
        const fileData = await fileResponse.json();
        
        if (fileData.ok) {
          const filePath = fileData.result.file_path;
          const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
          
          // نحمل الصورة
          const imageResponse = await fetch(fileUrl);
          const imageBuffer = await imageResponse.buffer();
          
          // نحفظها عندنا
          const uploadsDir = path.join(__dirname, 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
          }
          
          const fileName = `offer-${Date.now()}.jpg`;
          const localPath = path.join(uploadsDir, fileName);
          fs.writeFileSync(localPath, imageBuffer);
          
          const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-production.up.railway.app`;
          const imageUrl = `${baseUrl}/uploads/${fileName}`;
          
          // نضيف العرض
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
            (caption ? `📝 التعليق: ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}` : '')
          );
        }
      }
    }
  }
  
  // معالجة الأزرار (للطلبات)
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
      
      // باقي كود الأزرار...
    }
  }
  
  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر Zayed-ID شغال على بورت ${PORT}`);
  console.log(`📱 نظام العروض مفعل:`);
  console.log(`   - أرسل نص → عرض نصي`);
  console.log(`   - أرسل صورة → عرض مصور`);
  console.log(`   - /offers → عرض كل العروض`);
  console.log(`   - /delete_offer ID → مسح عرض`);
});
