// منطق مؤقت التركيز (بومودورو) — دوال نقية بلا DOM ولا ساعة: كل دالة تأخذ «now» بالملّي ثانية.
// المرجع: bukur-complete-toolkit.md (قسم U₂): كلاسيكي 25/5 ×4 ثم راحة طويلة، عميق 50/10، قاعدة الـ90.
// الحالة المحفوظة تعتمد «وقت الانتهاء» (endsAt) لا عدّاداً، فيستمر العدّ صحيحاً وإن أُغلقت الصفحة.

export const PRESETS = {
  classic: { label: 'كلاسيكي', focus: 25, short: 5, long: 15, every: 4 },
  deep: { label: 'تركيز عميق', focus: 50, short: 10, long: 10, every: 0 },
  ultradian: { label: '٩٠ دقيقة', focus: 90, short: 20, long: 20, every: 0 },
};

export const PHASE_LABEL = { focus: 'تركيز', short: 'راحة قصيرة', long: 'راحة طويلة' };

const MIN = 60_000;
export const MIN_SEC = 10;          // أقصر مدة مخصصة: ١٠ ثوانٍ
export const MAX_SEC = 12 * 3600;   // أطولها: ١٢ ساعة (حلقة الساعات)
const clampSec = (n) => Math.min(MAX_SEC, Math.max(MIN_SEC, Math.round(Number(n) || 0)));

/**
 * إعدادات النموذج الفعلية: نموذج جاهز، أو «مخصص» بمدتين بالثواني (focusSec / breakSec).
 * المدد في الإعدادات بالدقائق (قد تكون كسرية للمخصص). يقبل الصيغة القديمة {focus, short} بالدقائق.
 */
export function configFor(mode, custom = {}) {
  if (PRESETS[mode]) return PRESETS[mode];
  const focusSec = clampSec(custom.focusSec ?? (custom.focus ?? 25) * 60);
  const breakSec = clampSec(custom.breakSec ?? (custom.short ?? 5) * 60);
  return { label: 'مخصص', focus: focusSec / 60, short: breakSec / 60, long: breakSec / 60, every: 0 };
}

export const phaseMs = (phase, cfg) => cfg[phase] * MIN;

/** حالة البداية: جلسة تركيز لم تبدأ. done = جلسات التركيز المكتملة في الدورة الحالية. */
export const initial = (cfg) => ({ phase: 'focus', status: 'idle', remainingMs: phaseMs('focus', cfg), endsAt: null, done: 0 });

export function remaining(s, now) {
  return s.status === 'running' ? Math.max(0, s.endsAt - now) : s.remainingMs;
}

export const isFinished = (s, now) => s.status === 'running' && now >= s.endsAt;

export function start(s, now) {
  if (s.status === 'running') return s;
  return { ...s, status: 'running', endsAt: now + s.remainingMs };
}

export function pause(s, now) {
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', remainingMs: remaining(s, now), endsAt: null };
}

/** يعيد المرحلة الحالية إلى بدايتها دون تشغيل. */
export const reset = (s, cfg) => ({ ...s, status: 'idle', remainingMs: phaseMs(s.phase, cfg), endsAt: null });

/** المرحلة التالية بعد اكتمال الحالية أو تخطيها. لا تبدأ تلقائياً: المستخدم يضغط «ابدأ». */
export function advance(s, cfg) {
  let phase;
  let done = s.done;
  if (s.phase === 'focus') {
    done += 1;
    phase = cfg.every > 0 && done % cfg.every === 0 ? 'long' : 'short';
  } else {
    phase = 'focus';
    if (s.phase === 'long') done = 0; // دورة جديدة بعد الراحة الطويلة
  }
  return { phase, status: 'idle', remainingMs: phaseMs(phase, cfg), endsAt: null, done };
}

/** نسبة المتبقي (1 → 0) لرسم القطاع المتناقص. */
export const fraction = (s, now, cfg) => remaining(s, now) / phaseMs(s.phase, cfg);

/** «MM:SS» — بالدقائق الكلية حتى لو تجاوزت ستين (٩٠:٠٠). يُقرّب لأعلى فلا يظهر ٠٠:٠٠ قبل الانتهاء. */
export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── السجل: { 'YYYY-MM-DD': { sessions, minutes } } بالتاريخ المحلي للمستخدم

export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function logFocus(log, date, minutes) {
  const key = dateKey(date);
  const day = log[key] ?? { sessions: 0, minutes: 0 };
  return { ...log, [key]: { sessions: day.sessions + 1, minutes: day.minutes + minutes } };
}

/** دقائق تركيز بلا جلسة (مهام التصاعدي): تُجمع في ساعات التركيز ولا تُحسب في عدّاد البومودورو. */
export function logMinutes(log, date, minutes) {
  const key = dateKey(date);
  const day = log[key] ?? { sessions: 0, minutes: 0 };
  return { ...log, [key]: { sessions: day.sessions, minutes: Math.round((day.minutes + minutes) * 100) / 100 } };
}

export const dayStats = (log, date) => log[dateKey(date)] ?? { sessions: 0, minutes: 0 };

/** مجموع آخر سبعة أيام (اليوم ضمنها). */
export function weekStats(log, date) {
  const out = { sessions: 0, minutes: 0 };
  for (let i = 0; i < 7; i++) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - i);
    const day = dayStats(log, d);
    out.sessions += day.sessions;
    out.minutes += day.minutes;
  }
  return out;
}

/** دقائق ← «٣س ٢٠د» أو «٤٥د». */
export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}د`;
  return m === 0 ? `${h}س` : `${h}س ${m}د`;
}

// ── الحلقة التفاعلية: تُسحب لتحديد المدة. «دقائق» = الحلقة ٦٠ دقيقة، «ساعات» = الحلقة ١٢ ساعة.

export const RING = {
  minutes: { spanMs: 60 * MIN, snapMs: MIN, labels: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
  hours: { spanMs: 12 * 60 * MIN, snapMs: 5 * MIN, labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

/** زاوية (٠ في القمة، مع عقارب الساعة) ← مدة مقرّبة لوحدة الحلقة، لا تقل عن خطوة واحدة. */
export function angleToMs(angleDeg, unit) {
  const r = RING[unit];
  const a = ((angleDeg % 360) + 360) % 360;
  const ms = Math.round(((a / 360) * r.spanMs) / r.snapMs) * r.snapMs;
  return ms === 0 && a > 300 ? r.spanMs : Math.max(r.snapMs, ms); // الالتفاف عند القمة = حلقة كاملة
}

/** نسبة المدة من الحلقة (0..1) لرسم القطاع — ما يزيد على الحلقة يُرسم حلقة كاملة. */
export const ringFraction = (ms, unit, phaseTotalMs) =>
  Math.min(1, Math.max(0, ms / (unit === 'percent' ? phaseTotalMs : RING[unit].spanMs)));

/** الوحدة المناسبة للمدة: أكثر من ساعة ← ساعات. */
export const autoUnit = (ms) => (ms > 60 * MIN ? 'hours' : 'minutes');

export const splitHMS = (ms) => {
  const t = Math.round(ms / 1000);
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
};
export const fromHMS = ({ h = 0, m = 0, s = 0 }) => ((h * 3600) + (m * 60) + s) * 1000;

/** مدة جديدة للمرحلة الحالية ← إعدادات «مخصص» تحفظ مدة المرحلة الأخرى كما هي. */
export function customWith(cfg, phase, ms) {
  const sec = clampSec(ms / 1000);
  return phase === 'focus'
    ? { focusSec: sec, breakSec: Math.round(cfg.short * 60) }
    : { focusSec: Math.round(cfg.focus * 60), breakSec: sec };
}

/**
 * «السلسلة»: يعالج كل مرحلة انتهت حتى «now». بلا سلسلة: تنتهي المرحلة وتنتظر «ابدأ».
 * مع السلسلة: تبدأ التالية من لحظة انتهاء السابقة (لا من لحظة الفتح)، فيبقى العدّ صحيحاً
 * وإن كانت الصفحة مغلقة. يعيد الحالة الجديدة وقائمة المراحل المنتهية لتسجيلها.
 */
export function catchUp(s, cfg, now, chain) {
  const ended = [];
  let st = s;
  for (let i = 0; i < 200 && isFinished(st, now); i++) {
    ended.push({ phase: st.phase, endsAt: st.endsAt });
    const next = advance(st, cfg);
    st = chain ? { ...next, status: 'running', endsAt: st.endsAt + next.remainingMs } : next;
  }
  return { state: st, ended };
}

/**
 * ألوان الحلقة كما في المؤقت المرجعي (صورة المالك): أشرطة ملوّنة بحسب موضعها من القمة مع عقارب الساعة —
 * أحمر ٠–٢٥٪ · برتقالي ٢٥–٥٠٪ · أصفر ٥٠–٧٥٪ · فيروزي ٧٥–١٠٠٪. يختفي الفيروزي أولاً ويبقى الأحمر آخراً.
 * الراحة أشرطة زرقاء هادئة.
 */
export const PALETTE = { red: '#e0393e', orange: '#f06a28', yellow: '#f3d13a', cyan: '#40c4c9', blue: '#3b82c4' };
export function zoneColor(pos) {
  if (pos < 0.25) return PALETTE.red;
  if (pos < 0.5) return PALETTE.orange;
  if (pos < 0.75) return PALETTE.yellow;
  return PALETTE.cyan;
}
/** لون «الطرف» الحالي (للزر): لون الشريط الأخير المضاء. */
export const remainingColor = (phase, frac) => (phase === 'focus' ? zoneColor(Math.max(0, Math.min(0.9999, frac - 1e-9))) : PALETTE.blue);

/** وحدات الحلقة بالترتيب: دقائق ← ساعات ← نسبة مئوية من مدة المرحلة. */
export const UNITS = ['minutes', 'hours', 'percent'];
export const nextUnit = (u) => UNITS[(UNITS.indexOf(u) + 1) % UNITS.length];
export const PERCENT_LABELS = [100, 10, 20, 30, 40, 50, 60, 70, 80, 90];

/**
 * السحب المتصل حول الحلقة: في وحدة الدقائق، عبور القمة مع عقارب الساعة (من آخر الدائرة إلى أولها)
 * يحوّل إلى الساعات تلقائياً؛ وعبورها عكسياً في الساعات يعيد إلى الدقائق. prevDeg/deg بين ٠ و٣٦٠.
 */
export function wrapUnit(unit, prevDeg, deg) {
  const crossedForward = prevDeg > 270 && deg < 90;
  const crossedBack = prevDeg < 90 && deg > 270;
  if (unit === 'minutes' && crossedForward) return 'hours';
  if (unit === 'hours' && crossedBack) return 'minutes';
  return unit;
}

/**
 * «وقفات» السحب (طلب المالك): كل دقيقة حتى ١٠ دقائق، ثم كل ٥ دقائق (١٥، ٢٠، ٢٥ …)، وبعد الساعة
 * بالوتيرة نفسها (١:٠٥، ١:١٠ …). تأخذ مدة خاماً وتعيد أقرب وقفة، لا تقل عن دقيقة ولا تزيد على ١٢ ساعة.
 */
export function detentMs(ms) {
  const min = Math.max(0, ms) / MIN;
  const snapped = min <= 10.5 ? Math.round(min) : Math.round(min / 5) * 5;
  return Math.min(MAX_SEC * 1000, Math.max(1, snapped, min > 10.5 ? 10 : 1) * MIN);
}

/** الوقفة التالية (+1) أو السابقة (-1) — للأسهم وعجلة الفأرة. */
export function stepDetent(ms, dir) {
  const cur = detentMs(ms) / MIN;
  const step = dir > 0 ? (cur < 10 ? 1 : 5) : (cur <= 10 ? 1 : 5);
  return detentMs((cur + dir * step) * MIN);
}

/** مدة السحب من الزاوية: موضع خام على الحلقة ثم أقرب وقفة. الالتفاف عند القمة = حلقة كاملة. */
export function dragMs(angleDeg, unit) {
  const a = ((angleDeg % 360) + 360) % 360;
  const raw = (a / 360) * RING[unit].spanMs;
  return detentMs(raw < RING[unit].spanMs * 0.01 && a > 300 ? RING[unit].spanMs : raw);
}

// ── «تصاعدي» (طلب المالك): الوقت يتزايد بدل أن يتناقص — لمن يريد معرفة كم تستغرق مهمة معيّنة.
// الحالة تعتمد لحظة البدء (startedAt) كالتنازلي، فيبقى العدّ صحيحاً وإن أُغلقت الصفحة.

export const swInitial = () => ({ status: 'idle', startedAt: null, elapsedMs: 0 });

export const swElapsed = (w, now) => (w.status === 'running' ? w.elapsedMs + Math.max(0, now - w.startedAt) : w.elapsedMs);

/** تشغيل ↔ إيقاف مؤقت. */
export function swToggle(w, now) {
  if (w.status === 'running') return { status: 'paused', startedAt: null, elapsedMs: swElapsed(w, now) };
  return { status: 'running', startedAt: now, elapsedMs: w.elapsedMs };
}

/** «MM:SS» تحت الساعة، و«H:MM:SS» من ساعة فأكثر. يُقرّب لأسفل: لا يسبق الثانية. */
export function formatElapsed(ms) {
  const t = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** سجل المهام: الأحدث أولاً، ٥٠ مهمة على الأكثر. */
export function logTask(tasks, name, ms, date) {
  const entry = { name: String(name ?? '').trim() || 'مهمة', ms: Math.round(ms), at: date.getTime() };
  return [entry, ...(tasks ?? [])].slice(0, 50);
}

/**
 * تنبيه المراحل (طلب المالك): عند انتقال الحلقة من لون إلى لون — أي كلما مضى ربع المرحلة — تنبيه خفيف.
 * frac = نسبة المتبقي (1 → 0). تعيد رقم الربع (3 فيروزي … 0 أحمر).
 */
export const quarterOf = (frac) => Math.max(0, Math.min(3, Math.ceil(frac * 4) - 1));

/** هل عبرنا حدّ ربع منذ القراءة السابقة؟ يعيد نسبة ما مضى (25/50/75) أو null. لا تنبيه عند الانتهاء (له نغمته). */
export function quarterCrossed(prevFrac, frac) {
  if (prevFrac == null || frac <= 0 || frac >= prevFrac) return null;
  const a = quarterOf(prevFrac);
  const b = quarterOf(frac);
  return b < a ? (4 - (b + 1)) * 25 : null;
}

/** للتصاعدي: رقم الفترة (كل ١٥ دقيقة = لون على الحلقة) — يتغيّر فيُنبَّه. */
export const upStep = (ms) => Math.floor(Math.max(0, ms) / (15 * MIN));
