// ctx.store — مخزن خاص بكل ودجة. محلي (localStorage) الآن، وعبر الحساب لاحقاً بنفس الواجهة.
// كل قراءة وكتابة داخل try: التخزين قد يكون محجوباً (نافذة خاصة، إطار طرف ثالث)، والودجة تعمل بلا حفظ حينها.

const PREFIX = 'bukur:';

function read(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* التخزين غير متاح: نكمل في الذاكرة */ }
}

/**
 * createStore('bukur-clock', { defaults, migrate })
 * - get()       → الحالة كاملة (الافتراضيات + المحفوظ)
 * - set(patch)  → دمج وحفظ وإبلاغ المشتركين
 * - subscribe(fn) → يعيد دالة إلغاء
 * migrate: دالة تُستدعى مرة واحدة إن لم يوجد محفوظ، تعيد حالة قديمة لاستيرادها أو null.
 */
export function createStore(namespace, { defaults = {}, migrate } = {}) {
  let saved = read(namespace);
  if (!saved && migrate) {
    const imported = migrate();
    if (imported) {
      saved = imported;
      write(namespace, saved);
    }
  }
  let state = { ...defaults, ...(saved ?? {}) };
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      write(namespace, state);
      for (const fn of listeners) fn(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
