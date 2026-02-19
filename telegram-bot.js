const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ==================== البوتات ====================
const BOTS = {
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
  kitchen: { token: "8036001015:AAFLp3P1pzHgtiUyPQqNyheKLRqF2VrQxdU", api: "https://api.telegram.org/bot8036001015:AAFLp3P1pzHgtiUyPQqNyheKLRqF2VrQxdU" }
};

// جروبات كل خدمة (كل خدمة لها جروب خاص)
const GROUPS = {
  supermarket: "1814331589",
  restaurant: "1814331589",
  ironing: "1814331589",
  pharmacy: "1814331589",
  winch: "1814331589",
  electrician: "1814331589",
  moving: "1814331589",
  marble: "1814331589",
  plumbing: "1814331589",
  carpentry: "1814331589",
  kitchen: "1814331589"
};

let orders = [];
let pendingOrders = {};

// ==================== دوال المساعدة ====================
const sendMessage = async (chatId, text, keyboard = null, botType = 'supermarket') => {
  try {
    const payload = { chat_id: chatId, text: text, parse_mode: 'HTML' };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    await fetch(`${BOTS[botType].api}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error("Send Error:", e); }
};

const sendVoice = async (chatId, voiceUrl, botType = 'supermarket') => {
  try {
    await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, voice: voiceUrl })
    });
  } catch (e) { console.error("Voice Error:", e); }
};

const sendPhoto = async (chatId, photoUrl, caption = '', botType = 'supermarket') => {
  try {
    await fetch(`${BOTS[botType].api}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: caption, parse_mode: 'HTML' })
    });
  } catch (e) { console.error("Photo Error:", e); }
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

// ==================== خدمة الملفات ====================
app.use('/uploads', express.static('/tmp', {
  setHeaders: (res, path) => {
    if (path.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
    }
  }
}));

// ==================== جلب الطلبات النشطة ====================
app.get('/active-orders', (req, res) => {
  try {
    const activeOrders = orders.filter(o => o.status !== '✅ تم التوصيل');
    res.json({ success: true, orders: activeOrders.map(o => ({
      id: o.id,
      phone: o.phone,
      address: o.address,
      serviceName: o.serviceName,
      status: o.status,
      date: o.date,
      driverPhone: o.driverPhone || null,
      itemsPrice: o.itemsPrice || 0,
      deliveryFee: o.deliveryFee || 0,
      totalPrice: o.totalPrice || 0
    })) });
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
  const { phone, address, items, rawText, voiceUrl, imageUrl, serviceName = 'سوبر ماركت', itemsPrice = 0, deliveryFee = 15 } = req.body;
  
  // خريطة الخدمات للبوتات
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
  const groupId = GROUPS[botType] || "1814331589";
  
  const orderId = (serviceName === 'مكوجي' ? 'IRN-' : 'ORD-') + Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString();
  
  // تحديد الحالة الأولية حسب الخدمة
  let initialStatus = '📦 تم استلام طلبك';
  let serviceType = 'normal';
  
  if (serviceName === 'ونش' || serviceName === 'كهربائي' || serviceName === 'نقل اثاث' || 
      serviceName === 'رخام' || serviceName === 'سباكة' || serviceName === 'نجارة' || serviceName === 'مطابخ') {
    initialStatus = '📦 تم استلام طلبك (سيتم التواصل خلال 24 ساعة)';
    serviceType = 'service';
  }

  const newOrder = { 
    id: orderId, 
    phone, 
    address, 
    items: Array.isArray(items) ? items : [items], 
    status: initialStatus, 
    serviceName, 
    botType, 
    date,
    itemsPrice: serviceName === 'سوبر ماركت' ? itemsPrice : 0, // سوبر ماركت يجيب السعر من التطبيق
    deliveryFee: 0, // المندوب سيدخله بعدين
    totalPrice: serviceName === 'سوبر ماركت' ? itemsPrice : 0,
    driverPhone: null,
    accepted: false
  };
  orders.push(newOrder);

  // رسالة للمندوبين
  let message = 
    `🧾 <b>طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n` +
    `📞 <b>العميل:</b> ${phone}\n` +
    `📍 <b>العنوان:</b> ${address}\n` +
    `──────────────────\n` +
    `📝 <b>التفاصيل:</b>\n${Array.isArray(items) ? items.join('\n') : items}\n`;
  
  // سوبر ماركت السعر معروف من البداية
  if (serviceName === 'سوبر ماركت') {
    message += `──────────────────\n💰 <b>سعر الطلبات:</b> ${itemsPrice} ج\n`;
  }
  
  if (imageUrl) message += `🖼️ <b>صورة مرفقة</b>\n`;
  if (voiceUrl) message += `🎤 <b>تسجيل صوتي مرفق</b>\n`;
  
  message += 
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> ${initialStatus}\n` +
    `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>`;

  // أزرار القبول
  let keyboard = [[
    { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
  ]];

  await sendMessage(groupId, message, keyboard, botType);
  
  if (imageUrl) await sendPhoto(groupId, imageUrl, '🖼️ صورة الطلب', botType);
  if (voiceUrl) await sendVoice(groupId, voiceUrl, botType);

  res.json({ success: true, orderId });
});

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
        
        // إخفاء أزرار القبول
        await editMessage(chatId, messageId, message.text, [], order.botType);
        
        // إرسال رسالة للجروب أن الطلب اتعمل
        await sendMessage(GROUPS[order.botType],
          `🔔 <b>الطلب #${orderId} تم قبوله بواسطة مندوب</b>`,
          null,
          order.botType
        );
        
        // بدأ عملية إدخال البيانات
        let nextMessage = '';
        
        if (order.serviceName === 'سوبر ماركت') {
          // سوبر ماركت: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك للتواصل مع العميل:`;
        } else if (order.serviceName === 'مكوجي') {
          // مكوجي: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك للتواصل مع العميل:`;
        } else if (order.serviceName === 'صيدلية') {
          // صيدلية: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك للتواصل مع العميل:`;
        } else {
          // باقي الخدمات: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك للتواصل مع العميل:`;
        }
        
        await sendMessage(chatId, nextMessage, null, order.botType);
        pendingOrders[chatId] = orderId;
      }
    }
  }
  
  // استقبال رقم التليفون من المندوب
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (pendingOrders[chatId] && text.match(/^01[0-9]{9}$/)) {
      const orderId = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        order.driverPhone = text;
        
        let nextMessage = '';
        
        if (order.serviceName === 'سوبر ماركت') {
          // سوبر ماركت: بعد رقم التليفون نطلب تكلفة التوصيل
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n🚚 الرجاء إدخال تكلفة خدمة التوصيل:`;
          pendingOrders[`delivery_${chatId}`] = orderId;
        } else if (order.serviceName === 'مكوجي') {
          // مكوجي: بعد رقم التليفون نطلب تكلفة التوصيل (السعر محدد)
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n💰 سعر الطلبات: ${order.itemsPrice} ج\n🚚 الرجاء إدخال تكلفة خدمة التوصيل:`;
          pendingOrders[`delivery_${chatId}`] = orderId;
        } else if (order.serviceName === 'صيدلية') {
          // صيدلية: بعد رقم التليفون نطلب سعر الطلبات
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n💰 الرجاء إدخال سعر الطلبات:`;
          pendingOrders[`price_${chatId}`] = orderId;
        } else {
          // باقي الخدمات: بعد رقم التليفون نطلب سعر الطلبات
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n💰 الرجاء إدخال سعر الطلبات:`;
          pendingOrders[`price_${chatId}`] = orderId;
        }
        
        await sendMessage(chatId, nextMessage, null, order.botType);
        delete pendingOrders[chatId];
      }
    }
    
    else if (pendingOrders[`price_${chatId}`] && text.match(/^\d+$/)) {
      const orderId = pendingOrders[`price_${chatId}`];
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        order.itemsPrice = parseInt(text);
        order.totalPrice = order.itemsPrice;
        
        await sendMessage(chatId,
          `✅ تم حفظ سعر الطلبات: ${order.itemsPrice} ج\n\n🚚 الرجاء إدخال تكلفة خدمة التوصيل:`,
          null,
          order.botType
        );
        
        delete pendingOrders[`price_${chatId}`];
        pendingOrders[`delivery_${chatId}`] = orderId;
      }
    }
    
    else if (pendingOrders[`delivery_${chatId}`] && text.match(/^\d+$/)) {
      const orderId = pendingOrders[`delivery_${chatId}`];
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        order.deliveryFee = parseInt(text);
        order.totalPrice = (order.itemsPrice || 0) + order.deliveryFee;
        
        // تحديث رسالة الطلب الأصلية في الجروب
        const groupId = GROUPS[order.botType];
        const orderMessage = await fetchMessages(groupId);
        
        // إرسال أزرار التتبع للمندوب
        await sendMessage(chatId,
          `✅ <b>تم حفظ جميع البيانات</b>\n\n` +
          `📞 رقم المندوب: ${order.driverPhone}\n` +
          `💰 سعر الطلبات: ${order.itemsPrice || 0} ج\n` +
          `🚚 تكلفة التوصيل: ${order.deliveryFee} ج\n` +
          `💵 الإجمالي: ${order.totalPrice} ج\n\n` +
          `🔻 يمكنك الآن تحديث حالة الطلب:`,
          [
            [
              { text: '🔧 جاري التجهيز', callback_data: `status_${orderId}_preparing` },
              { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
              { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
            ]
          ],
          order.botType
        );
        
        delete pendingOrders[`delivery_${chatId}`];
      }
    }
  }
  
  // معالجة أزرار الحالة
  if (update.callback_query && update.callback_query.data.startsWith('status_')) {
    const { data, message, id } = update.callback_query;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    
    await fetch(`https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id })
    });
    
    const [_, orderId, statusKey] = data.split('_');
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      let newStatus = '';
      let statusText = '';
      
      switch(statusKey) {
        case 'preparing':
          newStatus = '🔧 جاري تجهيز الطلبات';
          statusText = 'جاري تجهيز طلبك';
          break;
        case 'delivering':
          newStatus = '🚚 جاري التوصيل';
          statusText = 'المندوب في الطريق إليك';
          break;
        case 'done':
          newStatus = '✅ تم التوصيل';
          statusText = 'تم توصيل طلبك بنجاح';
          break;
        default:
          newStatus = order.status;
      }
      
      order.status = newStatus;
      
      // تحديث رسالة الجروب
      const updatedText = message.text.replace(/🔻 الحالة:.+/, `🔻 الحالة: ${newStatus}`);
      await editMessage(chatId, messageId, updatedText, null, order.botType);
    }
  }
  
  res.sendStatus(200);
});

// دالة مساعدة لجلب الرسائل (اختصار)
async function fetchMessages(chatId) {
  return null; // للتبسيط
}

// الصفحة الرئيسية
app.get('/', (req, res) => res.json({ 
  status: "✅ شغال", 
  ordersCount: orders.length, 
  bots: Object.keys(BOTS) 
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 شغال على بورت ${PORT}`));
