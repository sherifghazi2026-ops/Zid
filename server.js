const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== إعدادات بوت الطلبات ====================
const TELEGRAM_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DRIVER_CHANNEL_ID = "1814331589";
const ADMIN_IDS = [1814331589];

let orders = [];
let pendingOrders = {};

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

const sendVoiceToTelegram = async (chatId, voiceUrl) => {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        voice: voiceUrl
      })
    });
    return await response.json();
  } catch (error) {
    console.error('خطأ في إرسال الصوت:', error);
  }
};

const editTelegramMessage = async (chatId, messageId, newText, keyboard) => {
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
    
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('خطأ في تعديل الرسالة:', error);
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
    
    res.json({ success: true, url: fileUrl });
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
    status: '✅ بوت الطلبات شغال',
    time: new Date().toISOString(),
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
      status: o.status || 'جديد',
      serviceName: o.serviceName || 'سوبر ماركت',
      driverPhone: o.driverPhone || null,
      totalBill: o.totalBill || null,
      deliveryCost: o.deliveryCost || null,
      createdAt: o.date
    }))
  });
});

// ==================== استقبال الطلبات ====================
app.post('/send-order', async (req, res) => {
  console.log('📩 طلب جديد:', req.body);
  
  const { phone, address, location, items, serviceName = 'سوبر ماركت', voiceUrl } = req.body;
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
  
  const newOrder = {
    id: orderId,
    phone,
    address: address || 'غير محدد',
    location: location || null,
    items: Array.isArray(items) ? items : (items ? [items] : []),
    serviceName,
    date: new Date().toISOString(),
    status: 'في انتظار مندوب',
    driverPhone: null,
    messageId: null,
    voiceUrl: voiceUrl || null,
    acceptedBy: null,
    totalBill: null,
    deliveryCost: null
  };
  
  orders.push(newOrder);
  
  const keyboard = [
    [
      { text: '✅ قبول الطلب', callback_data: `accept_${orderId}` }
    ]
  ];
  
  const itemsList = Array.isArray(items) ? items.join('، ') : (items || 'طلب بدون تفاصيل');
  let message = 
    `🆕 <b>طلب جديد في انتظار مندوب</b>\n` +
    `──────────────────\n\n` +
    `👤 <b>معلومات العميل:</b>\n` +
    `📞 ${phone}\n` +
    `📍 ${address || 'غير محدد'}\n` +
    (location ? `📍 مشاركة الموقع متاحة\n` : '') +
    `🛒 <b>المنتجات المطلوبة:</b>\n` +
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

// ==================== ويب هوك ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const messageId = callback.message.message_id;
    const chatId = callback.message.chat.id;
    const driverName = callback.from.first_name || 'مندوب';
    const driverUsername = callback.from.username || 'غير معروف';
    const driverId = callback.from.id;
    
    console.log(`🔄 ضغط على زر: ${data} من ${driverName} (${driverId})`);
    
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
      if (!order.acceptedBy) {
        order.acceptedBy = {
          id: driverId,
          name: driverName,
          username: driverUsername,
        };
        order.status = 'جديد';
        
        let newText = callback.message.text;
        newText = newText.replace(
          /🔻 <b>الحالة:<\/b> في انتظار مندوب/, 
          `🔻 <b>الحالة:</b> جديد`
        );
        
        newText += `\n\n✅ تم قبول الطلب بواسطة ${driverName}`;
        
        const newKeyboard = [
          [
            { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
            { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
          ],
          [
            { text: '📞 اتصال بالعميل', callback_data: `call_${orderId}` },
            { text: '📍 العنوان', callback_data: `address_${orderId}` }
          ],
          [
            { text: '💰 إدخال الفاتورة', callback_data: `bill_${orderId}` }
          ]
        ];
        
        await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, newKeyboard);
        
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: '✅ تم قبول الطلب بنجاح!',
            show_alert: false
          })
        });
        
        await sendToTelegram(chatId, 
          `📱 مرحباً ${driverName}\n` +
          `لقد قبلت الطلب ${orderId}\n` +
          `الرجاء إرسال رقم موبايلك للتواصل مع العميل.`
        );
        
        pendingOrders[chatId] = { orderId, step: 'waiting_phone' };
        
      } else {
        let message = '';
        if (order.acceptedBy.id === driverId) {
          message = '✅ أنت قبلت هذا الطلب بالفعل';
        } else {
          message = `❌ هذا الطلب تم قبوله بواسطة ${order.acceptedBy.name}`;
        }
        
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: message,
            show_alert: true
          })
        });
      }
    }
    
    else if (action === 'bill') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '💰 أرسل إجمالي الفاتورة وتكلفة التوصيل',
          show_alert: true
        })
      });
      
      await sendToTelegram(chatId, 
        `💰 <b>إدخال الفاتورة للطلب ${orderId}</b>\n\n` +
        `الرجاء إرسال إجمالي الفاتورة وتكلفة التوصيل بالصيغة التالية:\n` +
        `<code>الإجمالي: 150, التوصيل: 20</code>\n\n` +
        `أو أرسل الرقمين فقط: <code>150 20</code>`
      );
      
      pendingOrders[chatId] = { orderId, step: 'waiting_bill' };
    }
    
    else if (action === 'status') {
      if (!order.acceptedBy || order.acceptedBy.id !== driverId) {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: '❌ أنت لست المندوب المسؤول عن هذا الطلب',
            show_alert: true
          })
        });
        return res.sendStatus(200);
      }

      const newStatus = param === 'delivering' ? 'جاري التوصيل' : 'تم التوصيل';
      order.status = newStatus;
      
      let newText = callback.message.text;
      newText = newText.replace(/🔻 <b>الحالة:<\/b> [^\n]+/, `🔻 <b>الحالة:</b> ${newStatus}`);
      
      const keyboard = newStatus === 'تم التوصيل' ? [] : [
        [
          { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
          { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
        ],
        [
          { text: '📞 اتصال بالعميل', callback_data: `call_${orderId}` },
          { text: '📍 العنوان', callback_data: `address_${orderId}` }
        ]
      ];
      
      await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, keyboard);
      
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: `✅ تم تغيير الحالة إلى ${newStatus}`,
          show_alert: false
        })
      });
    }
    
    else if (action === 'call') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: `📞 رقم العميل: ${order.phone}`,
          show_alert: true
        })
      });
    }
    
    else if (action === 'address') {
      const itemsList = Array.isArray(order.items) ? order.items.join('، ') : order.items;
      let text = `📍 ${order.address}\n🛒 ${itemsList}`;
      if (order.location) {
        text += `\n\n🔗 رابط الموقع: ${order.location}`;
      }
      
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: text,
          show_alert: true
        })
      });
    }
  }
  
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const isAdmin = ADMIN_IDS.includes(chatId);
    
    if (pendingOrders[chatId] && pendingOrders[chatId].step === 'waiting_phone') {
      const { orderId } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.acceptedBy && order.acceptedBy.id === update.message.from.id) {
        order.driverPhone = text;
        
        const orderMsg = orders.find(o => o.id === orderId);
        if (orderMsg && orderMsg.messageId) {
          let newText = callback?.message?.text || '';
          newText = newText.includes('📱 رقم المندوب') 
            ? newText.replace(/📱 رقم المندوب: [^\n]+/, `📱 رقم المندوب: ${text}`)
            : newText + `\n📱 رقم المندوب: ${text}`;
          
          const keyboard = [
            [
              { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
              { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
            ],
            [
              { text: '📞 اتصال بالعميل', callback_data: `call_${orderId}` },
              { text: '📍 العنوان', callback_data: `address_${orderId}` }
            ],
            [
              { text: '💰 إدخال الفاتورة', callback_data: `bill_${orderId}` }
            ]
          ];
          
          await editTelegramMessage(DRIVER_CHANNEL_ID, orderMsg.messageId, newText, keyboard);
        }
        
        await sendToTelegram(chatId, '✅ تم حفظ رقمك بنجاح!');
        
        delete pendingOrders[chatId];
      }
    }
    
    else if (pendingOrders[chatId] && pendingOrders[chatId].step === 'waiting_bill') {
      const { orderId } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.acceptedBy && order.acceptedBy.id === update.message.from.id) {
        const numbers = text.match(/\d+/g);
        
        if (numbers && numbers.length >= 2) {
          order.totalBill = parseInt(numbers[0]);
          order.deliveryCost = parseInt(numbers[1]);
          
          const orderMsg = orders.find(o => o.id === orderId);
          if (orderMsg && orderMsg.messageId) {
            let newText = callback?.message?.text || '';
            newText += `\n💰 إجمالي الفاتورة: ${order.totalBill} جنيه`;
            newText += `\n🚚 تكلفة التوصيل: ${order.deliveryCost} جنيه`;
            newText += `\n💵 الإجمالي الكلي: ${order.totalBill + order.deliveryCost} جنيه`;
            
            const keyboard = [
              [
                { text: '🚚 جاري التوصيل', callback_data: `status_${orderId}_delivering` },
                { text: '✅ تم التوصيل', callback_data: `status_${orderId}_done` }
              ],
              [
                { text: '📞 اتصال بالعميل', callback_data: `call_${orderId}` },
                { text: '📍 العنوان', callback_data: `address_${orderId}` }
              ]
            ];
            
            await editTelegramMessage(DRIVER_CHANNEL_ID, orderMsg.messageId, newText, keyboard);
          }
          
          await sendToTelegram(chatId, '✅ تم حفظ الفاتورة بنجاح!');
          
          delete pendingOrders[chatId];
        } else {
          await sendToTelegram(chatId, 
            '❌ صيغة غير صحيحة\n' +
            'الرجاء إرسال الأرقام بهذه الطريقة:\n' +
            '<code>الإجمالي: 150, التوصيل: 20</code>'
          );
        }
      }
    }
    
    else if (isAdmin && text) {
      
      if (text.startsWith('/delete_order ')) {
        const orderId = text.replace('/delete_order ', '').trim();
        const index = orders.findIndex(o => o.id === orderId);
        
        if (index !== -1) {
          const order = orders[index];
          
          if (order.messageId) {
            const newText = callback?.message?.text || '';
            const cancelledText = newText + '\n\n❌ <b>تم إلغاء الطلب</b>';
            await editTelegramMessage(DRIVER_CHANNEL_ID, order.messageId, cancelledText, []);
          }
          
          orders.splice(index, 1);
          await sendToTelegram(chatId, `✅ تم مسح الطلب <code>${orderId}</code>`);
        } else {
          await sendToTelegram(chatId, `❌ الطلب <code>${orderId}</code> غير موجود`);
        }
      }
      
      else if (text === '/clear_pending') {
        const pendingOrdersList = orders.filter(o => o.status === 'في انتظار مندوب' || o.status === 'جديد');
        
        for (const order of pendingOrdersList) {
          if (order.messageId) {
            const newText = callback?.message?.text || '';
            const cancelledText = newText + '\n\n❌ <b>تم إلغاء الطلب (انتهاء الوقت)</b>';
            await editTelegramMessage(DRIVER_CHANNEL_ID, order.messageId, cancelledText, []);
          }
        }
        
        orders = orders.filter(o => o.status !== 'في انتظار مندوب' && o.status !== 'جديد');
        await sendToTelegram(chatId, `✅ تم مسح ${pendingOrdersList.length} طلب معلق`);
      }
    }
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 بوت الطلبات شغال على بورت ${PORT}`);
});
