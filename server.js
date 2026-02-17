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
    itemsPrice: null,
    deliveryPrice: null,
    totalPrice: null,
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
    const messageText = callback.message.text;
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

    // ===== قبول الطلب =====
    if (action === 'accept') {
      if (!order.acceptedBy) {
        order.acceptedBy = {
          id: driverId,
          name: driverName,
          username: driverUsername,
        };
        order.status = 'جديد';
        
        let newText = messageText;
        newText = newText.replace(
          /🔻 <b>الحالة:<\/b> في انتظار مندوب/, 
          `🔻 <b>الحالة:</b> جديد`
        );
        
        newText += `\n\n✅ تم قبول الطلب بواسطة ${driverName}`;
        
        const keyboard = [
          [
            { text: '📞 إدخال رقم الموبايل', callback_data: `phone_${orderId}` }
          ]
        ];
        
        await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, keyboard);
        
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: '✅ تم قبول الطلب! أدخل رقم موبايلك الآن',
            show_alert: false
          })
        });
        
      } else {
        let msg = order.acceptedBy.id === driverId 
          ? '✅ أنت قبلت هذا الطلب بالفعل'
          : `❌ هذا الطلب تم قبوله بواسطة ${order.acceptedBy.name}`;
        
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: msg,
            show_alert: true
          })
        });
      }
    }
    
    // ===== إدخال رقم المندوب =====
    else if (action === 'phone') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '📝 اكتب رقم موبايلك في المحادثة',
          show_alert: true
        })
      });
      
      await sendToTelegram(chatId, 
        `📱 مرحباً ${driverName}\n` +
        `الرجاء كتابة رقم موبايلك للتواصل مع العميل على الطلب ${orderId}\n` +
        `(مثال: 01234567890)`
      );
      
      pendingOrders[chatId] = { 
        orderId, 
        step: 'waiting_phone',
        messageId: messageId,
        currentText: messageText,
        driverId: driverId
      };
    }
    
    // ===== إدخال سعر الطلبات =====
    else if (action === 'items_price') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '💰 اكتب سعر الطلبات',
          show_alert: true
        })
      });
      
      await sendToTelegram(chatId, 
        `💰 <b>إدخال سعر الطلبات للطلب ${orderId}</b>\n\n` +
        `الرجاء كتابة سعر المنتجات فقط (مثال: 300)`
      );
      
      pendingOrders[chatId] = { 
        orderId, 
        step: 'waiting_items_price',
        messageId: messageId,
        currentText: messageText,
        driverId: driverId
      };
    }
    
    // ===== إدخال خدمة التوصيل =====
    else if (action === 'delivery_price') {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callback.id,
          text: '🚚 اكتب سعر التوصيل',
          show_alert: true
        })
      });
      
      await sendToTelegram(chatId, 
        `🚚 <b>إدخال سعر التوصيل للطلب ${orderId}</b>\n\n` +
        `الرجاء كتابة سعر خدمة التوصيل (مثال: 20)`
      );
      
      pendingOrders[chatId] = { 
        orderId, 
        step: 'waiting_delivery_price',
        messageId: messageId,
        currentText: messageText,
        driverId: driverId
      };
    }
    
    // ===== تغيير الحالة =====
    else if (action === 'status') {
      if (!order.acceptedBy || order.acceptedBy.id !== driverId) {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: callback.id,
            text: '❌ أنت لست المندوب المسؤول',
            show_alert: true
          })
        });
        return res.sendStatus(200);
      }

      const newStatus = param;
      order.status = newStatus;
      
      let newKeyboard = [];
      let newText = messageText;
      
      if (newStatus === 'جاري التوصيل') {
        newKeyboard = [
          [{ text: '🟢 تم التوصيل', callback_data: `status_${orderId}_تم التوصيل` }],
          [
            { text: '📞 اتصال', callback_data: `call_${orderId}` },
            { text: '📍 العنوان', callback_data: `address_${orderId}` }
          ]
        ];
      }
      else if (newStatus === 'تم التوصيل') {
        newKeyboard = [
          [
            { text: '📞 اتصال', callback_data: `call_${orderId}` },
            { text: '📍 العنوان', callback_data: `address_${orderId}` }
          ]
        ];
      }
      
      newText = newText.replace(/🔻 <b>الحالة:<\/b> [^\n]+/, `🔻 <b>الحالة:</b> ${newStatus}`);
      
      await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, newKeyboard);
      
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
    
    // ===== عرض رقم العميل =====
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
    
    // ===== عرض العنوان =====
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
  
  // ===== معالجة الرسائل النصية =====
  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const isAdmin = ADMIN_IDS.includes(chatId);
    
    // لو المندوب في انتظار إدخال رقمه
    if (pendingOrders[chatId] && pendingOrders[chatId].step === 'waiting_phone') {
      const { orderId, messageId, currentText, driverId } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.acceptedBy && order.acceptedBy.id === update.message.from.id) {
        order.driverPhone = text;
        
        let newText = currentText;
        newText = newText.includes('📱 رقم المندوب') 
          ? newText.replace(/📱 رقم المندوب: [^\n]+/, `📱 رقم المندوب: ${text}`)
          : newText + `\n📱 رقم المندوب: ${text}`;
        
        // بعد الرقم، نطلب سعر الطلبات
        const keyboard = [
          [
            { text: '💰 سعر الطلبات', callback_data: `items_price_${orderId}` }
          ]
        ];
        
        await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, keyboard);
        
        await sendToTelegram(chatId, '✅ تم حفظ الرقم! الآن أدخل سعر الطلبات');
        
        // نضيف البيانات الجديدة لـ pendingOrders للمرحلة الجاية
        pendingOrders[chatId] = { 
          orderId, 
          step: 'waiting_items_price',
          messageId: messageId,
          currentText: newText,
          driverId: driverId
        };
      }
    }
    
    // لو المندوب في انتظار إدخال سعر الطلبات
    else if (pendingOrders[chatId] && pendingOrders[chatId].step === 'waiting_items_price') {
      const { orderId, messageId, currentText, driverId } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.acceptedBy && order.acceptedBy.id === update.message.from.id) {
        const price = parseInt(text);
        if (!isNaN(price)) {
          order.itemsPrice = price;
          
          let newText = currentText;
          newText += `\n💰 سعر الطلبات: ${price} ج`;
          
          // بعد سعر الطلبات، نطلب سعر التوصيل
          const keyboard = [
            [
              { text: '🚚 خدمة التوصيل', callback_data: `delivery_price_${orderId}` }
            ]
          ];
          
          await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, keyboard);
          
          await sendToTelegram(chatId, '✅ تم حفظ سعر الطلبات! الآن أدخل سعر التوصيل');
          
          // نضيف البيانات الجديدة لـ pendingOrders للمرحلة الجاية
          pendingOrders[chatId] = { 
            orderId, 
            step: 'waiting_delivery_price',
            messageId: messageId,
            currentText: newText,
            driverId: driverId
          };
        } else {
          await sendToTelegram(chatId, '❌ الرجاء إدخال رقم صحيح');
        }
      }
    }
    
    // لو المندوب في انتظار إدخال سعر التوصيل
    else if (pendingOrders[chatId] && pendingOrders[chatId].step === 'waiting_delivery_price') {
      const { orderId, messageId, currentText, driverId } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.acceptedBy && order.acceptedBy.id === update.message.from.id) {
        const price = parseInt(text);
        if (!isNaN(price)) {
          order.deliveryPrice = price;
          order.totalPrice = (order.itemsPrice || 0) + price;
          order.status = 'جاري تجهيز الطلب';
          
          let newText = currentText;
          newText += `\n🚚 خدمة التوصيل: ${price} ج`;
          newText += `\n💰 الإجمالي الكلي: ${order.totalPrice} ج`;
          
          // أزرار الحالة
          const keyboard = [
            [{ text: '🔵 جاري التوصيل', callback_data: `status_${orderId}_جاري التوصيل` }],
            [{ text: '🟢 تم التوصيل', callback_data: `status_${orderId}_تم التوصيل` }],
            [
              { text: '📞 اتصال', callback_data: `call_${orderId}` },
              { text: '📍 العنوان', callback_data: `address_${orderId}` }
            ]
          ];
          
          await editTelegramMessage(DRIVER_CHANNEL_ID, messageId, newText, keyboard);
          
          await sendToTelegram(chatId, '✅ تم حفظ كل البيانات! يمكنك متابعة الطلب');
          
          delete pendingOrders[chatId];
        } else {
          await sendToTelegram(chatId, '❌ الرجاء إدخال رقم صحيح');
        }
      }
    }
    
    // أوامر المسح والعرض للأدمن
    else if (isAdmin && text) {
      
      if (text.startsWith('/bill ')) {
        const orderId = text.replace('/bill ', '').trim();
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
          await sendToTelegram(chatId,
            `🧾 <b>فاتورة الطلب ${orderId}</b>\n\n` +
            `📞 العميل: ${order.phone}\n` +
            `📍 العنوان: ${order.address}\n` +
            `🛒 المنتجات: ${Array.isArray(order.items) ? order.items.join('، ') : order.items}\n\n` +
            `💰 سعر الطلبات: ${order.itemsPrice || 0} ج\n` +
            `🚚 خدمة التوصيل: ${order.deliveryPrice || 0} ج\n` +
            `💵 الإجمالي: ${order.totalPrice || 0} ج\n` +
            `🕐 الحالة: ${order.status}`
          );
        } else {
          await sendToTelegram(chatId, `❌ الطلب ${orderId} غير موجود`);
        }
      }
      
      else if (text === '/all_bills') {
        if (orders.length === 0) {
          await sendToTelegram(chatId, '📭 لا توجد طلبات');
        } else {
          let response = '📋 <b>جميع الفواتير:</b>\n\n';
          orders.slice(-10).reverse().forEach((order, index) => {
            response += `${index + 1}. 🆔 <code>${order.id}</code>\n`;
            response += `   📞 ${order.phone}\n`;
            response += `   💰 ${order.totalPrice || 0} ج (طلبات: ${order.itemsPrice || 0} + توصيل: ${order.deliveryPrice || 0})\n`;
            response += `   🔻 ${order.status}\n`;
            response += `   🕐 ${new Date(order.date).toLocaleString('ar-EG')}\n\n`;
          });
          await sendToTelegram(chatId, response);
        }
      }
      
      else if (text.startsWith('/delete_order ')) {
        const orderId = text.replace('/delete_order ', '').trim();
        const index = orders.findIndex(o => o.id === orderId);
        
        if (index !== -1) {
          const order = orders[index];
          if (order.messageId) {
            await editTelegramMessage(DRIVER_CHANNEL_ID, order.messageId, '❌ تم إلغاء الطلب', []);
          }
          orders.splice(index, 1);
          await sendToTelegram(chatId, `✅ تم مسح الطلب <code>${orderId}</code>`);
        } else {
          await sendToTelegram(chatId, `❌ الطلب <code>${orderId}</code> غير موجود`);
        }
      }
    }
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 بوت الطلبات شغال على بورت ${PORT}`);
});
