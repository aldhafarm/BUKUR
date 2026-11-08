// حسابات ساعة البكور — دوال نقية بلا DOM، منقولة حرفياً من index.html الأصلي (AL DHAFAR 3).
// الإطار مقسوم ٢٤ خانة × ١٥°، ومثلثه الأحمر عند منتصف الخانة الأولى (لذا نصف خانة = ٠٫٥ ساعة = ٧٫٥°).

const wrap = (value, size) => ((value % size) + size) % size;

/** زاوية عقرب الساعات على قرص ٢٤ ساعة: ١٥° لكل ساعة + ٠٫٢٥° لكل دقيقة. */
export const hourDegrees = (h, m) => h * 15 + m * 0.25;
export const minuteDegrees = (m, s) => m * 6 + s * 0.1;
export const secondDegrees = (s) => s * 6;

/** وقت الاستيقاظ (بالساعات العشرية، ٠–٢٤) الذي يشير إليه الإطار المدار بزاوية rotation. */
export const wakeHourFromBezel = (rotation) => wrap(rotation / 15 + 0.5, 24);

/**
 * ساعات اليقظة منذ وقت الاستيقاظ. تُحسب بباقي القسمة على ٢٤ كما في الأصل:
 * بعد ٢٤ ساعة يقظة تعود للصفر — سلوكٌ أبقيناه بقرار المالك حتى يُحسم لاحقاً.
 */
export const hoursAwake = (h, m, rotation) => wrap((hourDegrees(h, m) - rotation) / 15 - 0.5, 24);

/** زاوية الإطار التي تجعل وقت الاستيقاظ = h:m. */
export const bezelForTime = (h, m) => wrap(hourDegrees(h, m) - 7.5, 360);

/** الحالة بحسب ساعات اليقظة. level يُستعمل للون. */
export function awakeStatus(hours) {
  if (hours < 12) return { level: 'fresh', label: 'نشيط', emoji: '😊' };
  if (hours < 16) return { level: 'active', label: 'فعّال', emoji: '😐' };
  if (hours < 20) return { level: 'tired', label: 'متعب', emoji: '😴' };
  return { level: 'sleep', label: 'نَم!', emoji: '🛏️' };
}

const pad = (n) => String(n).padStart(2, '0');

/** ساعات عشرية ← «HH:MM». */
export function formatHM(decimalHours) {
  const h = Math.floor(decimalHours);
  const m = Math.floor((decimalHours - h) * 60);
  return `${pad(h)}:${pad(m)}`;
}

/** مدة بالساعات العشرية ← «٥س» أو «٥س ٣٠د». (الأصل: «5h 30m») */
export function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}س` : `${h}س ${m}د`;
}

/** هل الساعة dh (١–٢٤) داخل الليل حسب وضع الليل '18-06' أو '19-05'. */
export function isNightHour(dh, nightMode) {
  return nightMode === '19-05' ? dh >= 19 || dh < 5 : dh >= 18 || dh < 6;
}

/** فرق زاويتين بأقصر طريق (−١٨٠..١٨٠) — لسحب الإطار دون قفزة عند عبور ±١٨٠°. */
export function angleDelta(from, to) {
  let d = to - from;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export const rotate = (rotation, delta) => wrap(rotation + delta, 360);
