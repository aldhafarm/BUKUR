// متتبع العادات — دوال نقية. شبكة: أيام الشهر × العادات. كل خانة حلقة تقبل الضغط المتكرر:
// فارغة ← كاملة ← نصف ← ثلث ← ربع ← فارغة (وصف المالك: «أول ضغطة كاملة، والثانية نصف أو ثلث أو ربع»).

export const LEVELS = [0, 1, 1 / 2, 1 / 3, 1 / 4]; // المستوى = موضع في هذه القائمة
export const LEVEL_LABEL = ['لم تتم', 'تمت', 'نصفها', 'ثلثها', 'ربعها'];

export const nextLevel = (lvl) => ((lvl ?? 0) + 1) % LEVELS.length;
export const fractionOf = (lvl) => LEVELS[lvl ?? 0] ?? 0;

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m من ٠
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/** أيام الشهر بمفاتيحها. */
export const monthDays = (y, m) => Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ d: i + 1, key: dayKey(y, m, i + 1), dow: new Date(y, m, i + 1).getDay() }));

/** يغيّر خانة (عادة، يوم) إلى المستوى التالي؛ الفارغة تُحذف من السجل. */
export function cycle(marks, habitId, key) {
  const row = { ...(marks[habitId] ?? {}) };
  const lvl = nextLevel(row[key]);
  if (lvl === 0) delete row[key]; else row[key] = lvl;
  return { ...marks, [habitId]: row };
}

/** إنجاز العادة في الشهر حتى اليوم: مجموع الكسور ÷ الأيام المنقضية (لا يُحسب المستقبل). */
export function monthScore(marks, habitId, y, m, today) {
  const row = marks[habitId] ?? {};
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());
  const days = monthDays(y, m).filter((x) => x.key <= todayKey);
  if (!days.length) return { done: 0, days: 0, pct: 0 };
  const done = days.reduce((s, x) => s + fractionOf(row[x.key]), 0);
  return { done, days: days.length, pct: Math.round((done / days.length) * 100) };
}

/** السلسلة الحالية: أيام متتالية منتهية باليوم (أو أمس إن لم يُسجَّل اليوم بعد) بإنجاز كامل. */
export function streak(marks, habitId, today) {
  const row = marks[habitId] ?? {};
  const keyOf = (dt) => dayKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (row[keyOf(d)] !== 1) d.setDate(d.getDate() - 1);
  let n = 0;
  while (row[keyOf(d)] === 1 && n < 3660) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** قوس الحلقة لكسر ٠..١ — مسار SVG في دائرة نصف قطرها r حول (c,c)، يبدأ من القمة مع عقارب الساعة. */
export function arcPath(frac, c = 12, r = 9) {
  if (frac <= 0) return '';
  if (frac >= 1) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.001} ${c - r} Z`;
  const a = frac * 2 * Math.PI;
  const x = c + r * Math.sin(a), y = c - r * Math.cos(a);
  return `M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`;
}
