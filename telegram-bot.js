const express = require('express');
const cors = require('cors'); 
const app = express();

app.use(cors());
app.use(express.json());

// هذا السطر يمنع ظهور علامة < نهائياً لأنه يجبر الرد على أن يكون JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

let orders = [];

app.get('/active-orders', (req, res) => {
  try {
    res.status(200).json({ success: true, orders: orders });
  } catch (err) {
    res.status(200).json({ success: false, orders: [], error: "خطأ داخلي" });
  }
});

app.get('/', (req, res) => res.json({ status: "working" }));

// معالج الأخطاء لضمان عدم إرسال HTML
app.use((err, req, res, next) => {
  res.status(200).json({ success: false, error: "حدث خطأ في السيرفر" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server is Online on port ${PORT}`));
