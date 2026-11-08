// الجسر بين البكور والإضافة: يرسل حالة المؤقت لتعرضها الإضافة رقماً ولوناً فوق أيقونتها،
// فيبقى ظاهراً وإن أُغلقت القائمة الجانبية (الإضافة تحسب الوقت بمنبّهاتها، لا الصفحة).
// • داخل القائمة الجانبية: الصفحة في إطار صفحة الإضافة ← postMessage للأب، والأب يتحقق من المصدر.
// • في تبويب كامل: chrome.runtime.sendMessage لمعرّف الإضافة (externally_connectable في manifest)،
//   والمعرّف تعطيه الإضافة للصفحة عند فتح القائمة أول مرة. لا بيانات شخصية: أوقات ولون المرحلة فقط.

const ID_KEY = 'bukur:ext-id';
const ID_RE = /^[a-p]{32}$/; // شكل معرّفات إضافات Chrome
let extId = null;
try { extId = localStorage.getItem(ID_KEY); } catch { /* تخزين محجوب */ }

window.addEventListener('message', (e) => {
  if (e.source !== window.parent || e.data?.type !== 'bukur:ext' || !ID_RE.test(e.data.id ?? '')) return;
  extId = e.data.id;
  try { localStorage.setItem(ID_KEY, extId); } catch { /* بلا حفظ */ }
});

let last = '';
/** يرسل حالة المؤقت إن تغيّرت. state: {kind, status, phase, endsAt, remainingMs, phaseMs, startedAt, elapsedMs} */
export function sendTimer(state) {
  const key = JSON.stringify(state);
  if (key === last) return;
  last = key;
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'bukur:timer', state }, '*'); // الأب يتحقق من مصدر الرسالة؛ والمحتوى غير حساس
  } else if (extId && globalThis.chrome?.runtime?.sendMessage) {
    try { chrome.runtime.sendMessage(extId, { type: 'timer', state }, () => void chrome.runtime.lastError); } catch { /* الإضافة غير مثبّتة */ }
  }
}
