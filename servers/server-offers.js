const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== إعدادات بوت العروض ====================
const OFFERS_BOT_TOKEN = "8367864849:AAEgn5GdgBZZgVH0RP3h_QfqLEOdEkRGLS4";
const OFFERS_API = `https://api.telegram.org/bot${OFFERS_BOT_TOKEN}`;
const ADMIN_IDS = [1814331589]; // اليوزر اللي مسموح له ينشر عروض

let offers = [];

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
    
    const response = await fetch(`${OFFERS_API}/sendMessage`, {
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
    const response = await fetch(`${OFFERS_API}/sendPhoto`, {
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
app.post('/upload-offer-photo', async (req, res) => {
  try {
    const { photo } = req.body;
    
    if (!photo) {
      return res.status(400).json({ success: false, error: 'لا يوجد صورة' });
    }

    console.log('📥 تم استقبال صورة عرض');

    const photoBuffer = Buffer.from(photo, 'base64');
    
    const uploadsDir = path.join(__dirname, 'offer-uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    const fileName = `offer-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, photoBuffer);
    
    const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-offers.up.railway.app`;
    const fileUrl = `${baseUrl}/offer-uploads/${fileName}`;
    
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
app.use('/offer-uploads', express.static(path.join(__dirname, 'offer-uploads')));

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ بوت العروض شغال',
    time: new Date().toISOString(),
    offersCount: offers.length
  });
});

// ==================== جلب العروض للتطبيق ====================
app.get('/api/offers', (req, res) => {
  const sortedOffers = [...offers].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  res.json({ 
    success: true, 
    offers: sortedOffers
  });
});

// ==================== ويب هوك لاستقبال العروض من تليجرام ====================
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const isAdmin = ADMIN_IDS.includes(chatId);
    
    // مش أدمن → يسكت
    if (!isAdmin) {
      return res.sendStatus(200);
    }
    
    // نص عادي = عرض نصي
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
        `📝 النص: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
      );
    }
    
    // أوامر التحكم
    else if (text) {
      
      // عرض كل العروض
      if (text === '/offers') {
        if (offers.length === 0) {
          await sendToTelegram(chatId, '📭 لا توجد عروض حالياً');
        } else {
          let response = '📋 <b>العروض الحالية:</b>\n\n';
          offers.slice(-10).reverse().forEach((offer, index) => {
            response += `${index + 1}. 🆔 <code>${offer.id}</code>\n`;
            if (offer.type === 'text') {
              response += `   📝 ${offer.text.substring(0, 50)}${offer.text.length > 50 ? '...' : ''}\n`;
            } else {
              response += `   🖼️ عرض مصور\n`;
              if (offer.text) {
                response += `   📝 ${offer.text.substring(0, 50)}${offer.text.length > 50 ? '...' : ''}\n`;
              }
            }
            response += `   🕐 ${new Date(offer.createdAt).toLocaleString('ar-EG')}\n\n`;
          });
          await sendToTelegram(chatId, response);
        }
      }
      
      // مسح عرض
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
      
      // مسح كل العروض
      else if (text === '/clear_all') {
        offers = [];
        await sendToTelegram(chatId, '✅ تم مسح جميع العروض');
      }
      
      // المساعدة
      else if (text === '/help') {
        await sendToTelegram(chatId,
          `📚 <b>أوامر بوت العروض:</b>\n\n` +
          `• أي نص عادي → نشر عرض نصي\n` +
          `• إرسال صورة → نشر عرض مصور\n` +
          `• /offers → عرض كل العروض\n` +
          `• /delete_offer ID → مسح عرض معين\n` +
          `• /clear_all → مسح كل العروض\n` +
          `• /stats → إحصائيات\n` +
          `• /help → هذه الرسالة`
        );
      }
      
      // إحصائيات
      else if (text === '/stats') {
        const textCount = offers.filter(o => o.type === 'text').length;
        const imageCount = offers.filter(o => o.type === 'image').length;
        
        await sendToTelegram(chatId,
          `📊 <b>إحصائيات العروض:</b>\n\n` +
          `📦 إجمالي العروض: ${offers.length}\n` +
          `📝 عروض نصية: ${textCount}\n` +
          `🖼️ عروض مصورة: ${imageCount}\n` +
          `🕐 آخر تحديث: ${new Date().toLocaleString('ar-EG')}`
        );
      }
    }
    
    // معالجة الصور
    if (update.message.photo) {
      const photo = update.message.photo.pop();
      const fileId = photo.file_id;
      const caption = update.message.caption || '';
      
      const fileResponse = await fetch(`${OFFERS_API}/getFile?file_id=${fileId}`);
      const fileData = await fileResponse.json();
      
      if (fileData.ok) {
        const filePath = fileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${OFFERS_BOT_TOKEN}/${filePath}`;
        
        const imageResponse = await fetch(fileUrl);
        const imageBuffer = await imageResponse.buffer();
        
        const uploadsDir = path.join(__dirname, 'offer-uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }
        
        const fileName = `offer-${Date.now()}.jpg`;
        const localPath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localPath, imageBuffer);
        
        const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-offers.up.railway.app`;
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
          (caption ? `📝 التعليق: ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}` : '')
        );
      }
    }
  }
  
  res.sendStatus(200);
});

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3001; // بورت مختلف
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 بوت العروض شغال على بورت ${PORT}`);
  console.log(`📱 الرابط: https://zayedid-offers.up.railway.app`);
  console.log(`   - أرسل نص → عرض نصي`);
  console.log(`   - أرسل صورة → عرض مصور`);
  console.log(`   - /offers → عرض كل العروض`);
  console.log(`   - /delete_offer ID → مسح عرض`);
  console.log(`   - /clear_all → مسح كل العروض`);
});

// ==================== مسار اختبار بسيط ====================
app.get('/test-offers', (req, res) => {
  res.json({ 
    success: true, 
    message: 'سيرفر العروض شغال!',
    time: new Date().toISOString()
  });
});

// Force redeploy for offers server
