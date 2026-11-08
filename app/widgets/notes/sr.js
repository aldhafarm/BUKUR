// الاستذكار المتباعد (نظام لايتنر) — دوال نقية بلا DOM، كل دالة تأخذ «today» تاريخاً محلياً.
// الفترات من وصف المالك: اليوم الأول تعلّم ← بعد يوم ← بعد ٣ أيام ← أسبوع ← أسبوعان ← شهر ← ثم أشهر.
// تذكّرتها: تنتقل للصندوق التالي (فترة أطول). نسيتها: تعود للصندوق الأول (مراجعة غداً).

export const INTERVALS = [1, 3, 7, 14, 30, 90, 180]; // أيام بعد كل مراجعة ناجحة، بحسب الصندوق

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** بطاقة جديدة: تعلّمتها اليوم، أول مراجعة غداً. */
export const newItem = (text, today, id) => ({ id, text: String(text).trim(), box: 0, due: addDays(dayKey(today), INTERVALS[0]), added: dayKey(today), reviews: 0, lapses: 0 });

export const isDue = (item, today) => item.due <= dayKey(today);
export const dueItems = (items, today) => items.filter((it) => isDue(it, today)).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box));

/** نتيجة المراجعة: remembered=true ← الصندوق التالي؛ false ← الصندوق الأول. */
export function review(item, remembered, today) {
  const t = dayKey(today);
  const box = remembered ? Math.min(item.box + 1, INTERVALS.length - 1) : 0;
  return { ...item, box, due: addDays(t, INTERVALS[box]), last: t, reviews: item.reviews + 1, lapses: item.lapses + (remembered ? 0 : 1) };
}

/** الأيام المتبقية حتى المراجعة (سالب = متأخرة). */
export function daysUntil(item, today) {
  const [y, m, d] = item.due.split('-').map(Number);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d) - t) / 86_400_000);
}

export function whenLabel(item, today) {
  const n = daysUntil(item, today);
  if (n < 0) return `متأخرة ${-n} يوم`;
  if (n === 0) return 'اليوم';
  if (n === 1) return 'غداً';
  if (n < 30) return `بعد ${n} يوم`;
  return `بعد ${Math.round(n / 30)} شهر`;
}

/** السطر الذي فيه المؤشر، أو النص المحدد إن وُجد — لإضافته بطاقة. */
export function pickText(value, start, end) {
  if (end > start) return value.slice(start, end).trim();
  const a = value.lastIndexOf('\n', start - 1) + 1;
  let b = value.indexOf('\n', start);
  if (b < 0) b = value.length;
  return value.slice(a, b).trim();
}
