const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// ==================== الإعدادات الأساسية ====================
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== إعدادات تليجرام ====================
const TELEGRAM_BOT_TOKEN = "8216105936:AAFAj-b0HZdUMHXHhb-PtnW-y7ZOgoyNC7A";
const TELEGRAM_CHAT_ID = "1814331589";
let bot;

try {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
  console.log('✅ تم الاتصال بتليجرام بنجاح');
} catch (error) {
  console.error('❌ فشل الاتصال بتليجرام:', error.message);
}

// ==================== إعدادات Middleware ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إنشاء مجلد الملفات الصوتية إذا لم يكن موجوداً
const voicesDir = path.join(__dirname, 'voices');
if (!fs.existsSync(voicesDir)) {
  fs.mkdirSync(voicesDir);
  console.log('📁 تم إنشاء مجلد voices');
}

// ==================== إعدادات رفع الملفات ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.ogg';
    cb(null, `voice-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'), false);
    }
  }
});

// ==================== تخزين الطلبات في الذاكرة (للاختبار) ====================
let orders = [];

// ==================== تخزين معرفات المحادثات ====================
let chatIds = {};

// ==================== دالة إرسال رسالة لتليجرام ====================
const sendToTelegram = async (message, chatId = TELEGRAM_CHAT_ID) => {
  if (!bot) {
    console.error('❌ بوت تليجرام غير متصل');
    return false;
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log(`✅ تم إرسال الرسالة إلى تليجرام (chat: ${chatId})`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال الرسالة إلى تليجرام:', error.message);
    return false;
  }
};

// ==================== رفع ملف صوتي ====================
app.post('/upload-voice', upload.single('voice'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/voices/${req.file.filename}`;
    console.log(`✅ تم رفع الملف: ${req.file.filename}`);

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ خطأ في رفع الملف:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== إنشاء طلب جديد ====================
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // التحقق من البيانات الأساسية
    if (!orderData.phone && !orderData.address) {
      return res.status(400).json({ 
        success: false, 
        error: 'بيانات الطلب غير مكتملة' 
      });
    }

    // إنشاء رقم طلب فريد
    const orderId = orderData.id || `ORD-${Math.floor(Math.random() * 1000000)}`;
    
    const newOrder = {
      id: orderId,
      ...orderData,
      createdAt: new Date().toISOString(),
      status: orderData.status || 'جديد',
      source: 'app'
    };

    // حفظ الطلب
    orders.push(newOrder);

    // إرسال إشعار إلى تليجرام
    const itemsList = newOrder.items && newOrder.items.length > 0 
      ? newOrder.items.map(i => `  • ${i.name || i}`).join('\n')
      : newOrder.text || 'غير محدد';

    const telegramMessage = `
🧾 <b>طلب جديد #${orderId}</b>

📞 ${newOrder.phone || 'غير محدد'}
📍 ${newOrder.address || 'الشيخ زايد'}

🛒 المنتجات:
${itemsList}

${newOrder.voiceUrl ? `🎤 رسالة صوتية: ${newOrder.voiceUrl}` : ''}

⏰ ${new Date().toLocaleString('ar-EG')}
    `;

    await sendToTelegram(telegramMessage);

    res.json({
      success: true,
      orderId,
      message: 'تم إنشاء الطلب بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== الحصول على جميع الطلبات ====================
app.get('/api/orders', (req, res) => {
  try {
    // ترتيب الطلبات من الأحدث إلى الأقدم
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      count: sortedOrders.length,
      orders: sortedOrders
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== الحصول على طلب محدد ====================
app.get('/api/orders/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'الطلب غير موجود' 
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلب:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== تحديث حالة الطلب ====================
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'الحالة مطلوبة' 
      });
    }

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'الطلب غير موجود' 
      });
    }

    // تحديث الحالة
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    // إرسال تحديث إلى تليجرام
    let statusIcon = '';
    let statusMessage = '';

    switch(status) {
      case 'جاري التوصيل':
        statusIcon = '🚚';
        statusMessage = 'المندوب في الطريق إليك!';
        break;
      case 'تم التوصيل':
        statusIcon = '✅';
        statusMessage = 'تم توصيل الطلب بنجاح';
        break;
      default:
        statusIcon = '🟢';
        statusMessage = 'جاري تجهيز الطلب';
    }

    const updateMessage = `
${statusIcon} <b>تحديث حالة الطلب #${orderId}</b>

الحالة: <b>${status}</b>
${statusMessage}

📞 ${orders[orderIndex].phone || 'غير محدد'}
📍 ${orders[orderIndex].address || 'الشيخ زايد'}

⏰ ${new Date().toLocaleString('ar-EG')}
    `;

    await sendToTelegram(updateMessage);

    res.json({
      success: true,
      message: 'تم تحديث الحالة بنجاح',
      order: orders[orderIndex]
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث الحالة:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== الحصول على تحديثات تليجرام ====================
app.get('/api/telegram/updates', async (req, res) => {
  try {
    if (!bot) {
      return res.status(500).json({ 
        success: false, 
        error: 'بوت تليجرام غير متصل' 
      });
    }

    const updates = await bot.getUpdates();
    
    // فلترة الرسائل التي تحتوي على طلبات
    const orderMessages = updates
      .filter(u => u.message && u.message.text && u.message.text.includes('🧾'))
      .map(u => ({
        messageId: u.message.message_id,
        date: new Date(u.message.date * 1000).toISOString(),
        text: u.message.text,
        from: u.message.from,
        chat: u.message.chat
      }));

    res.json({
      success: true,
      count: orderMessages.length,
      updates: orderMessages
    });

  } catch (error) {
    console.error('❌ خطأ في جلب تحديثات تليجرام:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== مسار خدمة الملفات الصوتية ====================
app.use('/voices', express.static(voicesDir));

// ==================== الصفحة الرئيسية ====================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zayed-ID API Server</title>
      <style>
        body { font-family: Arial; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #F59E0B; margin-top: 0; }
        .status { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .endpoint { background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-box { flex: 1; background: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #F59E0B; }
        .stat-label { color: #666; margin-top: 5px; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Zayed-ID API Server</h1>
        <p>السيرفر يعمل بنجاح ✅</p>
        
        <div class="status">
          <strong>📊 إحصائيات:</strong><br>
          عدد الطلبات: ${orders.length}<br>
          بوت تليجرام: ${bot ? '✅ متصل' : '❌ غير متصل'}<br>
          الملفات الصوتية: ${fs.readdirSync(voicesDir).length}
        </div>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">${orders.length}</div>
            <div class="stat-label">إجمالي الطلبات</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${orders.filter(o => o.status === 'جديد').length}</div>
            <div class="stat-label">طلبات جديدة</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${orders.filter(o => o.status === 'تم التوصيل').length}</div>
            <div class="stat-label">تم التوصيل</div>
          </div>
        </div>

        <h3>📌 نقاط النهاية المتاحة:</h3>
        <div class="endpoint">POST /api/orders - إنشاء طلب جديد</div>
        <div class="endpoint">GET /api/orders - جلب جميع الطلبات</div>
        <div class="endpoint">GET /api/orders/:id - جلب طلب محدد</div>
        <div class="endpoint">PUT /api/orders/:id/status - تحديث حالة الطلب</div>
        <div class="endpoint">POST /upload-voice - رفع ملف صوتي</div>
        <div class="endpoint">GET /voices/:filename - تحميل ملف صوتي</div>
        <div class="endpoint">GET /api/telegram/updates - جلب تحديثات تليجرام</div>

        <div class="footer">
          Zayed-ID Server v1.0.0 | ${new Date().toLocaleString('ar-EG')}
        </div>
      </div>
    </body>
    </html>
  `);
});

// ==================== تشغيل السيرفر ====================
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │   🚀 Zayed-ID API Server           │
  │   ─────────────────────             │
  │   📡 الرابط: http://localhost:${PORT}  │
  │   🤖 بوت تليجرام: ${bot ? '✅ متصل' : '❌ غير متصل'}   │
  │   📁 مجلد الصوت: ${voicesDir}       │
  └─────────────────────────────────────┘
  `);
});

// ==================== معالجة الأخطاء غير المتوقعة ====================
process.on('uncaughtException', (error) => {
  console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ وعد غير معالج:', error);
});
