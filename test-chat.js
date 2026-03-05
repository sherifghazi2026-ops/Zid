// كود تجريبي بسيط - شوف هيظهر ولا لا
console.log("🧪 بدء الاختبار...");

// بيانات تجريبية
const dishes = [
  { id: '1', name: 'كفتة', price: 120, providerId: 'm1' }
];

const merchants = {
  m1: { name: 'مطعم الكفتة', phone: '01000000000' }
};

let pendingAdditions = [];

// دالة استخراج الكمية
function extractQuantity(text) {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

// محاكاة رسالة من المستخدم
const userMessage = "زود 3 كفتة";
console.log("📝 رسالة المستخدم:", userMessage);

// البحث عن الأطباق
console.log("🔍 البحث عن أطباق...");
dishes.forEach(dish => {
  if (userMessage.includes(dish.name)) {
    const qty = extractQuantity(userMessage);
    console.log(`✅ تم العثور على: ${dish.name} - الكمية: ${qty}`);
    
    pendingAdditions.push({
      dish,
      quantity: qty,
      merchantName: merchants[dish.providerId].name
    });
  }
});

// النتيجة
console.log("📦 pendingAdditions:", pendingAdditions);
console.log("✅ الكود شغال! pendingAdditions فيه:", pendingAdditions.length > 0 ? "بيانات" : "فارغ");
