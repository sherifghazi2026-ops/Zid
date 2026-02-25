-- هذا ليس ملف SQL، ولكنه توضيح للحقول المطلوب إنشاؤها في Appwrite Dashboard

-- Collection Name: users

-- الحقول الأساسية (تُنشأ بواسطة الأدمن)
-- $id, $createdAt, $updatedAt (تُنشأ تلقائياً)

-- 1. username (string) [Required, Index] : اسم المستخدم للدخول (فريد)
-- 2. password (string) [Required] : كلمة المرور (نص عادي حالياً، يمكن تطويرها لاحقاً)
-- 3. role (string) [Required] : "merchant", "driver"
-- 4. createdBy (string) [Required] : userId الخاص بالأدمن الذي أنشأ الحساب
-- 5. isActive (boolean) [Required] : هل الحساب مفعل أم لا (True/False)
-- 6. profileCompleted (boolean) [Required] : هل أكمل المستخدم بياناته (False في البداية)

-- الحقول التكميلية (يكملها المستخدم بعد أول دخول)
-- 7. name (string) : الاسم الكامل
-- 8. phone (string) : رقم الهاتف
-- 9. address (string) : العنوان النصي
-- 10. locationLat (double) : خط العرض
-- 11. locationLng (double) : خط الطول
-- 12. serviceArea (string) : منطقة الخدمة (للمندوبين)
-- 13. maxDeliveryRadius (double) : أقصى مسافة توصيل (للمندوبين)
-- 14. merchantType (string) : نوع النشاط التجاري (للتجار)
-- 15. isAvailable (boolean) : هل متاح حالياً (للمندوبين، افتراضي True)
-- 16. completedAt (datetime) : تاريخ إكمال الملف الشخصي

