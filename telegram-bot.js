const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// دعم fetch للإصدارات الحديثة
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ==================== البوتات (12 بوت - مع بوت العروض) ====================
const BOTS = {
  // بوتات الخدمات (11 بوت)
  supermarket: { token: "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A", api: "https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A" },
  restaurant: { token: "8529394963:AAGKZYTeAUwsnK9RJF-sbOmIj6e7F7XmJdw", api: "https://api.telegram.org/bot8529394963:AAGKZYTeAUwsnK9RJF-sbOmIj6e7F7XmJdw" },
  ironing: { token: "8216174777:AAERldfUvyWcDsXWPHLrnvz4bmmkcQiTzus", api: "https://api.telegram.org/bot8216174777:AAERldfUvyWcDsXWPHLrnvz4bmmkcQiTzus" },
  pharmacy: { token: "8557544201:AAEJLfUMQ1jdbQewFURGuKbQCKEiS5TgYfY", api: "https://api.telegram.org/bot8557544201:AAEJLfUMQ1jdbQewFURGuKbQCKEiS5TgYfY" },
  winch: { token: "8543383060:AAFuFvm31hgVKe_DdifO_zQ1BilhYiyrf2s", api: "https://api.telegram.org/bot8543383060:AAFuFvm31hgVKe_DdifO_zQ1BilhYiyrf2s" },
  electrician: { token: "8037007700:AAF-f9jKDPBrL6FiAaZRWsKRjoGu9eRMBj4", api: "https://api.telegram.org/bot8037007700:AAF-f9jKDPBrL6FiAaZRWsKRjoGu9eRMBj4" },
  moving: { token: "8588996744:AAHz1dJwLd4zmTD47zKdH25qUyz05Gerdtc", api: "https://api.telegram.org/bot8588996744:AAHz1dJwLd4zmTD47zKdH25qUyz05Gerdtc" },
  marble: { token: "8318895116:AAFWrsOhjpyRSjF1ivr4SPe_N_cOs6fwFlE", api: "https://api.telegram.org/bot8318895116:AAFWrsOhjpyRSjF1ivr4SPe_N_cOs6fwFlE" },
  plumbing: { token: "8514986529:AAF50RKZgQjXymrv4Y6Sd9Uw-UVBC3bCK4Y", api: "https://api.telegram.org/bot8514986529:AAF50RKZgQjXymrv4Y6Sd9Uw-UVBC3bCK4Y" },
  carpentry: { token: "8328607450:AAFR_fCtlFq4nPEdx5az27fsdpTg0rFi1Bs", api: "https://api.telegram.org/bot8328607450:AAFR_fCtlFq4nPEdx5az27fsdpTg0rFi1Bs" },
  kitchen: { token: "8036001015:AAFLp3P1pzHgtiUyPQqNyheKLRqF2VrQxdU", api: "https://api.telegram.org/bot8036001015:AAFLp3P1pzHgtiUyPQqNyheKLRqF2VrQxdU" },
  
  // بوت العروض (منفصل)
  offers: { token: "8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4", api: "https://api.telegram.org/bot8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4" }
};

const DRIVER_CHANNEL_ID = "1814331589";
const ADMIN_IDS = [1814331589];

let orders = [];
let pendingOrders = {};
let offers = [];

// ==================== دوال المساعدة ====================
const sendMessage = async (chatId, text, keyboard = null, botType = 'supermarket') => {
  try {
    const payload = { chat_id: chatId, text: text, parse_mode: 'HTML' };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    
    const response = await fetch(`${BOTS[botType].api}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (e) { console.error("Send Error:", e); return null; }
};

const sendVoice = async (chatId, voiceUrl, botType = 'supermarket') => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('voice', voiceUrl);

    const response = await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    return await response.json();
  } catch (e) { console.error("Voice Error:", e); return null; }
};

const sendPhoto = async (chatId, photoUrl, caption = '', botType = 'supermarket') => {
  try {
    const response = await fetch(`${BOTS[botType].api}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: caption, parse_mode: 'HTML' })
    });
    return await response.json();
  } catch (e) { console.error("Photo Error:", e); return null; }
};

const editMessage = async (chatId, messageId, text, keyboard = null, botType = 'supermarket') => {
  try {
    const payload = { chat_id: chatId, message_id: messageId, text: text, parse_mode: 'HTML' };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    
    await fetch(`${BOTS[botType].api}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error("Edit Error:", e); }
};

// ==================== رفع الصور ====================
app.post('/upload-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: 'لا يوجد صورة' });

    const imageBuffer = Buffer.from(image, 'base64');
    const fileName = `image-${Date.now()}.jpg`;
    const filePath = `/tmp/${fileName}`;
    fs.writeFileSync(filePath, imageBuffer);

    const fileUrl = `https://zayedid-production.up.railway.app/uploads/${fileName}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== رفع الصوت ====================
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });

    const audioBuffer = Buffer.from(audio, 'base64');
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = `/tmp/${fileName}`;
    fs.writeFileSync(filePath, audioBuffer);

    const fileUrl = `https://zayedid-production.up.railway.app/uploads/${fileName}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// خدمة الملفات
app.use('/uploads', express.static('/tmp', {
  setHeaders: (res, path) => {
    if (path.endsWith('.ogg')) res.setHeader('Content-Type', 'audio/ogg');
  }
}));

// ==================== نظام العروض ====================
app.get('/api/offers', (req, res) => {
  const sortedOffers = [...offers].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ success: true, offers: sortedOffers });
});

// ==================== جلب الطلبات النشطة ====================
app.get('/active-orders', (req, res) => {
  try {
    const activeOrders = orders.filter(o => {
      if (o.status === '✅ تم التسليم' ||
          o.status === '🎉 تم التسليم' ||
          o.status === 'تم التسليم' ||
          o.status === 'تم التوصيل') {
        return false;
      }
      return true;
    });

    res.json({
      success: true,
      orders: activeOrders.map(o => ({
        id: o.id,
        phone: o.phone,
        address: o.address,
        serviceName: o.serviceName,
        status: o.status,
        date: o.date,
        driverPhone: o.driverPhone || null,
        itemsPrice: o.itemsPrice || 0,
        deliveryFee: o.deliveryFee || 0,
        totalPrice: o.totalPrice || 0,
        items: o.items || []
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== حالة طلب معين ====================
app.get('/order-status/:orderId', (req, res) => {
  try {
    const order = orders.find(o => o.id === req.params.orderId);
    if (order) {
      res.json({
        success: true,
        status: order.status,
        phone: order.phone,
        address: order.address,
        driverPhone: order.driverPhone || null,
        itemsPrice: order.itemsPrice || 0,
        deliveryFee: order.deliveryFee || 0,
        totalPrice: order.totalPrice || 0
      });
    } else {
      res.json({ success: false, status: 'غير موجود' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== استقبال الطلب من التطبيق ====================
app.post('/send-order', async (req, res) => {
  const { phone, address, items, rawText, voiceUrl, imageUrl, images, serviceName = 'سوبر ماركت', itemsPrice = 0, deliveryFee = 15, location } = req.body;

  let uploadedImages = [];
  if (images && Array.isArray(images) && images.length > 0) {
    uploadedImages = images;
  } else if (imageUrl) {
    uploadedImages = [imageUrl];
  }

  if (serviceName === 'ونش') {
    uploadedImages = [];
  }

  const botMap = {
    'سوبر ماركت': 'supermarket',
    'مطاعم': 'restaurant',
    'مكوجي': 'ironing',
    'صيدلية': 'pharmacy',
    'ونش': 'winch',
    'كهربائي': 'electrician',
    'نقل اثاث': 'moving',
    'رخام': 'marble',
    'سباكة': 'plumbing',
    'نجارة': 'carpentry',
    'مطابخ': 'kitchen'
  };

  const botType = botMap[serviceName] || 'supermarket';
  console.log(`📤 إرسال طلب: ${serviceName} → botType: ${botType}`);

  const orderId = (serviceName === 'مكوجي' ? 'IRN-' : 'ORD-') + Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString();

  const technicalServices = ['ونش', 'كهربائي', 'سباكة', 'نجارة', 'نقل اثاث', 'رخام', 'مطابخ'];
  const isTechnical = technicalServices.includes(serviceName);
  const productServices = ['سوبر ماركت', 'صيدلية'];
  const isProduct = productServices.includes(serviceName);
  const isIroning = serviceName === 'مكوجي';

  let initialStatus = '';
  if (isTechnical) {
    initialStatus = '📦 تم استلام طلبك (سيتم التواصل خلال 24 ساعة)';
  } else if (isIroning) {
    initialStatus = '👕 تم استلام الملابس';
  } else if (isProduct) {
    initialStatus = '🛒 جاري تجهيز الطلبية';
  } else {
    initialStatus = '📦 تم استلام طلبك';
  }

  const newOrder = {
    id: orderId,
    phone,
    address,
    items: Array.isArray(items) ? items : (rawText ? [rawText] : ['طلب بدون تفاصيل']),
    status: initialStatus,
    serviceName,
    botType,
    date,
    itemsPrice: 0,
    deliveryFee: 0,
    totalPrice: 0,
    driverPhone: null,
    accepted: false,
    images: uploadedImages,
    voiceUrl: voiceUrl || null,
    location: location || null
  };
  orders.push(newOrder);

  let message = '';

  if (isTechnical) {
    message =
      `🛻 <b>طلب خدمة فنية - ${serviceName}</b>\n` +
      `════════════════════════\n` +
      `👤 <b>العميل:</b> ${phone}\n` +
      `📍 <b>العنوان:</b> ${address}\n`;

    if (serviceName === 'ونش' && location) {
      message += `📍 <b>الموقع:</b> <a href="https://maps.google.com/?q=${location}">اضغط للعرض</a>\n`;
    }

    message +=
      `════════════════════════\n` +
      `📝 <b>وصف المشكلة:</b>\n${rawText || 'بدون وصف'}\n`;

    if (uploadedImages.length > 0) {
      message += `\n🖼️ <b>عدد الصور المرفقة:</b> ${uploadedImages.length}\n`;
    }
    if (voiceUrl) message += `🎤 <b>تسجيل صوتي مرفق</b>\n`;

    message +=
      `════════════════════════\n` +
      `💰 <b>التسعير:</b> يحدد السعر بعد المعاينة والفحص\n` +
      `════════════════════════\n` +
      `🔻 <b>الحالة:</b> ${initialStatus}\n` +
      `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>`;

  } else if (isIroning) {
    message =
      `👕 <b>طلب مكوجي</b>\n` +
      `════════════════════════\n` +
      `👤 <b>العميل:</b> ${phone}\n` +
      `📍 <b>العنوان:</b> ${address}\n` +
      `════════════════════════\n` +
      `📝 <b>تفاصيل الملابس:</b>\n${Array.isArray(items) ? items.join('\n') : items}\n`;

    if (voiceUrl) message += `🎤 <b>تسجيل صوتي مرفق</b>\n`;

    message +=
      `════════════════════════\n` +
      `💰 <b>سعر الغسيل:</b> يحدد حسب عدد القطع عند الاستلام\n` +
      `🚚 <b>رسوم التوصيل:</b> ${deliveryFee} ج\n` +
      `════════════════════════\n` +
      `🔻 <b>الحالة:</b> ${initialStatus}\n` +
      `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>`;

  } else if (isProduct) {
    message =
      `🛒 <b>طلب - ${serviceName}</b>\n` +
      `════════════════════════\n` +
      `👤 <b>العميل:</b> ${phone}\n` +
      `📍 <b>العنوان:</b> ${address}\n` +
      `════════════════════════\n` +
      `📝 <b>المنتجات:</b>\n${Array.isArray(items) ? items.join('\n') : items}\n`;

    if (uploadedImages.length > 0) {
      message += `\n🖼️ <b>عدد الصور المرفقة:</b> ${uploadedImages.length}\n`;
    }
    if (voiceUrl) message += `🎤 <b>تسجيل صوتي مرفق</b>\n`;

    message +=
      `════════════════════════\n` +
      `💰 <b>سعر المنتجات:</b> يحدد لاحقاً\n` +
      `🚚 <b>خدمة التوصيل:</b> يحدد لاحقاً\n` +
      `════════════════════════\n` +
      `🔻 <b>الحالة:</b> ${initialStatus}\n` +
      `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>`;
  }

  let keyboard = [[
    { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
  ]];

  await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);

  for (const img of uploadedImages) {
    await sendPhoto(DRIVER_CHANNEL_ID, img, '🖼️ صورة الطلب', botType);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (voiceUrl) await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);

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

// ==================== خدمة صور العروض ====================
app.use('/offer-uploads', express.static(path.join(__dirname, 'offer-uploads')));

// ==================== معالجة أزرار المندوبين ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const { data, message, id } = update.callback_query;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    await fetch(`https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id })
    });

    if (data.startsWith('accept_')) {
      const orderId = data.replace('accept_', '');
      const order = orders.find(o => o.id === orderId);

      if (order && !order.accepted) {
        order.accepted = true;
        order.acceptedBy = chatId;

        await editMessage(chatId, messageId, message.text, [], order.botType);

        await sendMessage(DRIVER_CHANNEL_ID,
          `🔔 <b>الطلب #${orderId} تم قبوله بواسطة مندوب</b>`,
          null,
          order.botType
        );

        await sendMessage(chatId,
          `✅ <b>تم قبول الطلب #${orderId}</b>\n\n` +
          `الرجاء إرسال رقم تليفونك للتواصل مع العميل:`,
          null,
          order.botType
        );

        pendingOrders[chatId] = orderId;
      }
    }

    else if (data.startsWith('status_')) {
      const [_, orderId, statusKey] = data.split('_');
      const order = orders.find(o => o.id === orderId);

      if (order) {
        let newStatus = '';
        let buttons = [];

        if (order.serviceName === 'مكوجي') {
          if (statusKey === 'collecting') newStatus = '🚚 جاري مندوبنا لاستلام الملابس';
          else if (statusKey === 'washing') newStatus = '🧼 جاري الغسيل والكي';
          else if (statusKey === 'ready') newStatus = '✅ تم التجهيز وجاري التوصيل';
          else if (statusKey === 'done') newStatus = '🎉 تم التسليم';

          if (statusKey === 'collecting') {
            buttons = [
              [{ text: '🧼 جاري الغسيل', callback_data: `status_${orderId}_washing` }],
              [{ text: '✅ تم التجهيز', callback_data: `status_${orderId}_ready` }],
              [{ text: '🎉 تم التسليم', callback_data: `status_${orderId}_done` }]
            ];
          } else if (statusKey === 'washing') {
            buttons = [
              [{ text: '✅ تم التجهيز', callback_data: `status_${orderId}_ready` }],
              [{ text: '🎉 تم التسليم', callback_data: `status_${orderId}_done` }]
            ];
          } else if (statusKey === 'ready') {
            buttons = [
              [{ text: '🎉 تم التسليم', callback_data: `status_${orderId}_done` }]
            ];
          }

        } else if (['ونش', 'كهربائي', 'سباكة', 'نجارة', 'نقل اثاث', 'رخام', 'مطابخ'].includes(order.serviceName)) {
          if (statusKey === 'inspection') newStatus = '🔧 الفني في الطريق للمعاينة';
          else if (statusKey === 'working') newStatus = '⚙️ جاري العمل على الإصلاح';
          else if (statusKey === 'done') newStatus = '✅ تم إنهاء الخدمة بنجاح';

          if (statusKey === 'inspection') {
            buttons = [
              [{ text: '⚙️ جاري العمل', callback_data: `status_${orderId}_working` }],
              [{ text: '✅ تم الإنتهاء', callback_data: `status_${orderId}_done` }]
            ];
          } else if (statusKey === 'working') {
            buttons = [
              [{ text: '✅ تم الإنتهاء', callback_data: `status_${orderId}_done` }]
            ];
          }

        } else {
          if (statusKey === 'preparing') newStatus = '🔧 جاري تجهيز الطلبية';
          else if (statusKey === 'delivering') newStatus = '🚚 الطلب مع مندوب التوصيل';
          else if (statusKey === 'done') newStatus = '✅ تم التسليم';

          if (statusKey === 'preparing') {
            buttons = [
              [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }],
              [{ text: '✅ تم التسليم', callback_data: `status_${orderId}_done` }]
            ];
          } else if (statusKey === 'delivering') {
            buttons = [
              [{ text: '✅ تم التسليم', callback_data: `status_${orderId}_done` }]
            ];
          }
        }

        order.status = newStatus;

        const updatedText = message.text.replace(/🔻 الحالة:.+/, `🔻 الحالة: ${newStatus}`);
        await editMessage(chatId, messageId, updatedText, buttons.length ? buttons : null, order.botType);
      }
    }
  }

  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (pendingOrders[chatId] && text.match(/^01[0-9]{9}$/)) {
      const orderId = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);

      if (order) {
        order.driverPhone = text;

        if (order.serviceName === 'مكوجي') {
          await sendMessage(chatId,
            `✅ تم حفظ رقم التليفون: ${text}\n\n` +
            `💰 الرجاء إدخال سعر الغسيل (إجمالي):`,
            null,
            order.botType
          );
          pendingOrders[`price_${chatId}`] = orderId;
        } else {
          await sendMessage(chatId,
            `✅ تم حفظ رقم التليفون: ${text}\n\n` +
            `💰 الرجاء إدخال سعر الخدمة (إجمالي):`,
            null,
            order.botType
          );
          pendingOrders[`price_${chatId}`] = orderId;
        }

        delete pendingOrders[chatId];
      }
    }

    else if (pendingOrders[`price_${chatId}`] && text.match(/^\d+$/)) {
      const orderId = pendingOrders[`price_${chatId}`];
      const order = orders.find(o => o.id === orderId);

      if (order) {
        order.itemsPrice = parseInt(text);
        order.totalPrice = order.itemsPrice;

        let statusButtons = [];

        if (order.serviceName === 'مكوجي') {
          statusButtons = [
            [{ text: '🚚 جاري مندوبنا لاستلام الملابس', callback_data: `status_${orderId}_collecting` }],
            [{ text: '🧼 جاري الغسيل', callback_data: `status_${orderId}_washing` }],
            [{ text: '✅ تم التجهيز', callback_data: `status_${orderId}_ready` }],
            [{ text: '🎉 تم التسليم', callback_data: `status_${orderId}_done` }]
          ];
        } else if (['ونش', 'كهربائي', 'سباكة', 'نجارة', 'نقل اثاث', 'رخام', 'مطابخ'].includes(order.serviceName)) {
          statusButtons = [
            [{ text: '🔧 الفني في الطريق للمعاينة', callback_data: `status_${orderId}_inspection` }],
            [{ text: '⚙️ جاري العمل', callback_data: `status_${orderId}_working` }],
            [{ text: '✅ تم الإنتهاء', callback_data: `status_${orderId}_done` }]
          ];
        } else {
          statusButtons = [
            [{ text: '🔧 جاري التجهيز', callback_data: `status_${orderId}_preparing` }],
            [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }],
            [{ text: '✅ تم التسليم', callback_data: `status_${orderId}_done` }]
          ];
        }

        await sendMessage(chatId,
          `✅ <b>تم حفظ جميع البيانات</b>\n\n` +
          `📞 رقم المندوب: ${order.driverPhone}\n` +
          `💰 إجمالي السعر: ${order.totalPrice} ج\n\n` +
          `🔻 يمكنك الآن تحديث حالة الطلب:`,
          statusButtons,
          order.botType
        );

        delete pendingOrders[`price_${chatId}`];
      }
    }
  }

  res.sendStatus(200);
});

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ جميع الأنظمة شغالة',
    time: new Date().toISOString(),
    bots: Object.keys(BOTS),
    ordersCount: orders.length,
    offersCount: offers.length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 السيرفر الموحد شغال على بورت ${PORT}`);
  console.log(`🤖 عدد البوتات: ${Object.keys(BOTS).length} بوت (مع بوت العروض)`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`🔗 رابط العروض: /api/offers`);
});
