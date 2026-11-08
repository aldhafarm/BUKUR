# البُكور — BUKUR

أدواتك في القائمة الجانبية لكروم، تبدأ بساعة البكور. التصميم: [`docs/design.md`](docs/design.md).

| المجلد | ما فيه |
|---|---|
| `app/` | تطبيق الويب: الحاضنة والودجات (يُستضاف على `https://bukur.mind8x.com/app/`) |
| `extension/` | غلاف إضافة كروم: يعرض `app/` في القائمة الجانبية |
| `index.html` | الساعة الأصلية (AL DHAFAR 3) — تبقى حتى تُعتمد الودجة الجديدة |

## التجربة محلياً
```bash
npm test          # اختبارات الحسابات والتخطيط (بلا اعتماديات)
npm run serve     # ثم افتح http://localhost:8080/app/
```

## النشر على Firebase (مرة واحدة للإعداد)
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting     # المشروع bukur8 محدد في .firebaserc
```

## تثبيت الإضافة (وضع المطوّر)
1. افتح `chrome://extensions` وفعّل **Developer mode**.
2. **Load unpacked** ← اختر مجلد `extension/`.
3. اضغط أيقونة البكور في شريط الإضافات ← تفتح القائمة الجانبية.

قبل النشر على Firebase: غيّر `APP_URL` في `extension/panel.js` إلى `http://localhost:8080/app/` وشغّل `npm run serve`.
