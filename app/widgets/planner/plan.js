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
  quarter: {
    label: 'أرباع السنة',
    periods: (y) => [0, 3, 6, 9].map((m, i) => ({ name: `الربع ${['الأول', 'الثاني', 'الثالث', 'الرابع'][i]}`, start: `${y}-${pad(m + 1)}-01`,
      end: key(new Date(y, m + 3, 0)), color: ['#5E8C61', '#A83C3C', '#C4703A', '#4E7C9B'][i] })),
  },
};
export const SYSTEM_IDS = Object.keys(SYSTEMS);
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

// ── النطاقات: سنة ← موسم ← شهر ← أسبوع ← يوم (زر واحد متعدد الضغطات يدور بينها)
export const SCOPES = ['year', 'season', 'month', 'week', 'day'];
export const SCOPE_LABEL = { year: 'سنة', season: 'موسم', month: 'شهر', week: 'أسبوع', day: 'يوم' };
export const nextScope = (s) => SCOPES[(SCOPES.indexOf(s) + 1) % SCOPES.length];

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
  const r = rangeFor('season', k, system);
  return dir > 0 ? addDays(r.end, 1) : addDays(r.start, -1);
}

// ── المهام: {id, name, start, end, color, progress 0..100}
/** المهام التي تتقاطع مع النطاق، بترتيب البداية. */
export const tasksIn = (tasks, r) => (tasks ?? []).filter((t) => t.end >= r.start && t.start <= r.end).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

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
export function makeTask({ name, start, end, color, progress }, id) {
  const s = start <= end ? start : end;
  const e = start <= end ? end : start;
  return { id, name: String(name ?? '').trim() || 'مهمة', start: s, end: e, color: color || '#3b82c4', progress: Math.max(0, Math.min(100, Math.round(Number(progress) || 0))) };
}

/** إنجاز النطاق: متوسط نسب المهام فيه موزوناً بأيامها داخله. */
export function rangeProgress(tasks, r) {
  let w = 0, sum = 0;
  for (const t of tasksIn(tasks, r)) { const b = barFor(t, r); w += b.span; sum += b.span * t.progress; }
  return w ? Math.round(sum / w) : null;
}
