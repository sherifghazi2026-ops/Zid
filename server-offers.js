const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// تكوين multer لرفع الملفات
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// تخزين العروض في الذاكرة
let offers = [];

// التأكد من وجود مجلد رفع الصور
const uploadsDir = path.join(__dirname, 'offer-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// رفع صورة العرض باستخدام multer
app.post('/upload-offer-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'لا يوجد صورة' });
    }

    console.log('📥 تم استقبال صورة عرض:', req.file.originalname);

    const fileName = `offer-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    
    // حفظ الملف
    fs.writeFileSync(filePath, req.file.buffer);

    const baseUrl = process.env.RAILWAY_STATIC_URL || `https://zayedid-production.up.railway.app`;
    const fileUrl = `${baseUrl}/offer-uploads/${fileName}`;

    console.log('🔗 رابط الصورة:', fileUrl);
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// خدمة الملفات الثابتة
app.use('/offer-uploads', express.static(uploadsDir));

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    status: '✅ نظام العروض شغال',
    time: new Date().toISOString(),
    offersCount: offers.length,
    endpoints: {
      getAll: '/api/offers',
      create: '/api/offers (POST)',
      delete: '/api/offers/:id (DELETE)'
    }
  });
});

// جلب جميع العروض
app.get('/api/offers', (req, res) => {
  const sortedOffers = [...offers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, offers: sortedOffers });
});

// إنشاء عرض جديد
app.post('/api/offers', (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'العنوان والوصف مطلوبان' 
      });
    }

    const newOffer = {
      id: 'OFFER-' + Date.now(),
      title,
      description,
      imageUrl: imageUrl || null,
      createdAt: new Date().toISOString()
    };

    offers.push(newOffer);
    
    res.json({ 
      success: true, 
      message: 'تم نشر العرض بنجاح',
      offer: newOffer 
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء العرض:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// حذف عرض
app.delete('/api/offers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = offers.findIndex(o => o.id === id);
    
    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'العرض غير موجود' 
      });
    }

    // حذف الصورة المرتبطة إذا وجدت
    const offer = offers[index];
    if (offer.imageUrl) {
      const fileName = offer.imageUrl.split('/').pop();
      const filePath = path.join(uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ تم حذف الصورة:', fileName);
      }
    }

    offers.splice(index, 1);
    
    res.json({ 
      success: true, 
      message: 'تم حذف العرض بنجاح' 
    });
  } catch (error) {
    console.error('❌ خطأ في حذف العرض:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 نظام العروض شغال على بورت ${PORT}`);
  console.log(`📱 API: https://zayedid-production.up.railway.app/api/offers`);
});
