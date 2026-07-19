# 📚 مؤسسة دار ابن الجراح للنشر والتوزيع
> منصة رقمية متكاملة لعرض وتصفح الكتب الشرعية وتيسير العلم النافع لطالبيه.

---

## 📸 لقطات من الموقع (Screenshots)

### 1️⃣ الصفحة الرئيسية (الوضع الداكن)
![الصفحة الرئيسية](/public/images/screenshots/home-dark.png)

### 2️⃣ تصفح الكتب (عرض الشبكة / بطاقات)
![تصفح الكتب كروت](/public/images/screenshots/books-cards.png)

### 3️⃣ تصفح الكتب (عرض الجدول السلس)
![تصفح الكتب جدول](/public/images/screenshots/books-table.png)

---

## ✨ المميزات الرئيسية (Core Features)

### 🌐 الموقع العام (Public Site)
* **تصفح مرن بثنائية العرض (Dual View Mode):** إمكانية التبديل الفوري بين عرض **البطاقات (Grid Cards)** وعرض **الجدول (Responsive Table)**، مع حفظ تفضيل المستخدم ومزامنته بالرابط (`URL Search Params`) لضمان عدم وجود وميض أو تأخير عند التحديث.
* **نظام فلترة وبحث متقدم (Advanced Search & Filters):**
  * بحث ذكي يدعم **تسوية الحروف العربية (Arabic Normalization)** كالألف والتاء المربوطة لتسهيل العثور على الكتب.
  * فلاتر جانبية منبثقة لتصفية الكتب حسب: التصنيف، المؤلف، الناشر، حالة التوفر، والكتب المميزة فقط.
* **تأثيرات حركية فائقة النعومة (Micro-interactions & Scroll Reveal):**
  * استخدام تقنية `Intersection Observer` لتحميل العناصر تدريجياً عند التمرير (Scroll-reveal).
  * تأثيرات حركية بطيئة وناعمة (`ease-out`) للـ Hover والتقريب على الصور والبطاقات مدعومة بمعالج الرسوميات (GPU-accelerated).
* **التفاصيل السريعة (Quick View Modal):** نافذة منبثقة تفاعلية تعرض تفاصيل الكتاب كاملة (الوصف، السعر بالجنيه المصري والدينار الليبي، حالة التوفر، إلخ).
* **دعم الوضع الداكن والفاتح (Light/Dark Mode):** تبديل سلس بدون وميض أو تأخير بفضل الفصل الذكي للألوان والتحويل الفوري.
* **التواصل الفوري:** أزرار ومجموعات تفاعلية للواتساب والفيسبوك لمجموعات الرجال والنساء مقسمة باحترافية.

### 🛡️ لوحة التحكم للإدارة (Admin Panel)
* **إدارة تصنيفات الكتب:** إضافة وتعديل وحذف التصنيفات مع تخصيص الأيقونات والترتيب.
* **إدارة الكتب:** إضافة وتعديل وحذف تفاصيل الكتب، رفع الأغلفة والتحكم في الأسعار وحالة التوفر.
* **مستورد البيانات الذكي (Books Importer):** إمكانية رفع وتحديث آلاف الكتب دفعة واحدة من ملفات **Excel / CSV** مع واجهة تفاعلية لمطابقة الأعمدة (Field Mapping).
* **إدارة إعدادات الموقع العامة:** التحكم في العنوان، الشعار (Logo)، معلومات التواصل، روابط شبكات التواصل الاجتماعي، والرسالة الترويجية للدار.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

* **الإطار الأساسي:** [Next.js 15 (App Router)](https://nextjs.org/) مع دعم كامل لـ React 19.
* **التنسيق والتصميم:** [Tailwind CSS v4](https://tailwindcss.com/) لتصميم عصري وسريع التجاوب.
* **قاعدة البيانات:** [MongoDB](https://www.mongodb.com/) مع استخدام [Mongoose](https://mongoosejs.com/) لإدارة النماذج.
* **الأيقونات:** `react-icons` للوصول لأفضل مكتبات الأيقونات العالمية (FontAwesome, Heroicons).
* **التحريك:** حركات مخصصة بالـ CSS مدمجة مع `Intersection Observer` للأداء الأقصى.

---

## 🚀 البدء في التشغيل المحلي (Getting Started)

### 1. إعداد المتغيرات البيئية (Environment Variables)
قم بإنشاء ملف `.env.local` في الجذر وأضف المتغيرات التالية:
```env
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
JWT_SECRET=your_jwt_secret_for_admin_auth
```

### 2. تثبيت الحزم (Install Dependencies)
```bash
npm install
```

### 3. تشغيل خادم التطوير (Run Local Dev Server)
```bash
npm run dev
```
افتح الرابط [http://localhost:3000](http://localhost:3000) لمشاهدة الموقع العام.  
ولوحة التحكم تكون متاحة تحت الرابط `/admin`.

---

## 📦 النشر (Deployment)
الموقع مهيأ تماماً للنشر على منصة [Vercel](https://vercel.com/) بضغطة زر واحدة، مع ربط قاعدة بيانات MongoDB Atlas والـ Cloudinary لرفع الصور.
