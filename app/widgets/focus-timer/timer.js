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
export const ringFraction = (ms, unit) => Math.min(1, Math.max(0, ms / RING[unit].spanMs));

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
