// منطق شارة الإضافة (الرقم واللون فوق الأيقونة) — دوال نقية تُختبر بلا متصفح.
// الألوان نفسها في حلقة المؤقت: فيروزي ← أصفر ← برتقالي ← أحمر بحسب المتبقي، والراحة أزرق، والتصاعدي فيروزي.

export const COLORS = { red: '#e0393e', orange: '#f06a28', yellow: '#f3d13a', cyan: '#40c4c9', blue: '#3b82c4', grey: '#8a8f8c', done: '#3fbf6a' };
const MIN = 60_000;

function zone(frac) {
  if (frac <= 0.25) return COLORS.red;
  if (frac <= 0.5) return COLORS.orange;
  if (frac <= 0.75) return COLORS.yellow;
  return COLORS.cyan;
}

/**
 * دقائق: «18»، ومن ساعة «1:05» (الشارة تتسع لأربعة أحرف تقريباً).
 * التنازلي يقرّب لأعلى كأي عدّاد تنازلي (٣:٢٠ باقية ← «4»)؛ والتصاعدي لأسفل (دقائق مكتملة)، وتحت الدقيقة «<1».
 */
export function minutesText(ms, up = false) {
  if (up && ms < MIN) return '<1';
  const m = up ? Math.floor(ms / MIN) : Math.ceil(ms / MIN);
  return m < 60 ? String(m) : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * الشارة لحالة المؤقت في لحظة now. يعيد {text, color} — نص فارغ = لا شارة.
 * state من الصفحة: {kind:'down', status, phase, endsAt, remainingMs, phaseMs} أو {kind:'up', status, startedAt, elapsedMs}.
 */
export function badgeFor(state, now) {
  if (!state || state.status === 'idle') return { text: '', color: COLORS.grey };
  if (state.kind === 'up') {
    const ms = state.status === 'running' ? state.elapsedMs + (now - state.startedAt) : state.elapsedMs;
    return { text: minutesText(ms, true), color: state.status === 'running' ? COLORS.cyan : COLORS.grey };
  }
  const left = state.status === 'running' ? state.endsAt - now : state.remainingMs;
  if (left <= 0) return { text: '✓', color: COLORS.done };
  if (state.status !== 'running') return { text: minutesText(left), color: COLORS.grey }; // موقوف مؤقتاً
  const color = state.phase === 'focus' ? zone(left / state.phaseMs) : COLORS.blue;
  return { text: minutesText(left), color };
}

/** المنبّهات اللازمة: تحديث كل نصف دقيقة أثناء العدّ، ومنبّه عند الانتهاء ليظهر ✓ في وقته. */
export function alarmsFor(state) {
  if (!state || state.status !== 'running') return [];
  const out = [{ name: 'bukur-tick', info: { periodInMinutes: 0.5 } }];
  if (state.kind !== 'up' && state.endsAt) out.push({ name: 'bukur-end', info: { when: state.endsAt } });
  return out;
}
