# 🖥️ RTL-Terminal — طرفية ويب تدعم العربية (RTL)

Terminal مبني على **xterm.js** مع طبقة RTL مخصصة، يعمل على **Windows و Linux**.

## ✨ المميزات
- ✅ دعم كامل للعربية / العبرية (RTL) داخل الطرفية
- ✅ تشكيل الحروف العربية (أشكال أول/وسط/آخر الكلمة + لام-ألف)
- ✅ خوارزمية BiDi: أرقام ولاتينية تبقى بترتيبها الصحيح داخل النص العربي
- ✅ لا يكسّر أكواد الألوان ANSI
- ✅ صندوق إدخال ذكي `dir="auto"` للكتابة المريحة بالعربية
- ✅ زر ⇄ لقلب اتجاه الصفحة، زر تشكيل الحروف
- ✅ يعمل على Windows (PowerShell / cmd) و Linux (bash)

## 🚀 التشغيل

### على Windows
1. ثبّت [Node.js](https://nodejs.org/) (زر LTS)
2. انسخ مجلد `rtl-terminal` إلى جهازك
3. دبل-كليك على **`run-windows.bat`**
4. افتح المتصفح: http://localhost:3000

للحصول على Shell حقيقي (PowerShell داخل المتصفح):
```
npm install node-pty
npm start
```
> بدون `node-pty` يعمل بوضع DEMO (صدى + أمر echo) — مفيد للتجربة.

### على Linux
```bash
cd rtl-terminal
chmod +x run-linux.sh
./run-linux.sh
# أو:
npm install
npm start
```

## 📁 البنية
```
rtl-terminal/
├── server.js            # Express + WebSocket + node-pty bridge
├── package.json
├── run-windows.bat      # تشغيل Windows (دبل كليك)
├── run-linux.sh         # تشغيل Linux
└── public/
    ├── index.html       # الواجهة (عربي RTL)
    ├── rtl-bidi.js      # محرك BiDi + تشكيل عربي (أهم ملف)
    └── app.js           # ربط xterm.js + WebSocket
```

## 🧠 كيف يدعم RTL؟ (الفكرة التقنية)
مشكلة xterm.js الأصلية: يعرض الحروف بترتيب التخزين المنطقي (LTR دائماً) ولا يطبّق Unicode Bidi ولا Arabic Shaping.

الحل في `rtl-bidi.js`:
1. كشف السطور التي تحوي حروف RTL (`\u0590–\u08FF`)
2. فصل أكواد ANSI جانباً حتى لا تُكسر الألوان
3. تقسيم السطر لمقاطع RTL / LTR وإعادة ترتيبها للعرض البصري
4. تشكيل عربي: استبدال كل حرف بشكله التقديمي الصحيح (isolated/initial/medial/final) + ligature لام-ألف
5. الإدخال يُرسل للـ shell بالترتيب المنطقي الأصلي (سليم)، والعرض فقط هو المرتب بصرياً

## 🧪 جرّب
```
echo مرحبا بالعالم 123 test
echo hello مرحبا world
```

## 📄 الرخصة
MIT — حر للاستخدام والتعديل.
