// الروتين اليومي (فكرة المالك، ٩ نوفمبر): يومٌ من ٢٤ ساعة كحلقة ملوّنة تبدأ من النوم —
// موعد النوم وعدد ساعاته يحدّدان الاستيقاظ، والباقي يُوزَّع كتلاً (عمل، إبداع، وجبات، رياضة، اهتمامات…).
// الفئات وألوانها من دائرة المالك «Creative Routines» (شريحة ٧٢)، والقالب روتينه أيام الماجستير.
// النوم عادة: كل صباح ضغطة «نمت في موعدي» متعددة المستويات (منطق العادات نفسه).
import { LEVELS, fractionOf, nextLevel } from '../habits/habits.js';

export const CATS = {
  sleep: { label: 'نوم', color: '#c9c9c9' },
  primary: { label: 'عمل أساسي', color: '#1f9d8a' },
  creative: { label: 'عمل إبداعي', color: '#2346d8' },
  meals: { label: 'وجبات واجتماعي', color: '#f59e0b' },
  exercise: { label: 'رياضة وصحة', color: '#e36a6a' },
  other: { label: 'اهتمامات وأخرى', color: '#5b5b5b' },
};
export const CAT_IDS = Object.keys(CATS);

// روتين المالك أيام الماجستير — الأوقات تقريبية مقروءة من الدائرة
export const MASTER_TEMPLATE = [
  { name: 'تأليف', cat: 'creative', start: '03:30', end: '07:00' },
  { name: 'فطور', cat: 'meals', start: '07:00', end: '08:00' },
  { name: 'ذهني وبدني', cat: 'exercise', start: '08:00', end: '09:00' },
  { name: 'عمل', cat: 'primary', start: '09:00', end: '15:00' },
  { name: 'غداء', cat: 'meals', start: '15:00', end: '16:00' },
  { name: 'قيلولة', cat: 'sleep', start: '16:00', end: '17:30' },
  { name: 'إنتاج واهتمامات', cat: 'other', start: '18:00', end: '21:00' },
  { name: 'عشاء', cat: 'meals', start: '21:00', end: '22:00' },
];

const pad = (n) => String(n).padStart(2, '0');
/** 'HH:MM' ← دقائق منذ منتصف الليل (٠–١٤٣٩)، أو null إن كانت الصيغة خاطئة. */
export function toMin(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return +m[1] * 60 + +m[2];
}
export const fromMin = (n) => { const x = ((Math.round(n) % 1440) + 1440) % 1440; return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
/** مدة كتلة بالدقائق — تعبر منتصف الليل إن كانت النهاية قبل البداية. */
export const span = (a, b) => ((toMin(b) - toMin(a)) + 1440) % 1440;
export const fmtHours = (min) => { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}:${pad(m)}` : `${h}`; };

/** كتلة النوم الرئيسية من موعد النوم وعدد الساعات (٤–١٢). */
export function sleepBlock(bed, hours) {
  const h = Math.min(12, Math.max(4, Number(hours) || 7));
  const b = toMin(bed) ?? 22 * 60;
  return { id: 'sleep', name: 'نوم', cat: 'sleep', start: fromMin(b), end: fromMin(b + h * 60), fixed: true };
}

/** كل الكتل: النوم أولاً ثم كتل المستخدم السليمة مرتّبة بالبداية (بعد الاستيقاظ). */
export function allBlocks(state) {
  const sl = sleepBlock(state.bed, state.sleepHours);
  const wake = toMin(sl.end);
  const rest = (state.blocks ?? []).filter((b) => toMin(b.start) != null && toMin(b.end) != null && span(b.start, b.end) > 0 && CATS[b.cat])
    .sort((x, y) => ((toMin(x.start) - wake + 1440) % 1440) - ((toMin(y.start) - wake + 1440) % 1440));
  return [sl, ...rest];
}

/** هل الدقيقة m داخل الكتلة؟ */
export const inBlock = (b, m) => ((m - toMin(b.start) + 1440) % 1440) < span(b.start, b.end);
/** الكتلة الحالية (الأخيرة تفوز عند التداخل، والنوم أولاً فلا يغطي غيره) أو null إن كان الوقت حرّاً. */
export function blockAt(blocks, m) {
  for (let i = blocks.length - 1; i >= 0; i--) if (inBlock(blocks[i], m)) return blocks[i];
  return null;
}
/** الدقائق المتبقية في الكتلة. */
export const leftIn = (b, m) => span(b.start, b.end) - ((m - toMin(b.start) + 1440) % 1440);

/** مجموع الدقائق لكل فئة، والحرّ (غير المخصص)، والتداخل — بالدقيقة على مدار ١٤٤٠ دقيقة. */
export function totals(blocks) {
  const byCat = Object.fromEntries(CAT_IDS.map((c) => [c, 0]));
  let free = 0, overlap = 0;
  for (let m = 0; m < 1440; m++) {
    const hits = blocks.filter((b) => inBlock(b, m));
    if (!hits.length) free++;
    else { byCat[hits.at(-1).cat]++; if (hits.length > 1) overlap++; }
  }
  return { byCat, free, overlap };
}

/** سجل النوم: الضغطة التالية على يوم (كامل ← ½ ← ⅓ ← ¼ ← فارغ). */
export function cycleSleep(log, day) {
  const lvl = nextLevel(log?.[day]);
  const next = { ...(log ?? {}) };
  if (lvl) next[day] = lvl; else delete next[day];
  return next;
}
/** التزام النوم في آخر n يوماً حتى day (٠–١٠٠). */
export function sleepScore(log, day, n = 7) {
  const d = new Date(`${day}T12:00:00`);
  let s = 0;
  for (let i = 0; i < n; i++) { const k = new Date(d - i * 864e5); s += fractionOf(log?.[`${k.getFullYear()}-${pad(k.getMonth() + 1)}-${pad(k.getDate())}`]); }
  return Math.round((s / n) * 100);
}
export { LEVELS, fractionOf };
