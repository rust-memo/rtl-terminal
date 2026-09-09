# RTL-Terminal v1.1.0 — طرفية ويب تدعم العربية (RTL) + نسخة EXE

Terminal مبني على **xterm.js (offline)** مع طبقة RTL مخصصة. يعمل على **Windows و Linux**.

## تحميل نسخة Windows الجاهزة (بدون Node.js)

من صفحة [Releases](https://github.com/rust-memo/rtl-terminal/releases) حمّل:

| الملف | الوصف |
|---|---|
| `RTL-Terminal-win-x64.exe` (~40MB) | **نسخة كاملة — دبل كليك وتشتغل، لا تحتاج Node.js** |
| `rtl-terminal-v1.1.0-windows.zip` | السورس كامل (يحتاج Node.js) |

**التشغيل:** دبل-كليك على `RTL-Terminal-win-x64.exe` ← يفتح المتصفح تلقائياً على `http://localhost:3000` ← Shell حقيقي (PowerShell/cmd).

> ملاحظة: أول تشغيل قد يظهر تحذير Windows SmartScreen (ملف غير موقّع) ← اضغط `More info` ثم `Run anyway`.

## المميزات
- دعم كامل للعربية / العبرية (RTL) داخل الطرفية
- تشكيل الحروف العربية (أول/وسط/آخر الكلمة + لام-ألف)
- خوارزمية BiDi: أرقام ولاتينية تبقى بترتيبها الصحيح داخل النص العربي
- لا يكسّر أكواد الألوان ANSI
- صندوق إدخال ذكي `dir="auto"` للكتابة المريحة بالعربية
- زر ⇄ لقلب اتجاه الصفحة
- يعمل **offline بالكامل** (xterm.js مضمّن في `public/vendor/`)
- نسخة EXE تفتح المتصفح تلقائياً

## التشغيل من السورس (للمطورين)

```bash
npm install
npm start
# افتح http://localhost:3000
```

بناء EXE بنفسك:
```bash
npm install
npm run build:exe:win    # ينتج dist/RTL-Terminal-win-x64.exe (من Linux أو Windows)
```

## البنية
```
rtl-terminal/
├── server.js            # Express + WebSocket + child_process shell (exe-safe, بدون node-pty)
├── package.json         # pkg config مضمّن
├── public/
│   ├── index.html       # الواجهة (عربي RTL)
│   ├── rtl-bidi.js      # محرك BiDi + تشكيل عربي
│   ├── app.js           # ربط xterm.js + WebSocket
│   └── vendor/          # xterm.js + addon-fit + css (offline)
└── dist/                # نسخة EXE (لا تُرفع على git)
```

## كيف يدعم RTL؟
مشكلة xterm.js الأصلية: يعرض الحروف بترتيب التخزين المنطقي (LTR دائماً) ولا يطبّق Unicode Bidi ولا Arabic Shaping.
الحل في `rtl-bidi.js`:
1. كشف السطور التي تحوي حروف RTL
2. فصل أكواد ANSI جانباً حتى لا تُكسر الألوان
3. تقسيم السطر لمقاطع RTL / LTR وإعادة ترتيبها للعرض البصري
4. تشكيل عربي + ligature لام-ألف
5. الإدخال يُرسل للـ shell بالترتيب المنطقي الأصلي (سليم)

## جرّب
```
echo مرحبا بالعالم 123 test
echo hello مرحبا world
```

## الرخصة
MIT — حر للاستخدام والتعديل.
