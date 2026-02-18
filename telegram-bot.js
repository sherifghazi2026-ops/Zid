const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// إجبار الرد على أن يكون JSON دائماً
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ==================== إعدادات البوتات (كل خدمة لها توكنها) ====================
const BOTS = {
  // الأنظمة الحالية
  main: { token: "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A", api: "https://api.telegram.org/bot8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A" },
  ironing: { token: "8216174777:AAERldfUvyWcDsXWPHLrnvz4bmmkcQiTzus", api: "https://api.telegram.org/bot8216174777:AAERldfUvyWcDsXWPHLrnvz4bmmkcQiTzus" },
  offers: { token: "8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4", api: "https://api.telegram.org/bot8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4" },
  
  // الخدمات الجديدة
  pharmacy: { token: "8557544201:AAEJLfUMQ1jdbQewFURGuKbQCKEiS5TgYfY", api: "https://api.telegram.org/bot8557544201:AAEJLfUMQ1jdbQewFURGuKbQCKEiS5TgYfY" },
  winch: { token: "8543383060:AAFuFvm31hgVKe_DdifO_zQ1BilhYiyrf2s", api: "https://api.telegram.org/bot8543383060:AAFuFvm31hgVKe_DdifO_zQ1BilhYiyrf2s" },
  electrician: { token: "8037007700:AAF-f9jKDPBrL6FiAaZRWsKRjoGu9eRMBj4", api: "https://api.telegram.org/bot8037007700:AAF-f9jKDPBrL6FiAaZRWsKRjoGu9eRMBj4" },
  moving: { token: "8588996744:AAHz1dJwLd4zmTD47zKdH25qUyz05Gerdtc", api: "https://api.telegram.org/bot8588996744:AAHz1dJwLd4zmTD47zKdH25qUyz05Gerdtc" },
  marble: { token: "8318895116:AAFWrsOhjpyRSjF1ivr4SPe_N_cOs6fwFlE", api: "https://api.telegram.org/bot8318895116:AAFWrsOhjpyRSjF1ivr4SPe_N_cOs6fwFlE" },
  plumbing: { token: "8514986529:AAF50RKZgQjXymrv4Y6Sd9Uw-UVBC3bCK4Y", api: "https://api.telegram.org/bot8514986529:AAF50RKZgQjXymrv4Y6Sd9Uw-UVBC3bCK4Y" },
  carpentry: { token: "8328607450:AAFR_fCtlFq4nPEdx5az27fsdpTg0rFi1Bs", api: "https://api.telegram.org/bot8328607450:AAFR_fCtlFq4nPEdx5az27fsdpTg0rFi1Bs" },
  kitchen: { token: "8036001015:AAFLp3P1pzHgtiUyPQqNyheKLRqF2VrQxdU", api: "https://api.telegram.org/bot8036001015:AAFLp3P1pzHgtiUyPQqNyheKLRqF2VrQxdU" }
};

const DRIVER_CHANNEL_ID = "1814331589";
let orders = [];

// ==================== دوال المساعدة ====================
const sendMessage = async (chatId, text, keyboard = null, botType = 'main') => {
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

const sendVoice = async (chatId, voiceUrl, botType = 'main') => {
  try {
    await fetch(`${BOTS[botType].api}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, voice: voiceUrl })
    });
  } catch (e) { console.error("Voice Error:", e); }
};

const sendPhoto = async (chatId, photoUrl, caption = '', botType = 'main') => {
  try {
    await fetch(`${BOTS[botType].api}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: caption, parse_mode: 'HTML' })
    });
  } catch (e) { console.error("Photo Error:", e); }
};

const editMessage = async (chatId, messageId, text, keyboard = null, botType = 'main') => {
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

// ==================== المسارات ====================
app.get('/active-orders', (req, res) => {
  try {
    const active = orders.filter(o => o.status !== '✅ تم التنفيذ بنجاح');
    res.json({ success: true, orders: active });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/order-status/:orderId', (req, res) => {
  try {
    const order = orders.find(o => o.id === req.params.orderId);
    if (order) {
      res.json({ success: true, status: order.status, phone: order.phone, address: order.address });
    } else {
      res.json({ success: false, status: 'غير موجود' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// رفع الصور
app.post('/upload-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: 'لا يوجد صورة' });

    const imageBuffer = Buffer.from(image, 'base64');
    const fileName = `image-${Date.now()}.jpg`;
    const filePath = `/tmp/${fileName}`;
    require('fs').writeFileSync(filePath, imageBuffer);
    const fileUrl = `https://zayedid-production.up.railway.app/uploads/${fileName}`;

    res.json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// رفع الصوت
app.post('/upload-voice', async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ success: false, error: 'لا يوجد ملف صوتي' });

    const audioBuffer = Buffer.from(audio, 'base64');
    const fileName = `voice-${Date.now()}.ogg`;
    const filePath = `/tmp/${fileName}`;
    require('fs').writeFileSync(filePath, audioBuffer);
    const fileUrl = `https://zayedid-production.up.railway.app/uploads/${fileName}`;

    res.json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// خدمة الملفات
app.use('/uploads', require('express').static('/tmp'));

app.post('/send-order', async (req, res) => {
  const { phone, address, items, rawText, voiceUrl, imageUrl, serviceName = 'سوبر ماركت', isServiceRequest } = req.body;
  
  // تحديد البوت حسب الخدمة
  const botMap = {
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
  const botType = botMap[serviceName] || 'main';
  
  const orderId = (serviceName === 'مكوجي' ? 'IRN-' : 'ORD-') + Math.floor(100000 + Math.random() * 900000);

  const initialStatus = isServiceRequest ? '📦 تم استلام طلبك (سيتم التواصل خلال 24 ساعة)' : '📦 تم استلام طلبك';

  const newOrder = {
    id: orderId,
    phone,
    address,
    items: Array.isArray(items) ? items.join('، ') : items,
    status: initialStatus,
    serviceName,
    botType
  };
  orders.push(newOrder);

  let message = 
    `🧾 <b>فاتورة طلب جديد - ${serviceName}</b>\n` +
    `──────────────────\n` +
    `👤 <b>العميل:</b> <code>${phone}</code>\n` +
    `📍 <b>العنوان:</b> ${address}\n` +
    `──────────────────\n` +
    `📝 <b>التفاصيل:</b>\n${Array.isArray(items) ? items.join('\n') : items}\n` +
    `──────────────────\n` +
    `🔻 <b>الحالة:</b> ${initialStatus}\n` +
    `🆔 رقم الطلب: <code>${orderId}</code>`;

  // أزرار التتبع (للخدمات غير الخدمية)
  let keyboard = null;
  if (!isServiceRequest) {
    keyboard = [
      [{ text: `📞 اتصل بالعميل`, url: `tel:${phone}` }],
      [
        { text: '🔧 الفني في الطريق', callback_data: `track_${orderId}_tech` },
        { text: '✅ تم التنفيذ', callback_data: `track_${orderId}_done` }
      ]
    ];
  }

  await sendMessage(DRIVER_CHANNEL_ID, message, keyboard, botType);
  
  if (imageUrl) {
    setTimeout(async () => {
      await sendPhoto(DRIVER_CHANNEL_ID, imageUrl, '🖼️ صورة الروشتة', botType);
    }, 2000);
  }
  
  if (voiceUrl) {
    setTimeout(async () => {
      await sendVoice(DRIVER_CHANNEL_ID, voiceUrl, botType);
    }, 3000);
  }

  res.json({ success: true, orderId });
});

app.post('/webhook', async (req, res) => {
  const update = req.body;
  if (update.callback_query) {
    const { data, message, id } = update.callback_query;
    
    await fetch(`${BOTS.main.api}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id })
    });

    if (data.startsWith('track_')) {
      const [_, orderId, statusKey] = data.split('_');
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const statusText = statusKey === 'tech' ? '🔧 الفني في الطريق' : '✅ تم التنفيذ بنجاح';
        order.status = statusText;
        
        const updatedText = message.text.split('🔻')[0] + `🔻 <b>الحالة:</b> ${statusText}`;
        
        let newKeyboard = null;
        if (statusKey === 'tech') {
          newKeyboard = [[
            { text: '✅ تم التنفيذ', callback_data: `track_${orderId}_done` }
          ]];
        }
        
        await editMessage(message.chat.id, message.message_id, updatedText, newKeyboard, order.botType);
        
        await sendMessage(DRIVER_CHANNEL_ID, 
          `🔔 تحديث: الطلب <code>${orderId}</code> أصبح: ${statusText}`,
          null,
          order.botType
        );
      }
    }
  }
  res.sendStatus(200);
});

// معالج الأخطاء
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'حدث خطأ في السيرفر' });
});

app.get('/', (req, res) => res.json({ 
  status: "✅ Zayed-ID Bot System Running",
  ordersCount: orders.length,
  bots: Object.keys(BOTS)
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سيرفر Zayed-ID شغال على بورت ${PORT}`);
  console.log(`🔗 رابط السيرفر: https://zayedid-production.up.railway.app`);
  console.log(`📢 قناة المندوبين: ${DRIVER_CHANNEL_ID}`);
  console.log(`✅ الأنظمة الحالية: سوبر ماركت, مطاعم, مكوجي`);
  console.log(`✅ الخدمات الجديدة: صيدليات, ونش, كهربائي, نقل اثاث, رخام, سباكة, نجارة, مطابخ`);
});
