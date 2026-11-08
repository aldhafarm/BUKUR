// منطق «المخطط» (جانت) — دوال نقية بلا DOM. التواريخ مفاتيح محلية «YYYY-MM-DD».
// المبدأ (قرار المالك): مهما كان التقسيم — سنة، موسم، شهر، أسبوع، يوم — تبقى المهام ونسب إنجازها ظاهرة داخله.
// أنظمة المواسم كلها متاحة ويختار المستخدم ما يحتاج: مواسم النجوم، الطوالع، الفصول الفلكية، أرباع السنة.

const DAY = 86_400_000;
const pad = (n) => String(n).padStart(2, '0');
export const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / DAY); // b − a بالأيام
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const DOW = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// ── أنظمة المواسم
// مواسم النجوم والطوالع من «خارطة النجوم» (تقويم المنازل النجدي): السنة تبدأ ٦ سبتمبر بالجبهة،
// المنزلة الأولى ١٤ يوماً والباقية ١٣ (المجموع ٣٦٥). [المنزلة، أيامها، الطالع، الموسم]
const MANAZIL = [
  ['الجبهة', 14, 'سهيل', 'الخريف'], ['الزبرة', 13, 'سهيل', 'الخريف'], ['الصرفة', 13, 'سهيل', 'الخريف'],
  ['العواء', 13, 'الوسم', 'الخريف'], ['السماك', 13, 'الوسم', 'الخريف'], ['الغفر', 13, 'الوسم', 'الخريف'], ['الزبانا', 13, 'الوسم', 'الخريف'],
  ['الإكليل', 13, 'المربعانية', 'الشتاء'], ['القلب', 13, 'المربعانية', 'الشتاء'], ['الشولة', 13, 'المربعانية', 'الشتاء'],
  ['النعائم', 13, 'الشبط', 'الشتاء'], ['البلدة', 13, 'الشبط', 'الشتاء'], ['سعد الذابح', 13, 'العقارب', 'الشتاء'], ['سعد بلع', 13, 'العقارب', 'الشتاء'],
  ['سعد السعود', 13, 'العقارب', 'الربيع'], ['سعد الأخبية', 13, 'الحميمين', 'الربيع'], ['المقدم', 13, 'الحميمين', 'الربيع'],
  ['المؤخر', 13, 'الذراعين', 'الربيع'], ['الرشا', 13, 'الذراعين', 'الربيع'], ['الشرطين', 13, 'الثريا', 'الربيع'], ['البطين', 13, 'الثريا', 'الربيع'],
  ['الثريا', 13, 'الثريا', 'الصيف'], ['الدبران', 13, 'التويبع', 'الصيف'], ['الهقعة', 13, 'الجوزاء', 'الصيف'], ['الهنعة', 13, 'الجوزاء', 'الصيف'],
  ['الذراع', 13, 'المرزم', 'الصيف'], ['النثرة', 13, 'الكليبين', 'الصيف'], ['الطرف', 13, 'سهيل', 'الصيف'],
];
const SEASON_COLOR = { الخريف: '#C4703A', الشتاء: '#4E7C9B', الربيع: '#5E8C61', الصيف: '#A83C3C' }; // ألوان خارطة النجوم
const TALI_COLORS = ['#b07d3a', '#8a6f9e', '#4e7c9b', '#5b8fa8', '#6a9a7b', '#7aa35a', '#9a9a3a', '#c79a3a', '#c4703a', '#a85a3c', '#a83c3c', '#8c4a6a'];

/** يجمع المنازل المتتالية بحسب حقل (الموسم أو الطالع) ← فترات {name, days, offset} منذ ٦ سبتمبر. */
function groupBy(idx) {
  const out = [];
  let off = 0;
  for (const m of MANAZIL) {
    const last = out[out.length - 1];
    if (last && last.name === m[idx]) last.days += m[1];
    else out.push({ name: m[idx], days: m[1], offset: off });
    off += m[1];
  }
  return out;
}
const STAR_SEASONS = groupBy(3);
const TAWALI = groupBy(2);

/** فترات تقويم يبدأ ٦ سبتمبر لسنة نجمية تبدأ في السنة الميلادية y. */
function sepCycle(groups, y, colorOf) {
  const start = key(new Date(y, 8, 6));
  return groups.map((g, i) => ({ name: g.name, start: addDays(start, g.offset), end: addDays(start, g.offset + g.days - 1), color: colorOf(g, i) }));
}

export const SYSTEMS = {
  star: { label: 'مواسم النجوم', periods: (y) => sepCycle(STAR_SEASONS, y, (g) => SEASON_COLOR[g.name]) },
  anwa: { label: 'الطوالع', periods: (y) => sepCycle(TAWALI, y, (g, i) => TALI_COLORS[i % TALI_COLORS.length]) },
  // الفصول الفلكية بتواريخها الشائعة (الاعتدالان والانقلابان يتقدّمان أو يتأخران يوماً بحسب السنة — تقريب)
  astro: {
    label: 'الفصول الفلكية',
    periods: (y) => [
      { name: 'الربيع', start: `${y}-03-20`, end: `${y}-06-20`, color: SEASON_COLOR['الربيع'] },
      { name: 'الصيف', start: `${y}-06-21`, end: `${y}-09-21`, color: SEASON_COLOR['الصيف'] },
      { name: 'الخريف', start: `${y}-09-22`, end: `${y}-12-20`, color: SEASON_COLOR['الخريف'] },
      { name: 'الشتاء', start: `${y}-12-21`, end: `${y + 1}-03-19`, color: SEASON_COLOR['الشتاء'] },
    ],
  },
  // المنازل (النازل): ٢٨ منزلة بأيامها، بلون موسمها
  manazil: {
    label: 'المنازل',
    periods: (y) => {
      const start = key(new Date(y, 8, 6));
      let off = 0;
      return MANAZIL.map((m) => { const p = { name: m[0], start: addDays(start, off), end: addDays(start, off + m[1] - 1), color: SEASON_COLOR[m[3]] }; off += m[1]; return p; });
    },
  },
  quarter: {
    label: 'أرباع السنة',
    periods: (y) => [0, 3, 6, 9].map((m, i) => ({ name: `الربع ${['الأول', 'الثاني', 'الثالث', 'الرابع'][i]}`, start: `${y}-${pad(m + 1)}-01`,
      end: key(new Date(y, m + 3, 0)), color: ['#5E8C61', '#A83C3C', '#C4703A', '#4E7C9B'][i] })),
  },
};
export const SYSTEM_IDS = ['star', 'anwa', 'manazil', 'astro', 'quarter'];
export const nextSystem = (id) => SYSTEM_IDS[(SYSTEM_IDS.indexOf(id) + 1) % SYSTEM_IDS.length];

/** الفترة (من النظام) التي تحوي اليوم k. */
export function periodAt(system, k) {
  const y = parse(k).getFullYear();
  for (const yy of [y - 1, y]) for (const p of SYSTEMS[system].periods(yy)) if (p.start <= k && k <= p.end) return p;
  return null;
}

/** فترات النظام التي تتقاطع مع [from, to]. */
export function periodsBetween(system, from, to) {
  const y0 = parse(from).getFullYear() - 1;
  const y1 = parse(to).getFullYear();
  const out = [];
  for (let y = y0; y <= y1; y++) for (const p of SYSTEMS[system].periods(y)) if (p.end >= from && p.start <= to) out.push(p);
  return out;
}

// ── النطاقات: زر واحد متعدد الضغطات يدور بينها.
// التطبيق الكامل: سنة ← موسم ← شهر ← أسبوع ← يوم. القائمة الجانبية (قرار المالك): ما يلزم اليوم فقط —
// اليوم ← الأسبوع يوماً يوماً ← الشهر الحالي والقادم ← الفترة الحالية والتالية (موسم/طالع/منزلة بحسب النظام).
export const SCOPES = ['year', 'season', 'month', 'week', 'day'];
export const NARROW_SCOPES = ['day', 'week', 'months2', 'periods2'];
export const SCOPE_LABEL = { year: 'تقويم', season: 'موسم', month: 'شهر', week: 'أسبوع', day: 'يوم', months2: 'شهران', periods2: 'فترتان' };
export function nextScope(s, narrow = false) {
  const list = narrow ? NARROW_SCOPES : SCOPES;
  const i = list.indexOf(s);
  return list[(i + 1) % list.length]; // نطاق ليس في القائمة (بعد تغيير العرض) ← أول نطاق فيها
}
/** النطاق الصالح للعرض الحالي: الشهر الكامل والموسم الكامل والسنة للتطبيق الكامل فقط. */
export const scopeFor = (s, narrow) => ((narrow ? NARROW_SCOPES : SCOPES).includes(s) ? s : narrow ? 'day' : ({ months2: 'month', periods2: 'season' }[s] ?? 'month'));

/** نطاقان متتاليان (الحالي والتالي): شهران، أو فترتان من نظام المواسم. */
export function twoRanges(scope, k, system = 'star') {
  if (scope === 'months2') { const a = rangeFor('month', k); return [a, rangeFor('month', addDays(a.end, 1))]; }
  const a = rangeFor('season', k, system);
  return [a, rangeFor('season', addDays(a.end, 1), system)];
}

// ── أيام نهاية الأسبوع الرسمية (يختارها المستخدم): ٠ الأحد … ٦ السبت
export const WEEKEND_PRESETS = {
  sa: { label: 'السعودية والخليج (الجمعة والسبت)', days: [5, 6] },
  west: { label: 'أمريكا وأوروبا (السبت والأحد)', days: [6, 0] },
  fri: { label: 'الجمعة فقط', days: [5] },
  none: { label: 'بلا عطلة', days: [] },
};
export const isWeekend = (k, days = [5, 6]) => days.includes(parse(k).getDay());

/** نطاق العرض حول اليوم k: {start, end, label}. الأسبوع يبدأ الأحد. */
export function rangeFor(scope, k, system = 'star') {
  const d = parse(k);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (scope === 'year') return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) };
  if (scope === 'month') return { start: key(new Date(y, m, 1)), end: key(new Date(y, m + 1, 0)), label: `${MONTHS[m]} ${y}` };
  if (scope === 'week') {
    const s = addDays(k, -d.getDay());
    return { start: s, end: addDays(s, 6), label: `أسبوع ${parse(s).getDate()} ${MONTHS[parse(s).getMonth()]}` };
  }
  if (scope === 'day') return { start: k, end: k, label: `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[m]}` };
  const p = periodAt(system, k);
  return { start: p.start, end: p.end, label: p.name, color: p.color };
}

/** ينقل مرساة العرض نطاقاً كاملاً للأمام (+1) أو الخلف (−1). */
export function shift(scope, k, dir, system = 'star') {
  const d = parse(k);
  if (scope === 'year') return key(new Date(d.getFullYear() + dir, d.getMonth(), Math.min(d.getDate(), 28)));
  if (scope === 'month') return key(new Date(d.getFullYear(), d.getMonth() + dir, 1));
  if (scope === 'week') return addDays(k, 7 * dir);
  if (scope === 'day') return addDays(k, dir);
  if (scope === 'months2') return key(new Date(d.getFullYear(), d.getMonth() + dir, 1)); // التالي = يتقدم شهراً
  const r = rangeFor('season', k, system);
  return dir > 0 ? addDays(r.end, 1) : addDays(r.start, -1);
}

// ── التصنيفات (كتقويم AnuCal الذي أعجب المالك): لكل مهمة تصنيف بلونه، وأزرار في الأعلى تُظهر أو تخفي كل تصنيف.
export const CATEGORIES = [
  { id: 'work', label: 'عمل', color: '#3b82c4' },
  { id: 'study', label: 'تعلّم', color: '#16a34a' },
  { id: 'personal', label: 'شخصي', color: '#8b5cf6' },
  { id: 'health', label: 'صحة', color: '#0ea5b7' },
  { id: 'family', label: 'أسرة', color: '#f59e0b' },
  { id: 'farm', label: 'مزرعة', color: '#a16207' },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const categoryOf = (t) => CAT[t.category] ?? null;
/** لون المهمة: من تصنيفها، وإلا لونها المحفوظ (مهام ما قبل التصنيفات). */
export const colorOf = (t) => categoryOf(t)?.color ?? t.color ?? '#3b82c4';
/** فرز العرض: تُخفى مهام التصنيفات المطفأة؛ والمهمة بلا تصنيف تبقى ظاهرة. */
export const visibleTasks = (tasks, hidden = []) => (tasks ?? []).filter((t) => !t.category || !hidden.includes(t.category));
/** عدد المهام لكل تصنيف داخل النطاق — يظهر على أزرار الفرز. */
export function countByCategory(tasks, r) {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  for (const t of tasksIn(tasks, r)) if (t.category in out) out[t.category] += 1;
  return out;
}

// ── المهام: {id, name, start, end, category, progress 0..100} (مهام قديمة قد تحمل color بدل category)
/** المهام التي تتقاطع مع النطاق، بترتيب البداية. */
export const tasksIn = (tasks, r) => (tasks ?? []).filter((t) => t.start && t.end && t.end >= r.start && t.start <= r.end).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

/** موضع شريط المهمة داخل النطاق (أعمدة الأيام): {col (يبدأ ٠), span, clipStart, clipEnd}. */
export function barFor(t, r) {
  if (t.end < r.start || t.start > r.end) return null;
  const s = t.start < r.start ? r.start : t.start;
  const e = t.end > r.end ? r.end : t.end;
  // الممتلئ = المنجز على خط زمن المهمة كله: حدّه عند البداية + النسبة × المدة؛ فجزء المهمة في شهر لاحق
  // لا يظهر ممتلئاً بنسبة المهمة كلها، بل بقدر ما يقع قبل حدّ الإنجاز.
  const total = diffDays(t.start, t.end) + 1;
  const doneDays = (total * (t.progress ?? 0)) / 100;
  const before = diffDays(t.start, s);
  const span = diffDays(s, e) + 1;
  const fill = Math.max(0, Math.min(1, (doneDays - before) / span));
  return { col: diffDays(r.start, s), span, clipStart: t.start < r.start, clipEnd: t.end > r.end, fill: Math.round(fill * 1000) / 1000 };
}

/** صفوف عرض السنة (١٢ شهراً × ٣١ يوماً) — لكل شهر أجزاء المهام التي تقع فيه. */
export function yearRows(tasks, y) {
  return MONTHS.map((name, m) => {
    const r = { start: key(new Date(y, m, 1)), end: key(new Date(y, m + 1, 0)) };
    return { name, m, days: daysInMonth(y, m), bars: tasksIn(tasks, r).map((t) => ({ t, ...barFor(t, r) })) };
  });
}

/** مهمة جديدة سليمة: النهاية لا تسبق البداية، والنسبة بين ٠ و١٠٠. */
export function makeTask({ name, start, end, category, color, progress }, id) {
  // بلا تاريخين ← مهمة «لاحقاً» (النظام نفسه، فئة خاصة فقط)؛ وبتاريخ واحد ← مهمة يوم واحد
  start = start || end || null;
  end = end || start || null;
  const s = start && start <= end ? start : end;
  const e = start && start <= end ? end : start;
  const t = { id, name: String(name ?? '').trim() || 'مهمة', start: s, end: e, progress: Math.max(0, Math.min(100, Math.round(Number(progress) || 0))) };
  if (CAT[category]) t.category = category; else t.color = color || '#3b82c4';
  return t;
}

// ── «لاحقاً»: المهام بلا موعد — في النظام نفسه، تُعرض صندوقاً مستقلاً حتى تُجدوَل
export const isUndated = (t) => !t.start || !t.end;
export const undatedTasks = (tasks) => (tasks ?? []).filter(isUndated);
/** جدولة مهمة في يوم (بالسحب إليه): مهمة «لاحقاً» تصير مهمة ذلك اليوم؛ والمجدولة تنتقل بمدتها كاملة. */
export function scheduleOn(t, day) {
  if (isUndated(t)) return { ...t, start: day, end: day };
  return { ...t, start: day, end: addDays(day, diffDays(t.start, t.end)) };
}
/** إعادة مهمة إلى «لاحقاً» (إلغاء موعدها). */
export const unschedule = (t) => ({ ...t, start: null, end: null });

/** إنجاز النطاق: متوسط نسب المهام فيه موزوناً بأيامها داخله. */
export function rangeProgress(tasks, r) {
  let w = 0, sum = 0;
  for (const t of tasksIn(tasks, r)) { const b = barFor(t, r); w += b.span; sum += b.span * t.progress; }
  return w ? Math.round(sum / w) : null;
}

// ── تخطيطات السنة (طلب المالك): الأشهر لا تبدأ بيوم الأسبوع نفسه، فللسنة أربع طرق عرض:
//   date: صف لكل شهر بأعمدة ١–٣١ (الأيام بالرقم، وتختلف نهايات الأشهر)
//   weekday: صف لكل شهر محاذىً بيوم الأسبوع (عمود واحد لكل يوم أسبوع، ٣٧ عموداً)
//   months: ١٢ تقويماً شهرياً صغيراً
//   weeks: صف لكل أسبوع (٥٢–٥٤ أسبوعاً) × ٧ أيام
// (ترتيبات السنة السابقة صارت قوالب في GRID_PRESETS أدناه.)

/** إزاحة أول الشهر عن بداية الأسبوع (٠ = يبدأ الشهر في أول عمود). weekStart: ٠ الأحد … ٦ السبت. */
export const monthOffset = (y, m, weekStart = 0) => (new Date(y, m, 1).getDay() - weekStart + 7) % 7;

/** أعمدة المحاذاة باليوم: أكبر إزاحة + ٣١ = ٣٧ عموداً تكفي كل الأشهر. */
export const WEEKDAY_COLS = 37;

/** أسابيع السنة: من بداية الأسبوع الذي فيه ١ يناير حتى الأسبوع الذي فيه ٣١ ديسمبر. */
export function yearWeeks(y, weekStart = 0) {
  let s = addDays(`${y}-01-01`, -monthOffset(y, 0, weekStart));
  const out = [];
  while (s <= `${y}-12-31`) {
    const e = addDays(s, 6);
    const firstOfMonth = Array.from({ length: 7 }, (_, i) => addDays(s, i)).find((k) => k.endsWith('-01') && k.startsWith(String(y)));
    out.push({ start: s, end: e, n: out.length + 1, monthStart: firstOfMonth ? Number(firstOfMonth.slice(5, 7)) - 1 : null });
    s = addDays(s, 7);
  }
  return out;
}

/** خلايا شهر صغير (تقويم شهري): إزاحة ثم أيام الشهر — null للخانة الفارغة. */
export function monthCells(y, m, weekStart = 0) {
  return [...Array(monthOffset(y, m, weekStart)).fill(null), ...Array.from({ length: daysInMonth(y, m) }, (_, i) => key(new Date(y, m, i + 1)))];
}

// ════════════════════════════════════════════════════════════════════════════
// المحرّك العام (نموذج المالك): التقويم = فترة × صفوف × أعمدة ← خلايا.
//   القاعدة: وحدة الصف تحتوي وحدة العمود، والخلية بوحدة العمود.
//   الوحدات المقسِّمة: الشهر، الأسبوع، الموسم/الطالع/المنزلة (من أنظمة المواسم)، اليوم.
//   أعمدة موضعية خاصة: dayNum (رقم اليوم داخل الصف: ١–٣١ للشهر، ١–١٤ للمنزلة…) وweekday (محاذاة بيوم الأسبوع).
//   العروض كلها حالات منه؛ وأي تقسيم جديد = بيانات لا كود.
// ════════════════════════════════════════════════════════════════════════════

/** الوحدات: label للعرض، rank للحجم (الصف يجب أن يكون أكبر من العمود)، وsegments تقسّم [from, to] إلى قطع متتالية. */
export const UNITS = {
  day: { label: 'أيام', rank: 0, segments: (from, to) => Array.from({ length: diffDays(from, to) + 1 }, (_, i) => { const k = addDays(from, i); const d = parse(k); return { start: k, end: k, label: String(d.getDate()) }; }) },
  week: { label: 'أسابيع', rank: 1, segments: (from, to, o) => {
    const out = [];
    let s = addDays(from, -((parse(from).getDay() - (o.weekStart ?? 0) + 7) % 7));
    for (; s <= to; s = addDays(s, 7)) out.push({ start: s < from ? from : s, end: addDays(s, 6) > to ? to : addDays(s, 6), label: `أسبوع ${parse(s).getDate()} ${MONTHS[parse(s).getMonth()].slice(0, 3)}` });
    return out;
  } },
  manzil: { label: 'منازل', rank: 1, system: 'manazil' },
  month: { label: 'أشهر', rank: 2, segments: (from, to) => {
    const out = [];
    for (let d = parse(from); key(d) <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const s = key(d) < from ? from : key(d);
      const e = key(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      out.push({ start: s, end: e > to ? to : e, label: MONTHS[d.getMonth()] });
    }
    return out;
  } },
  tali: { label: 'طوالع', rank: 2, system: 'anwa' },
  season: { label: 'مواسم', rank: 3 }, // نظامها نظام المواسم المختار (نجوم/فلكي/أرباع)
  year: { label: 'سنوات', rank: 4, segments: (from, to) => {
    const out = [];
    for (let y = parse(from).getFullYear(); `${y}-01-01` <= to; y++) out.push({ start: `${y}-01-01` < from ? from : `${y}-01-01`, end: `${y}-12-31` > to ? to : `${y}-12-31`, label: String(y) });
    return out;
  } },
  // العقد (طلب المالك): فترة عشر سنوات صفاً واحداً، فتكون «عشر سنوات × سنوات» ١٠ خلايا كل خلية سنة
  decade: { label: 'عشر سنوات', rank: 5, segments: (from, to) => {
    const out = [];
    for (let y = parse(from).getFullYear(); `${y}-01-01` <= to; y += 10) {
      const s = `${y}-01-01` < from ? from : `${y}-01-01`;
      const e = `${y + 9}-12-31` > to ? to : `${y + 9}-12-31`;
      out.push({ start: s, end: e, label: `${parse(s).getFullYear()}–${parse(e).getFullYear()}` });
    }
    return out;
  } },
};
const SEASON_SYS = (o) => (['star', 'astro', 'quarter'].includes(o.system) ? o.system : 'star');

/** قطع وحدة داخل [from, to] — القطع على الحدود تُقصّ. */
export function segmentsOf(unit, from, to, o = {}) {
  const U = UNITS[unit];
  if (U.segments) return U.segments(from, to, o);
  const sys = U.system ?? SEASON_SYS(o);
  return periodsBetween(sys, from, to).map((p) => ({ start: p.start < from ? from : p.start, end: p.end > to ? to : p.end, label: p.name, color: p.color }));
}

/** الفترات: عشر سنوات · سنة ميلادية · سنة نجمية (تبدأ ٦ سبتمبر بالجبهة) · موسم · طالع · منزلة · شهر · أسبوع.
 *  rank: حجم الفترة — الصفوف لا تكون أكبر منها. */
const periodSpan = (sys) => (k, o = {}) => { const p = periodAt(typeof sys === 'function' ? sys(o) : sys, k); return { start: p.start, end: p.end, label: p.name }; };
export const SPANS = {
  decade: { label: 'عشر سنوات', rank: 5, range: (k) => { const y = parse(k).getFullYear(); return { start: `${y}-01-01`, end: `${y + 9}-12-31`, label: `${y}–${y + 9}` }; } },
  year: { label: 'سنة ميلادية', range: (k) => { const y = parse(k).getFullYear(); return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) }; } },
  starYear: { label: 'سنة نجمية', range: (k) => {
    const d = parse(k);
    const y = d < new Date(d.getFullYear(), 8, 6) ? d.getFullYear() - 1 : d.getFullYear();
    return { start: `${y}-09-06`, end: addDays(`${y + 1}-09-06`, -1), label: `${y}/${y + 1} نجمية` };
  } },
  season: { label: 'موسم', rank: 3, range: periodSpan(SEASON_SYS) },
  tali: { label: 'طالع', rank: 2, range: periodSpan('anwa') },
  month: { label: 'شهر', rank: 2, range: (k) => rangeFor('month', k) },
  manzil: { label: 'منزلة', rank: 1, range: periodSpan('manazil') },
  week: { label: 'أسبوع', rank: 1, range: (k, o = {}) => { const s = addDays(k, -((parse(k).getDay() - (o.weekStart ?? 0) + 7) % 7)); return { start: s, end: addDays(s, 6), label: `أسبوع ${parse(s).getDate()} ${MONTHS[parse(s).getMonth()]}` }; } },
};
SPANS.year.rank = 4; SPANS.starYear.rank = 4;
export const SPAN_IDS = ['decade', 'year', 'starYear', 'season', 'tali', 'month', 'manzil', 'week'];

/** الفترة التالية/السابقة: بعد نهاية الحالية أو قبل بدايتها. */
export function shiftSpan(span, k, dir, o = {}) {
  const r = SPANS[span].range(k, o);
  if (span === 'decade') return `${parse(r.start).getFullYear() + 10 * dir}-01-01`; // بالسنوات لا بالأيام (السنوات الكبيسة)
  return dir > 0 ? addDays(r.end, 1) : addDays(r.start, -1);
}

/** خيارات الصفوف للفترة: وحدات لا تتجاوز حجمها (الأكبر أولاً). */
export const rowsFor = (span) => Object.keys(UNITS).filter((u) => UNITS[u].rank >= 1 && UNITS[u].rank <= SPANS[span].rank).sort((a, b) => UNITS[b].rank - UNITS[a].rank);
/** خيارات الأعمدة للصفوف: ما يحتويه الصف فقط (القاعدة)، والموضعيان أولاً. */
export const colsFor = (rows) => ['dayNum', 'weekday', ...Object.keys(UNITS).sort((a, b) => UNITS[b].rank - UNITS[a].rank)].filter((c) => validCombo(rows, c));
export const COL_LABEL = { dayNum: 'رقم اليوم', weekday: 'يوم الأسبوع' };
export const colLabel = (c) => COL_LABEL[c] ?? UNITS[c].label;

/** إعداد شبكة سليم: يصحّح الصفوف والأعمدة إن لم تعودا صالحتين بعد تغيير الفترة أو الصفوف. */
export function normalizeGrid(g = {}) {
  const span = SPANS[g.span] ? g.span : 'year';
  const rows = rowsFor(span).includes(g.rows) ? g.rows : rowsFor(span)[0];
  const cols = colsFor(rows).includes(g.cols) ? g.cols : colsFor(rows)[0];
  return { span, rows, cols };
}
const cycle = (list, v) => list[(list.indexOf(v) + 1) % list.length];
export const nextSpan = (g) => normalizeGrid({ ...g, span: cycle(SPAN_IDS, g.span) });
export const nextRows = (g) => normalizeGrid({ ...g, rows: cycle(rowsFor(g.span), g.rows) });
export const nextCols = (g) => normalizeGrid({ ...g, cols: cycle(colsFor(g.rows), g.cols) });

/** هل التركيبة صالحة؟ الصف يحتوي العمود (رتبة أكبر)؛ والأعمدة الموضعية (رقم اليوم ويوم الأسبوع) خلاياها أيام. */
export function validCombo(rows, cols) {
  if (!UNITS[rows]) return false;
  if (cols === 'dayNum' || cols === 'weekday') return UNITS[rows].rank >= 1;
  return Boolean(UNITS[cols]) && UNITS[rows].rank > UNITS[cols].rank;
}

/**
 * الشبكة: {cols, header, rows:[{label, color, start, end, cells:[{start, end, label, color, col}]}]}.
 * header: عناوين الأعمدة حين تكون مشتركة بين الصفوف (رقم اليوم، يوم الأسبوع)، وإلا null وتحمل كل خلية اسمها.
 */
export function buildGrid(range, rowsUnit, colsUnit, o = {}) {
  if (!validCombo(rowsUnit, colsUnit)) throw new Error(`تركيبة غير صالحة: ${rowsUnit} × ${colsUnit}`);
  const ws = o.weekStart ?? 0;
  const rows = segmentsOf(rowsUnit, range.start, range.end, o).map((r) => {
    let cells;
    if (colsUnit === 'dayNum' || colsUnit === 'weekday') {
      const off = colsUnit === 'weekday' ? (parse(r.start).getDay() - ws + 7) % 7 : 0;
      cells = UNITS.day.segments(r.start, r.end).map((c, i) => ({ ...c, col: off + i }));
    } else {
      cells = segmentsOf(colsUnit, r.start, r.end, o).map((c, i) => ({ ...c, col: i }));
    }
    return { ...r, cells };
  });
  const cols = Math.max(1, ...rows.map((r) => (r.cells.at(-1)?.col ?? -1) + 1));
  const header = colsUnit === 'dayNum' ? Array.from({ length: cols }, (_, i) => String(i + 1))
    : colsUnit === 'weekday' ? Array.from({ length: cols }, (_, i) => DOW[(i + ws) % 7])
      : null;
  return { cols, header, rows };
}

/** أشرطة المهام في صف من الشبكة: من أول خلية تمسّها المهمة إلى آخر خلية، والممتلئ بحسب خط زمن المهمة. */
export function gridBars(tasks, row) {
  return tasksIn(tasks, row).map((t) => {
    const hit = row.cells.filter((c) => t.start <= c.end && t.end >= c.start);
    const b = barFor(t, row);
    return { t, col: hit[0].col, span: hit.at(-1).col - hit[0].col + 1, clipStart: b.clipStart, clipEnd: b.clipEnd, fill: b.fill };
  });
}

/** قوالب جاهزة (زر القوالب): كل العروض السابقة صارت تركيبات في المحرّك نفسه، عدا الأشهر الصغيرة. */
export const GRID_PRESETS = {
  date: { label: 'سنة بالتاريخ ١–٣١', span: 'year', rows: 'month', cols: 'dayNum' },
  weekday: { label: 'سنة محاذاة باليوم', span: 'year', rows: 'month', cols: 'weekday' },
  weeks: { label: 'سنة مقسّمة أسابيع', span: 'year', rows: 'week', cols: 'weekday' },
  seasonsMonths: { label: 'مواسم × أشهر', span: 'year', rows: 'season', cols: 'month' },
  tawaliManazil: { label: 'طوالع × منازل', span: 'starYear', rows: 'tali', cols: 'manzil' },
  monthCal: { label: 'شهر × أسابيع', span: 'month', rows: 'week', cols: 'weekday' },
  decadeYears: { label: 'عشر سنوات (١٠ خلايا)', span: 'decade', rows: 'decade', cols: 'year' },
  decade: { label: 'الخطة العشرية (١٠ × ١٢)', span: 'decade', rows: 'year', cols: 'month' },
};
export const PRESET_IDS = [...Object.keys(GRID_PRESETS), 'months']; // months: ١٢ تقويماً صغيراً (عرض خاص)
/** القالب المطابق لإعداد الشبكة (إن وُجد) — لإبراز اسمه في الزر. */
export const presetOf = (g) => Object.keys(GRID_PRESETS).find((k) => ['span', 'rows', 'cols'].every((x) => GRID_PRESETS[k][x] === g[x])) ?? null;
