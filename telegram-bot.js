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

// تخزين البيانات
let customers = {};
let orders = [];
let offers = [];

// ==================== دوال مساعدة ====================
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
    console.error(`خطأ في إرسال رسالة للبوت ${botType}:`, error);
  }
};

const sendVoice = async (chatId, voiceUrl, botType = 'main') => {
  try {
    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        voice: voiceUrl
      })
    });
    return await response.json();
  } catch (error) {
    console.error(`خطأ في إرسال الصوت للبوت ${botType}:`, error);
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
    console.error(`خطأ في تعديل رسالة للبوت ${botType}:`, error);
  }
};

// ==================== إرسال تحديث للعميل ====================
const notifyCustomer = async (order, newStatus) => {
  try {
    const statusMessages = {
      'جاري التوصيل': '🚚 المندوب في الطريق إليك!',
      'تم التوصيل': '✅ تم توصيل طلبك بنجاح'
    };

    const message = 
      `🔔 <b>تحديث حالة الطلب #${order.id}</b>\n\n` +
      `الحالة: <b>${newStatus}</b>\n` +
      `${statusMessages[newStatus] || ''}\n\n` +
      `📞 للاستفسار: ${order.driverPhone || 'قريباً'}`;

    await sendMessage(order.phone, message, null, order.botType);
  } catch (error) {
    console.error('خطأ في إشعار العميل:', error);
  }
};

// ==================== فحص جميع المسارات ====================
app.get('/routes', (req, res) => {
  res.json({
    availableRoutes: [
      '/',
      '/send-order (POST)',
      '/upload-voice (POST)',
      '/voices/:filename (GET)',
      '/order-status/:orderId (GET)',
      '/active-orders (GET)',
      '/webhook (POST)',
      '/webhook-offers (POST)',
      '/api/offers (GET)',
      '/routes (GET)'
    ]
  });
});

// ==================== جلب حالة الطلب ====================
app.get('/order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.id === orderId);

  if (order) {
    res.json({ success: true, status: order.status, orderId });
  } else {
    res.json({ success: false, status: 'غير موجود', orderId });
  }
});

// ==================== جلب الطلبات النشطة ====================
app.get('/active-orders', (req, res) => {
  const activeOrders = orders.filter(o => o.status !== 'تم التوصيل');
  
  const formattedOrders = activeOrders.map(o => ({
    id: o.id,
    phone: o.phone,
    address: o.address,
    serviceName: o.serviceName || 'طلب',
    status: o.status,
    date: o.date
  }));

  res.json({ 
    success: true, 
    orders: formattedOrders
  });
});

// ==================== رفع الملفات الصوتية ====================
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;

    if (!audio) {
      return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });
    }

    console.log('📥 تم استقبال ملف صوتي');

    const audioBuffer = Buffer.from(audio, 'base64');
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = `/tmp/${fileName}`;

    fs.writeFileSync(filePath, audioBuffer);

    const fileUrl = `https://zayedid-production.up.railway.app/voices/${fileName}`;

    console.log('🔗 رابط الملف الصوتي:', fileUrl);

    res.json({ success: true, url: fileUrl });
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

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ بوت Zayed-ID شغال على Railway!',
    bots: Object.keys(BOTS),
    ordersCount: orders.length,
    offersCount: offers.length
  });
});

// ==================== مسارات بوت العروض ====================
app.get('/api/offers', (req, res) => {
  const sortedOffers = [...offers].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  res.json({
    success: true,
    offers: sortedOffers
  });
});

app.post('/webhook-offers', async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const isAdmin = chatId === 1814331589;

    if (!isAdmin) {
      return res.sendStatus(200);
    }

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

      await sendMessage(chatId,
        `✅ <b>تم نشر العرض بنجاح!</b>\n` +
        `🆔 معرف العرض: <code>${offerId}</code>\n` +
        `📝 النص: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        null,
        'offers'
      );
    }

    else if (text) {
      if (text === '/offers') {
        if (offers.length === 0) {
          await sendMessage(chatId, '📭 لا توجد عروض حالياً', null, 'offers');
        } else {
          let response = '📋 <b>العروض الحالية:</b>\n\n';
          offers.slice(-10).reverse().forEach((offer, index) => {
            response += `${index + 1}. 🆔 <code>${offer.id}</code>\n`;
            response += `   📝 ${offer.text.substring(0, 50)}${offer.text.length > 50 ? '...' : ''}\n`;
            response += `   🕐 ${new Date(offer.createdAt).toLocaleString('ar-EG')}\n\n`;
          });
          await sendMessage(chatId, response, null, 'offers');
        }
      }

      else if (text.startsWith('/delete_offer ')) {
        const offerId = text.replace('/delete_offer ', '').trim();
        const index = offers.findIndex(o => o.id === offerId);

        if (index !== -1) {
          offers.splice(index, 1);
          await sendMessage(chatId, `✅ تم مسح العرض <code>${offerId}</code>`, null, 'offers');
        } else {
          await sendMessage(chatId, `❌ العرض <code>${offerId}</code> غير موجود`, null, 'offers');
        }
      }

      else if (text === '/clear_all') {
        offers = [];
        await sendMessage(chatId, '✅ تم مسح جميع العروض', null, 'offers');
      }
    }

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

        const uploadsDir = '/tmp/offer-uploads';
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `offer-${Date.now()}.jpg`;
        const localPath = `${uploadsDir}/${fileName}`;
        fs.writeFileSync(localPath, imageBuffer);

        const imageUrl = `https://zayedid-production.up.railway.app/offer-uploads/${fileName}`;

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

        await sendMessage(chatId,
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

app.use('/offer-uploads', express.static('/tmp/offer-uploads'));

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);

  const { phone, address, items, rawText, voiceUrl, serviceName = 'سوبر ماركت', totalPrice } = req.body;

  const botType = serviceName === 'مكوجي' ? 'ironing' : 'main';
  
  const orderId = serviceName === 'مكوجي' ? 'IRN-' + Math.floor(Math.random() * 1000000) : 'ORD-' + Math.floor(Math.random() * 1000000);

  let initialStatus = 'تم استلام طلبك';
  if (serviceName === 'سوبر ماركت') initialStatus = 'جاري تجهيز الطلب';

  const newOrder = {
    id: orderId,
    phone,
    address,
    items: Array.isArray(items) ? items.join('، ') : items,
    fullText: rawText,
    date: new Date().toLocaleString('ar-EG'),
    status: initialStatus,
    customerChatId: phone,
    messageId: null,
    botType,
    serviceName,
    totalPrice: totalPrice || 0,
    driverPhone: null
  };

  orders.push(newOrder);

  const message =
    `🆕 <b>طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address}\n\n` +
    `🛒 <b>المنتجات المطلوبة:</b>\n` +
    `──────────────────\n` +
    (Array.isArray(items) ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : items) + `\n` +
    `──────────────────\n` +
    `💰 <b>الإجمالي:</b> ${totalPrice} ج\n\n` +
    `🔻 <b>الحالة:</b> ${initialStatus}\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;

  const keyboard = [
    [
      { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
    ]
  ];

  const response = await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);

  if (response && response.ok) {
    newOrder.messageId = response.result.message_id;

    if (voiceUrl) {
      setTimeout(async () => {
        await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);
      }, 2000);
    }
  }

  res.json({ success: true, orderId });
});

// ==================== معالجة ضغط الأزرار من المندوبين ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const data = callback.data;

    await fetch(`https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A/answerCallbackQuery`, {
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

    // قبول الطلب - مباشرة تظهر أزرار التتبع
    if (action === 'accept') {
      // تحديث رسالة القبول
      await editMessage(chatId, messageId, callback.message.text, [], order.botType);
      
      // إرسال أزرار التتبع مباشرة
      await sendMessage(chatId,
        `✅ تم قبول الطلب #${orderId}\n\n` +
        `🔻 يمكنك الآن تحديث حالة التتبع:`,
        [
          [
            { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
            { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
          ]
        ],
        order.botType
      );
    }

    // تحديث حالة التتبع
    else if (action === 'status') {
      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      
      const oldStatus = order.status;
      order.status = newStatus;
      
      // تحديث رسالة المندوبين
      const updatedMessage = callback.message.text.replace(oldStatus, newStatus);
      
      // تحديد الأزرار حسب الحالة الجديدة
      let buttons = [];
      if (newStatus === 'جاري التوصيل') {
        buttons = [[
          { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
          { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
        ]];
      } else if (newStatus === 'تم التوصيل') {
        buttons = [[
          { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
        ]];
      }
      
      await editMessage(chatId, messageId, updatedMessage, buttons, order.botType);
      
      // إشعار بالقناة الرئيسية
      const statusIcon = newStatus === 'جاري التوصيل' ? '🚚' : '✅';
      await sendMessage(DRIVER_CHANNEL_ID,
        `${statusIcon} <b>تحديث الطلب #${orderId}</b>\n` +
        `الحالة الجديدة: ${newStatus}\n` +
        `📞 العميل: ${order.phone}\n` +
        `📍 العنوان: ${order.address}`,
        null,
        order.botType
      );
      
      // إرسال تحديث للعميل
      await notifyCustomer(order, newStatus);
    }
  }

  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت Zayed-ID شغال على بورت ${PORT}`);
  console.log(`🔗 رابط السيرفر: https://zayedid-production.up.railway.app`);
  console.log(`🤖 البوت الرئيسي: 8216105936`);
  console.log(`🤖 بوت المكوجي: 8216174777`);
  console.log(`🤖 بوت العروض: 8367864849`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`✅ نظام التتبع: مباشرة بعد القبول`);
});
