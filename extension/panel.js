// رابط تطبيق الويب. للتجربة المحلية قبل النشر: غيّره إلى http://localhost:8080/app/ (بعد npm run serve).
const APP_URL = 'https://bukur.mind8x.com/app/';

const frame = document.getElementById('app');
const offline = document.getElementById('offline');
const reason = document.getElementById('reason');

function showProblem(text) {
  frame.hidden = true;
  frame.removeAttribute('src');
  reason.textContent = text;
  offline.hidden = false;
}

// لا يمكن قراءة خطأ إطار من نطاق آخر، فنفحص الوصول أولاً: طلب no-cors يفشل عند انقطاع الشبكة
// أو فشل DNS أو شهادة SSL غير صالحة — فنعرض رسالة مفهومة بدل أيقونة صفحة مكسورة.
async function load() {
  offline.hidden = true;
  if (!navigator.onLine) return showProblem('لا يوجد اتصال بالإنترنت.');
  try {
    await fetch(APP_URL, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    return showProblem('الموقع غير متاح بعد — ربما لم يُنشر، أو شهادة الأمان لم تصدر بعد.');
  }
  frame.hidden = false;
  frame.src = APP_URL;
}

document.getElementById('retry').addEventListener('click', load);
window.addEventListener('online', load);
window.addEventListener('offline', () => showProblem('لا يوجد اتصال بالإنترنت.'));
load();
