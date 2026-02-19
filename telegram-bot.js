const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// إجبار الرد على JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ==================== البوتات (11 بوت) ====================
const BOTS = {
  // الأنشطة التجارية
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

// كل الخدمات في نفس الجروب
const DRIVER_CHANNEL_ID = "1814331589";

// تخزين البيانات
let orders = [];
let pendingOrders = {}; // للطلبات المعلقة
let acceptedOrders = {}; // للطلبات المقبولة (chatId -> orderId)

// ==================== دوال مساعدة للبوتات ====================
const sendMessage = async (chatId, text, keyboard = null, botType = 'supermarket') => {
  try {
    const payload = { chat_id: chatId, text: text, parse_mode: 'HTML' };
    if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
    await fetch(`${BOTS[botType].api}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error(`Send Error (${botType}):`, e); }
};

const sendVoice = async (chatId, voiceUrl, botType = 'supermarket') => {
  try {
    await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, voice: voiceUrl })
    });
  } catch (e) { console.error(`Voice Error (${botType}):`, e); }
};

const sendPhoto = async (chatId, photoUrl, caption = '', botType = 'supermarket') => {
  try {
    await fetch(`${BOTS[botType].api}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: caption, parse_mode: 'HTML' })
    });
  } catch (e) { console.error(`Photo Error (${botType}):`, e); }
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
  } catch (e) { console.error(`Edit Error (${botType}):`, e); }
};

// ==================== رفع الملفات ====================
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

// ==================== جلب الطلبات النشطة للتطبيق ====================
app.get('/active-orders', (req, res) => {
  try {
    const activeOrders = orders.filter(o => o.status !== '✅ تم التوصيل');
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
        totalPrice: o.totalPrice || 0
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
  const orderId = (serviceName === 'مكوجي' ? 'IRN-' : 'ORD-') + Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString();
  
  // تحديد الحالة الأولية حسب الخدمة
  let initialStatus = '📦 تم استلام طلبك';
  const service24h = ['ونش', 'كهربائي', 'نقل اثاث', 'رخام', 'سباكة', 'نجارة', 'مطابخ'];
  if (service24h.includes(serviceName)) {
    initialStatus = '📦 تم استلام طلبك (سيتم التواصل خلال 24 ساعة)';
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
    itemsPrice: serviceName === 'مكوجي' ? itemsPrice : 0, // مكوجي يجيب السعر من التطبيق
    deliveryFee: 0,
    totalPrice: serviceName === 'مكوجي' ? itemsPrice : 0,
    driverPhone: null,
    accepted: false,
    acceptedBy: null,
    imageUrl: imageUrl || null,
    voiceUrl: voiceUrl || null
  };
  orders.push(newOrder);

  // بناء رسالة الطلب
  let message = 
    `🧾 <b>طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n` +
    `📞 <b>العميل:</b> ${phone}\n` +
    `📍 <b>العنوان:</b> ${address}\n` +
    `──────────────────\n` +
    `📝 <b>التفاصيل:</b>\n${Array.isArray(items) ? items.join('\n') : items}\n`;
  
  // مكوجي السعر معروف من البداية
  if (serviceName === 'مكوجي') {
    message += `──────────────────\n💰 <b>سعر الطلبات:</b> ${itemsPrice} ج\n`;
  }
  
  if (imageUrl) message += `🖼️ <b>صورة مرفقة</b>\n`;
  if (voiceUrl) message += `🎤 <b>تسجيل صوتي مرفق</b>\n`;
  
  message += 
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> ${initialStatus}\n` +
    `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>`;

  // أزرار القبول
  const keyboard = [[{ text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }]];

  await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);
  
  if (imageUrl) await sendPhoto(DRIVER_CHANNEL_ID, imageUrl, '🖼️ صورة الطلب', botType);
  if (voiceUrl) await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);

  res.json({ success: true, orderId });
});

// ==================== معالجة الويب هوك لجميع البوتات ====================
app.post('/webhook/:botType', async (req, res) => {
  const botType = req.params.botType;
  const update = req.body;
  
  // التحقق من صحة البوت
  if (!BOTS[botType]) return res.sendStatus(200);
  
  // معالجة الأزرار
  if (update.callback_query) {
    const { data, message, id } = update.callback_query;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    
    await fetch(`${BOTS[botType].api}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id })
    });

    // قبول الطلب
    if (data.startsWith('accept_')) {
      const orderId = data.replace('accept_', '');
      const order = orders.find(o => o.id === orderId);
      
      if (order && !order.accepted) {
        // الطلب لسه مقبولش
        order.accepted = true;
        order.acceptedBy = chatId;
        
        // إخفاء أزرار القبول من الجميع
        await editMessage(chatId, messageId, message.text, [], botType);
        
        // إرسال رسالة للجروب أن الطلب اتعمل
        await sendMessage(DRIVER_CHANNEL_ID,
          `🔔 <b>الطلب #${orderId} تم قبوله بواسطة مندوب</b>`,
          null,
          botType
        );
        
        // تحديد الخطوة التالية حسب نوع الخدمة
        let nextMessage = '';
        
        if (order.serviceName === 'مكوجي') {
          // مكوجي: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك:`;
          pendingOrders[chatId] = { orderId, step: 'phone', botType };
        } else if (order.serviceName === 'سوبر ماركت') {
          // سوبر ماركت: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك:`;
          pendingOrders[chatId] = { orderId, step: 'phone', botType };
        } else if (order.serviceName === 'صيدلية') {
          // صيدلية: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك:`;
          pendingOrders[chatId] = { orderId, step: 'phone', botType };
        } else {
          // الخدمات الخدمية: نطلب رقم التليفون أولاً
          nextMessage = `✅ <b>تم قبول الطلب #${orderId}</b>\n\nالرجاء إرسال رقم تليفونك:`;
          pendingOrders[chatId] = { orderId, step: 'phone', botType };
        }
        
        await sendMessage(chatId, nextMessage, null, botType);
      } else if (order && order.accepted) {
        // لو الطلب متقبل بالفعل
        await sendMessage(chatId,
          `❌ هذا الطلب تم قبوله بالفعل بواسطة مندوب آخر`,
          null,
          botType
        );
      }
    }
    
    // تحديث حالة الطلب
    else if (data.startsWith('status_')) {
      const [_, orderId, statusKey] = data.split('_');
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        let newStatus = '';
        let statusMessage = '';
        
        switch(statusKey) {
          case 'preparing':
            newStatus = '🔧 جاري التجهيز';
            statusMessage = 'جاري تجهيز طلبك';
            break;
          case 'delivering':
            newStatus = '🚚 جاري التوصيل';
            statusMessage = 'المندوب في الطريق إليك';
            break;
          case 'done':
            newStatus = '✅ تم التوصيل';
            statusMessage = 'تم توصيل طلبك بنجاح';
            break;
          case 'contacted':
            newStatus = '📞 تم التواصل';
            statusMessage = 'تم التواصل معك';
            break;
          case 'working':
            newStatus = '🔧 جاري التنفيذ';
            statusMessage = 'جاري العمل على طلبك';
            break;
          case 'finished':
            newStatus = '✅ تم الانتهاء';
            statusMessage = 'تم الانتهاء من الطلب';
            break;
          default:
            newStatus = order.status;
        }
        
        order.status = newStatus;
        
        // تحديث رسالة الجروب
        const updatedText = message.text.replace(/🔻 الحالة:.+/, `🔻 الحالة: ${newStatus}`);
        
        // تحديد الأزرار حسب الحالة الجديدة
        let buttons = [];
        if (newStatus === '🔧 جاري التجهيز' || newStatus === '📞 تم التواصل') {
          buttons = [
            [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }]
          ];
        } else if (newStatus === '🚚 جاري التوصيل') {
          buttons = [
            [{ text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }]
          ];
        } else if (newStatus === '🔧 جاري التنفيذ') {
          buttons = [
            [{ text: '✅ تم الانتهاء', callback_data: `status_${orderId}_finished` }]
          ];
        }
        
        await editMessage(chatId, messageId, updatedText, buttons.length ? buttons : null, botType);
      }
    }
  }
  
  // معالجة الرسائل النصية (استقبال بيانات المندوب)
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    // التحقق من وجود طلب معلق لهذا المندوب
    if (pendingOrders[chatId]) {
      const { orderId, step, botType } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        delete pendingOrders[chatId];
        return res.sendStatus(200);
      }
      
      // الخطوة 1: استقبال رقم التليفون
      if (step === 'phone' && text.match(/^01[0-9]{9}$/)) {
        order.driverPhone = text;
        
        let nextStep = '';
        let nextMessage = '';
        
        // تحديد الخطوة التالية حسب الخدمة
        if (order.serviceName === 'مكوجي') {
          // مكوجي: بعد رقم التليفون نطلب تكلفة التوصيل
          nextStep = 'delivery';
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n🚚 الرجاء إدخال تكلفة خدمة التوصيل:`;
        } else if (order.serviceName === 'سوبر ماركت') {
          // سوبر ماركت: بعد رقم التليفون نطلب سعر الطلبات
          nextStep = 'price';
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n💰 الرجاء إدخال سعر الطلبات:`;
        } else if (order.serviceName === 'صيدلية') {
          // صيدلية: بعد رقم التليفون نطلب سعر الطلبات
          nextStep = 'price';
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n💰 الرجاء إدخال سعر الطلبات:`;
        } else {
          // الخدمات الخدمية: بعد رقم التليفون نطلب سعر الخدمة
          nextStep = 'servicePrice';
          nextMessage = `✅ تم حفظ رقم التليفون: ${text}\n\n💰 الرجاء إدخال سعر الخدمة:`;
        }
        
        await sendMessage(chatId, nextMessage, null, botType);
        pendingOrders[chatId] = { orderId, step: nextStep, botType };
      }
      
      // الخطوة 2أ: استقبال سعر الطلبات (لسوبر ماركت والصيدلية)
      else if (step === 'price' && text.match(/^\d+$/)) {
        order.itemsPrice = parseInt(text);
        
        await sendMessage(chatId,
          `✅ تم حفظ سعر الطلبات: ${order.itemsPrice} ج\n\n🚚 الرجاء إدخال تكلفة خدمة التوصيل:`,
          null,
          botType
        );
        
        pendingOrders[chatId] = { orderId, step: 'delivery', botType };
      }
      
      // الخطوة 2ب: استقبال سعر الخدمة (للخدمات الخدمية)
      else if (step === 'servicePrice' && text.match(/^\d+$/)) {
        order.itemsPrice = parseInt(text);
        order.totalPrice = order.itemsPrice;
        
        // حساب الإجمالي
        order.totalPrice = order.itemsPrice;
        
        // عرض أزرار الحالة للخدمات الخدمية
        await sendMessage(chatId,
          `✅ <b>تم حفظ جميع البيانات</b>\n\n` +
          `📞 رقم المندوب: ${order.driverPhone}\n` +
          `💰 سعر الخدمة: ${order.itemsPrice} ج\n\n` +
          `🔻 يمكنك الآن تحديث حالة الطلب:`,
          [
            [{ text: '📞 تم التواصل', callback_data: `status_${orderId}_contacted` }],
            [{ text: '🔧 جاري التنفيذ', callback_data: `status_${orderId}_working` }],
            [{ text: '✅ تم الانتهاء', callback_data: `status_${orderId}_finished` }]
          ],
          botType
        );
        
        delete pendingOrders[chatId];
      }
      
      // الخطوة 3: استقبال تكلفة التوصيل
      else if (step === 'delivery' && text.match(/^\d+$/)) {
        order.deliveryFee = parseInt(text);
        order.totalPrice = (order.itemsPrice || 0) + order.deliveryFee;
        
        // تحديد الأزرار حسب الخدمة
        let buttons = [];
        
        if (order.serviceName === 'مكوجي') {
          buttons = [
            [{ text: '🔧 جاري التجهيز', callback_data: `status_${orderId}_preparing` }],
            [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }],
            [{ text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }]
          ];
        } else if (order.serviceName === 'سوبر ماركت') {
          buttons = [
            [{ text: '🔧 جاري التجهيز', callback_data: `status_${orderId}_preparing` }],
            [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }],
            [{ text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }]
          ];
        } else if (order.serviceName === 'صيدلية') {
          buttons = [
            [{ text: '🔧 جاري التجهيز', callback_data: `status_${orderId}_preparing` }],
            [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }],
            [{ text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }]
          ];
        }
        
        await sendMessage(chatId,
          `✅ <b>تم حفظ جميع البيانات</b>\n\n` +
          `📞 رقم المندوب: ${order.driverPhone}\n` +
          `💰 سعر الطلبات: ${order.itemsPrice || 0} ج\n` +
          `🚚 تكلفة التوصيل: ${order.deliveryFee} ج\n` +
          `💵 الإجمالي: ${order.totalPrice} ج\n\n` +
          `🔻 يمكنك الآن تحديث حالة الطلب:`,
          buttons,
          botType
        );
        
        delete pendingOrders[chatId];
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== ويب هوك واحد لجميع البوتات (للتجربة) ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  // محاولة تحديد البوت من الرسالة
  let botType = 'supermarket';
  
  // معالجة الأزرار
  if (update.callback_query) {
    const { data, message, id } = update.callback_query;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    
    await fetch(`https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id })
    });

    // قبول الطلب
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
          `الرجاء إرسال رقم تليفونك:`,
          null,
          order.botType
        );
        
        pendingOrders[chatId] = { orderId, step: 'phone', botType: order.botType };
      }
    }
    
    // تحديث حالة الطلب
    else if (data.startsWith('status_')) {
      const [_, orderId, statusKey] = data.split('_');
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        let newStatus = '';
        
        switch(statusKey) {
          case 'preparing': newStatus = '🔧 جاري التجهيز'; break;
          case 'delivering': newStatus = '🚚 جاري التوصيل'; break;
          case 'done': newStatus = '✅ تم التوصيل'; break;
          case 'contacted': newStatus = '📞 تم التواصل'; break;
          case 'working': newStatus = '🔧 جاري التنفيذ'; break;
          case 'finished': newStatus = '✅ تم الانتهاء'; break;
          default: newStatus = order.status;
        }
        
        order.status = newStatus;
        
        const updatedText = message.text.replace(/🔻 الحالة:.+/, `🔻 الحالة: ${newStatus}`);
        await editMessage(chatId, messageId, updatedText, null, order.botType);
      }
    }
  }
  
  // معالجة الرسائل النصية
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (pendingOrders[chatId]) {
      const { orderId, step, botType } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        delete pendingOrders[chatId];
        return res.sendStatus(200);
      }
      
      if (step === 'phone' && text.match(/^01[0-9]{9}$/)) {
        order.driverPhone = text;
        
        await sendMessage(chatId,
          `✅ تم حفظ رقم التليفون: ${text}\n\n` +
          `💰 الرجاء إدخال سعر الطلبات:`,
          null,
          botType
        );
        
        pendingOrders[chatId] = { orderId, step: 'price', botType };
      }
      
      else if (step === 'price' && text.match(/^\d+$/)) {
        order.itemsPrice = parseInt(text);
        
        await sendMessage(chatId,
          `✅ تم حفظ سعر الطلبات: ${order.itemsPrice} ج\n\n` +
          `🚚 الرجاء إدخال تكلفة خدمة التوصيل:`,
          null,
          botType
        );
        
        pendingOrders[chatId] = { orderId, step: 'delivery', botType };
      }
      
      else if (step === 'delivery' && text.match(/^\d+$/)) {
        order.deliveryFee = parseInt(text);
        order.totalPrice = (order.itemsPrice || 0) + order.deliveryFee;
        
        await sendMessage(chatId,
          `✅ <b>تم حفظ جميع البيانات</b>\n\n` +
          `📞 رقم المندوب: ${order.driverPhone}\n` +
          `💰 سعر الطلبات: ${order.itemsPrice || 0} ج\n` +
          `🚚 تكلفة التوصيل: ${order.deliveryFee} ج\n` +
          `💵 الإجمالي: ${order.totalPrice} ج\n\n` +
          `🔻 يمكنك الآن تحديث حالة الطلب:`,
          [
            [{ text: '🔧 جاري التجهيز', callback_data: `status_${orderId}_preparing` }],
            [{ text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` }],
            [{ text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }]
          ],
          botType
        );
        
        delete pendingOrders[chatId];
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => res.json({ 
  status: "✅ Zayed-ID Bot System Running",
  ordersCount: orders.length,
  bots: Object.keys(BOTS)
}));

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر Zayed-ID شغال على بورت ${PORT}`);
  console.log(`🔗 رابط السيرفر: https://zayedid-production.up.railway.app`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`🎤 مسار رفع الصوت: /upload-voice`);
  console.log(`🖼️ مسار رفع الصور: /upload-image`);
  console.log(`✅ جميع البوتات مضمنة (${Object.keys(BOTS).length} بوت)`);
});
