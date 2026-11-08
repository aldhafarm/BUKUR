// رابط تطبيق الويب. للتجربة المحلية قبل النشر: غيّره إلى http://localhost:8080/app/ (بعد npm run serve).
const APP_URL = 'https://bukur.mind8x.com/app/';

const frame = document.getElementById('app');
const offline = document.getElementById('offline');

function load() {
  offline.hidden = true;
  frame.hidden = false;
  frame.src = APP_URL;
}

// لا يمكن قراءة محتوى إطار من نطاق آخر، لذا نكتفي بمؤشر الاتصال: بلا إنترنت نعرض رسالة بدل صفحة خطأ.
function check() {
  if (!navigator.onLine) {
    frame.hidden = true;
    offline.hidden = false;
  }
}

document.getElementById('retry').addEventListener('click', load);
window.addEventListener('online', load);
window.addEventListener('offline', check);
load();
check();
