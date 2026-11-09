// مراجعات دورة ٨–١٨–٢٨ (دفتر البكور): لكل شهر ميلادي ثلاث صفحات — انطلاق ٨، مراجعة ١٨، ختام ٢٨.
// الحقول منقولة من نماذج المالك (bukur-launch-date-8-18-28-system.md و bukur-journal-calendar-product.md).
// التخزين: reviews = { 'YYYY-MM': { start: {...}, check: {...}, close: {...} } }.
import { cyclePhase, parse } from './plan.js';

const T = (id, label, extra = {}) => ({ id, label, type: 'text', ...extra });
const L = (id, label, extra = {}) => ({ id, label, type: 'long', ...extra });
const S = (id, label) => ({ id, label, type: 'scale' }); // ١–١٠

export const STAGES = {
  start: { label: 'انطلاق ٨', en: 'START', color: '#16a34a', fields: [
    T('vision', 'رؤية الشهر (جملة واحدة)'),
    T('goal1', 'الهدف ١'), T('goal2', 'الهدف ٢'), T('goal3', 'الهدف ٣'),
    T('firstTask', 'أهم مهمة أبدأ بها'),
    T('resources', 'الموارد المطلوبة'),
    S('energy', 'الطاقة'), S('drive', 'الحماس'),
  ] },
  check: { label: 'مراجعة ١٨', en: 'CHECK', color: '#d97706', auto: true, fields: [
    L('done', 'ما أنجزته في الأيام العشرة الأولى'),
    L('obstacles', 'العقبات والتحديات'),
    L('adjust', 'التعديلات المطلوبة'),
    T('next1', 'أولوية ١ للأيام العشرة القادمة'), T('next2', 'أولوية ٢'), T('next3', 'أولوية ٣'),
    T('help', 'هل أحتاج مساعدة؟ من/ماذا'),
  ] },
  close: { label: 'ختام ٢٨', en: 'CLOSE', color: '#7c3aed', auto: true, fields: [
    L('wins', 'الإنجازات (ما أتممته)'),
    L('notDone', 'ما لم أنجزه ولماذا'),
    L('lessons', 'الدروس المستفادة'),
    T('best', 'أفضل لحظة في الشهر'),
    S('productivity', 'الإنتاجية'), S('satisfaction', 'الرضا'), S('balance', 'التوازن'),
    T('nextPriority', 'أولوية الشهر القادم'),
  ] },
};
export const STAGE_IDS = Object.keys(STAGES);

/** مفتاح الشهر 'YYYY-MM' ليوم. */
export const monthKey = (k) => k.slice(0, 7);
/** اسم الشهر للعرض. */
export const monthOf = (mk) => parse(`${mk}-01`);

/** الصفحة الافتراضية ليوم: قبل ٨ وحتى ١٧ ← انطلاق، ١٨–٢٧ ← مراجعة، ٢٨ فما بعد ← ختام. */
export function stageFor(k) {
  const p = cyclePhase(k).id;
  return p === 'check' ? 'check' : p === 'close' ? 'close' : 'start';
}

export const reviewOf = (reviews, mk, stage) => reviews?.[mk]?.[stage] ?? {};

/** حفظ حقل: يُقصّ النص، والمقياس عدد صحيح ١–١٠ (أو يُمسح)، والحقل الفارغ يُحذف. يعيد كائناً جديداً. */
export function setReviewField(reviews, mk, stage, field, value) {
  const f = STAGES[stage]?.fields.find((x) => x.id === field);
  if (!f) return reviews ?? {};
  let v;
  if (f.type === 'scale') { const n = Math.round(Number(value)); v = value === '' || value == null || !Number.isFinite(n) ? undefined : Math.min(10, Math.max(1, n)); }
  else { v = String(value ?? '').trim().slice(0, f.type === 'long' ? 2000 : 200) || undefined; }
  const page = { ...reviewOf(reviews, mk, stage) };
  if (v === undefined) delete page[field]; else page[field] = v;
  return { ...(reviews ?? {}), [mk]: { ...(reviews?.[mk] ?? {}), [stage]: page } };
}

/** نسبة تعبئة الصفحة (٠–١٠٠). */
export function stageFill(reviews, mk, stage) {
  const page = reviewOf(reviews, mk, stage);
  const fs = STAGES[stage].fields;
  return Math.round((fs.filter((f) => page[f.id] != null && page[f.id] !== '').length / fs.length) * 100);
}
