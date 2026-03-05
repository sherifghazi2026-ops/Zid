const AZURE_DOCUMENT_KEY = 'DwFjOWx31jB369PeEpIQGXc2g7qXGD9GJRGUd2D2VhwQgSuHzjFAJQQJ99CBACHYHv6XJ3w3AAAAACOGTZ35';
const AZURE_DOCUMENT_ENDPOINT = 'https://sherifghazi-7065-resource.cognitiveservices.azure.com/';

/**
 * تحليل PDF باستخدام Azure Document Intelligence
 * @param {string} pdfUrl - رابط PDF على ImageKit
 * @returns {Promise<string>} - النص المستخرج من PDF
 */
export const extractTextFromPDF = async (pdfUrl) => {
  try {
    console.log('📄 بدء تحليل PDF باستخدام Azure...');
    
    // 1. بدء عملية التحليل
    const analyzeUrl = `${AZURE_DOCUMENT_ENDPOINT}formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31`;
    
    const startResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_KEY
      },
      body: JSON.stringify({ urlSource: pdfUrl })
    });
    
    const operationLocation = startResponse.headers.get('Operation-Location');
    
    // 2. انتظار اكتمال التحليل
    let result = null;
    let attempts = 0;
    while (attempts < 20) { // 20 محاولة كحد أقصى
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_KEY
        }
      });
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'succeeded') {
        result = statusData;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error('فشل تحليل PDF');
      }
      
      attempts++;
    }
    
    // 3. استخراج النص من النتيجة
    const menuText = extractStructuredText(result);
    return menuText;
    
  } catch (error) {
    console.error('❌ خطأ في تحليل PDF:', error);
    return null;
  }
};

/**
 * استخراج نص منظم من نتيجة Azure
 */
const extractStructuredText = (azureResult) => {
  let text = '';
  
  if (azureResult.analyzeResult && azureResult.analyzeResult.paragraphs) {
    azureResult.analyzeResult.paragraphs.forEach(p => {
      if (p.content && p.content.trim()) {
        text += p.content.trim() + '\n';
      }
    });
  }
  
  if (azureResult.analyzeResult && azureResult.analyzeResult.tables) {
    azureResult.analyzeResult.tables.forEach(table => {
      table.cells.forEach(cell => {
        if (cell.content && cell.content.trim()) {
          text += cell.content.trim() + '\n';
        }
      });
    });
  }
  
  return text;
};

/**
 * استخراج الأصناف والأسعار من النص
 */
export const parseMenuItems = (menuText) => {
  const lines = menuText.split('\n');
  const items = [];
  
  // البحث عن أنماط الأسعار
  const priceRegex = /(\d+)[\s]*ج|(\d+)[\s]*جنيه|(\d+)[\s]*EGP/i;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;
    
    // البحث عن سعر في السطر
    const priceMatch = trimmed.match(priceRegex);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1] || priceMatch[2] || priceMatch[3] || 0);
      // إزالة السعر للحصول على الاسم
      let name = trimmed.replace(priceRegex, '').trim();
      
      // تنظيف الاسم
      name = name.replace(/[^\w\s\u0621-\u064A]/g, '').trim();
      
      if (name && price > 0) {
        items.push({ name, price });
      }
    }
  });
  
  return items;
};

/**
 * تحديث المطعم بالمنيو المستخرج
 */
export const updateRestaurantMenu = async (restaurantId, menuText) => {
  try {
    const { databases, DATABASE_ID } = await import('../appwrite/config');
    const RESTAURANTS_COLLECTION_ID = 'restaurants';
    
    await databases.updateDocument(
      DATABASE_ID,
      RESTAURANTS_COLLECTION_ID,
      restaurantId,
      { 
        menuContent: menuText,
        menuProcessedAt: new Date().toISOString()
      }
    );
    
    console.log('✅ تم تحديث المنيو في Appwrite');
    return true;
  } catch (error) {
    console.error('❌ خطأ في تحديث المنيو:', error);
    return false;
  }
};
