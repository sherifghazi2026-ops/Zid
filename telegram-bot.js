const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==================== البوتات (11 بوت) ====================
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

const DRIVER_CHANNEL_ID = "1814331589";
let orders = [];
let pendingOrders = {};

// دالة مساعدة لإرسال الرسائل باستخدام توكن البوت المناسب
const apiCall = async (method, payload, botType) => {
  try {
    const bot = BOTS[botType] || BOTS.supermarket;
    await fetch(`${bot.api}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error(`API Error (${method}):`, e); }
};

// ==================== المعالجة الرئيسية (الويب هوك الديناميكي) ====================
app.post('/webhook/:botType', async (req, res) => {
  const { botType } = req.params;
  const update = req.body;
  res.sendStatus(200);

  if (update.callback_query) {
    const { data, message, id } = update.callback_query;
    const chatId = message.chat.id;

    await apiCall('answerCallbackQuery', { callback_query_id: id }, botType);

    if (data.startsWith('accept_')) {
      const orderId = data.replace('accept_', '');
      const order = orders.find(o => o.id === orderId);

      if (order && !order.accepted) {
        order.accepted = true;
        order.acceptedBy = chatId;

        // إخفاء زر القبول وتحديث الجروب
        await apiCall('editMessageText', { chat_id: message.chat.id, message_id: message.message_id, text: message.text + "\n\n✅ تم قبول الطلب من قبل مندوب." }, botType);
        
        // بدأ المحادثة مع المندوب في الخاص
        await apiCall('sendMessage', { chat_id: chatId, text: `✅ أنت الآن مسؤول عن طلب #${orderId}\nالرجاء إرسال رقم تليفونك:` }, botType);
        pendingOrders[chatId] = { orderId, step: 'phone', botType };
      }
    }

    if (data.startsWith('status_')) {
        const [_, orderId, statusKey] = data.split('_');
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const statusMap = { 'preparing': '🔧 جاري التجهيز', 'delivering': '🚚 في الطريق', 'done': '✅ تم التوصيل' };
            order.status = statusMap[statusKey] || order.status;
            await apiCall('sendMessage', { chat_id: chatId, text: `تم تحديث حالة الطلب #${orderId} إلى: ${order.status}` }, botType);
        }
    }
  }

  else if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (pendingOrders[chatId]) {
      const { orderId, step } = pendingOrders[chatId];
      const order = orders.find(o => o.id === orderId);

      if (step === 'phone' && text.match(/^01[0-9]{9}$/)) {
        order.driverPhone = text;
        
        // --- هنا المنطق الذي طلبته: المكوجي يتخطى السعر ---
        if (order.serviceName === 'مكوجي') {
          await apiCall('sendMessage', { chat_id: chatId, text: `✅ تم حفظ الرقم.\n🚚 الرجاء إدخال تكلفة التوصيل فقط:` }, botType);
          pendingOrders[chatId].step = 'delivery';
        } else {
          await apiCall('sendMessage', { chat_id: chatId, text: `✅ تم حفظ الرقم.\n💰 الرجاء إدخال سعر الطلبات:` }, botType);
          pendingOrders[chatId].step = 'price';
        }
      } 
      else if (step === 'price') {
        order.itemsPrice = parseInt(text);
        await apiCall('sendMessage', { chat_id: chatId, text: `🚚 الرجاء إدخال تكلفة التوصيل:` }, botType);
        pendingOrders[chatId].step = 'delivery';
      }
      else if (step === 'delivery') {
        order.deliveryFee = parseInt(text);
        order.totalPrice = (order.itemsPrice || 0) + order.deliveryFee;
        
        await apiCall('sendMessage', { 
            chat_id: chatId, 
            text: `🧾 فاتورة طلب #${orderId}\n---\n💰 السعر: ${order.itemsPrice}ج\n🚚 التوصيل: ${order.deliveryFee}ج\n💵 الإجمالي: ${order.totalPrice}ج\n\nاستخدم الأزرار لتحديث الحالة.`,
            reply_markup: { inline_keyboard: [[{text: '✅ تم التوصيل', callback_data: `status_${orderId}_done`}]] }
        }, botType);
        delete pendingOrders[chatId];
      }
    }
  }
});

// استقبال الطلب من التطبيق
app.post('/send-order', async (req, res) => {
    // ... (هنا نضع نفس منطق استقبال الطلب الأصلي لديك مع التأكد من إرسال imageUrl و voiceUrl) ...
    // ملاحظة: تأكد من إرسال الطلب إلى مسار الـ Webhook الصحيح لكل بوت
    res.json({ success: true, message: "Order Received" });
});

app.listen(process.env.PORT || 3000, () => console.log("Server Running..."));

