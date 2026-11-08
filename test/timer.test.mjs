// اختبارات مؤقت التركيز — كل اختبار يثبت سلوكاً من وصف المالك (bukur-complete-toolkit.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS, advance, configFor, dayStats, formatClock, formatMinutes, fraction, initial, isFinished,
  logFocus, pause, remaining, reset, start, weekStats,
} from '../app/widgets/focus-timer/timer.js';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 8, 9, 0, 0);

test('النماذج الثلاثة من مستند الأدوات: 25/5 ×4، 50/10، 90', () => {
  assert.deepEqual([PRESETS.classic.focus, PRESETS.classic.short, PRESETS.classic.every], [25, 5, 4]);
  assert.deepEqual([PRESETS.deep.focus, PRESETS.deep.short], [50, 10]);
  assert.equal(PRESETS.ultradian.focus, 90);
});

test('العدّ يعتمد وقت الانتهاء: يبقى صحيحاً بعد إغلاق الصفحة وفتحها', () => {
  const cfg = PRESETS.classic;
  const s = start(initial(cfg), T0);
  assert.equal(remaining(s, T0 + 10 * MIN), 15 * MIN);
  assert.equal(isFinished(s, T0 + 24 * MIN), false);
  assert.equal(isFinished(s, T0 + 25 * MIN), true);
  assert.equal(remaining(s, T0 + 40 * MIN), 0); // لا قيم سالبة
});

test('الإيقاف المؤقت يجمّد المتبقي، والاستئناف يكمل منه', () => {
  const cfg = PRESETS.classic;
  let s = start(initial(cfg), T0);
  s = pause(s, T0 + 5 * MIN);
  assert.equal(remaining(s, T0 + 60 * MIN), 20 * MIN);
  s = start(s, T0 + 60 * MIN);
  assert.equal(remaining(s, T0 + 70 * MIN), 10 * MIN);
});

test('الكلاسيكي: تركيز ← راحة قصيرة ×3، وبعد الرابعة راحة طويلة ثم دورة جديدة', () => {
  const cfg = PRESETS.classic;
  let s = initial(cfg);
  const phases = [];
  for (let i = 0; i < 8; i++) { s = advance(s, cfg); phases.push(s.phase); }
  assert.deepEqual(phases, ['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus']);
  assert.equal(s.done, 0);
  assert.equal(s.remainingMs, 25 * MIN);
});

test('العميق و٩٠ دقيقة: بلا راحة طويلة', () => {
  const cfg = PRESETS.deep;
  let s = initial(cfg);
  for (let i = 0; i < 10; i++) s = advance(s, cfg);
  assert.notEqual(s.phase, 'long');
  assert.equal(advance(initial(cfg), cfg).remainingMs, 10 * MIN);
});

test('المرحلة التالية لا تبدأ تلقائياً، والإعادة ترجع المرحلة الحالية لبدايتها', () => {
  const cfg = PRESETS.classic;
  const next = advance(start(initial(cfg), T0), cfg);
  assert.equal(next.status, 'idle');
  const r = reset(pause(start(next, T0), T0 + MIN), cfg);
  assert.equal(r.remainingMs, 5 * MIN);
  assert.equal(r.status, 'idle');
});

test('المخصص: مدتان من المستخدم بين ١٠ ثوانٍ و١٢ ساعة (حلقة الساعات)', () => {
  assert.deepEqual([configFor('custom', { focus: 40, short: 8 }).focus, configFor('custom', { focus: 40, short: 8 }).short], [40, 8]);
  assert.equal(configFor('custom', { focus: 999 }).focus, 720);
  assert.equal(configFor('custom', { focus: 0 }).focus * 60, 10);
  assert.equal(configFor('custom', { focus: 'abc' }).focus * 60, 10);
});

test('القطاع يتناقص من ١ إلى ٠', () => {
  const cfg = PRESETS.classic;
  const s = start(initial(cfg), T0);
  assert.equal(fraction(s, T0, cfg), 1);
  assert.equal(fraction(s, T0 + 12.5 * MIN, cfg), 0.5);
  assert.equal(fraction(s, T0 + 25 * MIN, cfg), 0);
});

test('السجل: جلسات ودقائق اليوم، ومجموع آخر سبعة أيام', () => {
  const today = new Date(2026, 10, 8, 10, 0);
  let log = {};
  log = logFocus(log, today, 25);
  log = logFocus(log, today, 25);
  log = logFocus(log, new Date(2026, 10, 2, 22, 0), 50); // قبل ٦ أيام: داخل الأسبوع
  log = logFocus(log, new Date(2026, 10, 1, 9, 0), 90);  // قبل ٧ أيام: خارجه
  assert.deepEqual(dayStats(log, today), { sessions: 2, minutes: 50 });
  assert.deepEqual(weekStats(log, today), { sessions: 3, minutes: 100 });
});

test('صيغ العرض', () => {
  assert.equal(formatClock(25 * MIN), '25:00');
  assert.equal(formatClock(90 * MIN), '90:00');
  assert.equal(formatClock(1), '00:01'); // لا يظهر ٠٠:٠٠ قبل الانتهاء
  assert.equal(formatMinutes(45), '45د');
  assert.equal(formatMinutes(200), '3س 20د');
  assert.equal(formatMinutes(120), '2س');
});

import { RING, angleToMs, autoUnit, catchUp, customWith, fromHMS, ringFraction, splitHMS } from '../app/widgets/focus-timer/timer.js';

test('الحلقة: سحب ٩٠° = ١٥ دقيقة (دقائق) أو ٣ ساعات (ساعات)، مقرّبة لخطوة', () => {
  assert.equal(angleToMs(90, 'minutes'), 15 * MIN);
  assert.equal(angleToMs(90, 'hours'), 3 * 60 * MIN);
  assert.equal(angleToMs(92, 'minutes'), 15 * MIN);           // تقريب لأقرب دقيقة
  assert.equal(angleToMs(1, 'minutes'), MIN);                 // لا تقل عن خطوة
  assert.equal(angleToMs(359.9, 'minutes'), 60 * MIN);        // الالتفاف عند القمة = حلقة كاملة
  assert.equal(angleToMs(-90, 'minutes'), 45 * MIN);          // زوايا سالبة تُطبَّع
});

test('القطاع نسبة من الحلقة، وما زاد عليها حلقة كاملة؛ والوحدة تتبع المدة', () => {
  assert.equal(ringFraction(30 * MIN, 'minutes'), 0.5);
  assert.equal(ringFraction(90 * MIN, 'minutes'), 1);
  assert.equal(ringFraction(6 * 60 * MIN, 'hours'), 0.5);
  assert.equal(autoUnit(60 * MIN), 'minutes');
  assert.equal(autoUnit(61 * MIN), 'hours');
  assert.equal(RING.minutes.labels.length, 12);
});

test('عجلات الساعات/الدقائق/الثواني: تفكيك وتركيب', () => {
  assert.deepEqual(splitHMS(fromHMS({ h: 1, m: 25, s: 30 })), { h: 1, m: 25, s: 30 });
  assert.equal(fromHMS({ m: 25 }), 25 * MIN);
});

test('تعديل المدة يحفظ مدة المرحلة الأخرى، والمخصص بالثواني بين ١٠ث و١٢س', () => {
  const c = configFor('classic');
  assert.deepEqual(customWith(c, 'focus', 40 * MIN), { focusSec: 2400, breakSec: 300 });
  assert.deepEqual(customWith(c, 'short', 7 * MIN), { focusSec: 1500, breakSec: 420 });
  assert.equal(configFor('custom', { focusSec: 90 }).focus, 1.5);
  assert.equal(configFor('custom', { focusSec: 1 }).focus * 60, 10);
  assert.equal(configFor('custom', { focusSec: 99999 }).focus, 720);
  assert.equal(configFor('custom', { focus: 40, short: 8 }).focus, 40);  // الصيغة القديمة
});

test('بلا سلسلة: تنتهي المرحلة وتنتظر؛ مع السلسلة: تتوالى من لحظة الانتهاء ولو كانت الصفحة مغلقة', () => {
  const cfg = PRESETS.classic;
  const s = start(initial(cfg), T0);
  const off = catchUp(s, cfg, T0 + 40 * MIN, false);
  assert.equal(off.ended.length, 1);
  assert.equal(off.state.status, 'idle');
  assert.equal(off.state.phase, 'short');
  // مع السلسلة بعد ٤٠ دقيقة: تركيز ٢٥ ← راحة ٥ (حتى ٣٠) ← تركيز يجري منذ ١٠ دقائق
  const on = catchUp(s, cfg, T0 + 40 * MIN, true);
  assert.deepEqual(on.ended.map((e) => e.phase), ['focus', 'short']);
  assert.equal(on.state.phase, 'focus');
  assert.equal(on.state.status, 'running');
  assert.equal(remaining(on.state, T0 + 40 * MIN), 15 * MIN);
});

import { PALETTE, remainingColor, wrapUnit, zoneColor, nextUnit, PERCENT_LABELS } from '../app/widgets/focus-timer/timer.js';

test('ألوان الحلقة كالمؤقت المرجعي: أحمر ← برتقالي ← أصفر ← فيروزي بحسب الموضع، والراحة أزرق', () => {
  assert.equal(zoneColor(0.1), PALETTE.red);
  assert.equal(zoneColor(0.3), PALETTE.orange);
  assert.equal(zoneColor(0.6), PALETTE.yellow);
  assert.equal(zoneColor(0.9), PALETTE.cyan);
  assert.equal(remainingColor('focus', 1), PALETTE.cyan);   // بداية الجلسة: الطرف فيروزي
  assert.equal(remainingColor('focus', 0.2), PALETTE.red);  // آخرها: أحمر
  assert.equal(remainingColor('short', 0.05), PALETTE.blue);
});

test('وحدات الحلقة تدور: دقائق ← ساعات ← نسبة ← دقائق؛ والنسبة من مدة المرحلة', () => {
  assert.equal(nextUnit('minutes'), 'hours');
  assert.equal(nextUnit('hours'), 'percent');
  assert.equal(nextUnit('percent'), 'minutes');
  assert.equal(PERCENT_LABELS[0], 100);
  assert.equal(ringFraction(15 * MIN, 'percent', 60 * MIN), 0.25);
});

test('السحب المتصل: عبور القمة بعد ٦٠ دقيقة يحوّل للساعات، والعكس يعيد للدقائق', () => {
  assert.equal(wrapUnit('minutes', 355, 4), 'hours');
  assert.equal(wrapUnit('hours', 6, 350), 'minutes');
  assert.equal(wrapUnit('minutes', 200, 210), 'minutes');
  assert.equal(wrapUnit('minutes', 6, 350), 'minutes');   // الرجوع عبر القمة في الدقائق لا يغيّر
  assert.equal(wrapUnit('hours', 355, 4), 'hours');
});

import { detentMs, dragMs, stepDetent } from '../app/widgets/focus-timer/timer.js';

test('وقفات السحب: كل دقيقة حتى ١٠، ثم كل ٥ دقائق، وبعد الساعة بالوتيرة نفسها', () => {
  const m = (x) => detentMs(x * MIN) / MIN;
  assert.deepEqual([0.2, 1.4, 3.6, 9.9, 10.4].map(m), [1, 1, 4, 10, 10]);
  assert.deepEqual([11, 12.4, 12.6, 17, 29, 58].map(m), [10, 10, 15, 15, 30, 60]);
  assert.deepEqual([63, 66, 71, 92].map(m), [65, 65, 70, 90]);          // ١:٠٥، ١:١٠، ١:٣٠
  assert.equal(m(999), 720);                                            // لا تزيد على ١٢ ساعة
});

test('الوقفة التالية والسابقة: ٩ ← ١٠ ← ١٥، و١٥ ← ١٠ ← ٩', () => {
  const st = (x, d) => stepDetent(x * MIN, d) / MIN;
  assert.deepEqual([st(9, 1), st(10, 1), st(15, 1), st(60, 1)], [10, 15, 20, 65]);
  assert.deepEqual([st(15, -1), st(10, -1), st(1, -1)], [10, 9, 1]);
});

test('السحب على الحلقة يقف عند الوقفات: ٩٠° = ١٥ دقيقة، و١٢° ≈ دقيقتان، والقمة = ساعة', () => {
  assert.equal(dragMs(90, 'minutes'), 15 * MIN);
  assert.equal(dragMs(12, 'minutes'), 2 * MIN);
  assert.equal(dragMs(80, 'minutes'), 15 * MIN);      // ١٣٫٣ دقيقة ← ١٥
  assert.equal(dragMs(359.9, 'minutes'), 60 * MIN);
  assert.equal(dragMs(32.5, 'hours'), 65 * MIN);       // حلقة الساعات (١٢ ساعة): ١:٠٥
});

import { formatElapsed, logTask, swElapsed, swInitial, swToggle } from '../app/widgets/focus-timer/timer.js';

test('التصاعدي: يتزايد من لحظة البدء، ويتجمّد عند الإيقاف، ويكمل بعد الاستئناف ولو أُغلقت الصفحة', () => {
  let w = swInitial();
  assert.equal(swElapsed(w, T0), 0);
  w = swToggle(w, T0);
  assert.equal(swElapsed(w, T0 + 7 * MIN), 7 * MIN);
  w = swToggle(w, T0 + 10 * MIN);                // إيقاف بعد ١٠ دقائق
  assert.equal(swElapsed(w, T0 + 99 * MIN), 10 * MIN);
  w = swToggle(w, T0 + 100 * MIN);               // استئناف
  assert.equal(swElapsed(w, T0 + 125 * MIN), 35 * MIN);
});

test('صيغة الوقت المستغرق، وسجل المهام (الأحدث أولاً)', () => {
  assert.equal(formatElapsed(0), '00:00');
  assert.equal(formatElapsed(59_999), '00:59');
  assert.equal(formatElapsed(25 * MIN + 7000), '25:07');
  assert.equal(formatElapsed(75 * MIN), '1:15:00');
  let t = logTask([], ' واجب الإحصاء ', 42 * MIN, new Date(T0));
  t = logTask(t, '', MIN, new Date(T0 + MIN));
  assert.deepEqual(t.map((x) => x.name), ['مهمة', 'واجب الإحصاء']);
  assert.equal(t[1].ms, 42 * MIN);
});

import { quarterCrossed, quarterOf, upStep } from '../app/widgets/focus-timer/timer.js';

test('تنبيه المراحل: عند كل انتقال لون (كل ربع) مرة واحدة، ولا شيء عند البداية أو الانتهاء', () => {
  assert.deepEqual([1, 0.76, 0.75, 0.5, 0.26, 0.25, 0.01].map(quarterOf), [3, 3, 2, 1, 1, 0, 0]);
  assert.equal(quarterCrossed(0.76, 0.74), 25);
  assert.equal(quarterCrossed(0.51, 0.49), 50);
  assert.equal(quarterCrossed(0.26, 0.24), 75);
  assert.equal(quarterCrossed(0.74, 0.70), null);   // داخل اللون نفسه
  assert.equal(quarterCrossed(null, 0.5), null);    // أول قراءة (فتح الصفحة): لا تنبيه
  assert.equal(quarterCrossed(0.1, 0), null);       // الانتهاء له نغمته
  assert.equal(quarterCrossed(0.3, 0.8), null);     // إعادة الضبط للأعلى: لا تنبيه
  assert.deepEqual([0, 14.9, 15, 44, 61].map((m) => upStep(m * MIN)), [0, 0, 1, 2, 4]);
});

import { logMinutes } from '../app/widgets/focus-timer/timer.js';

test('مهام التصاعدي تُجمع في دقائق التركيز ولا تُحسب جلسة بومودورو', () => {
  const day = new Date(2026, 10, 8, 10, 0);
  let log = logFocus({}, day, 25);          // جلسة بومودورو
  log = logMinutes(log, day, 2);             // مهمة دقيقتين
  log = logMinutes(log, day, 42.1);          // مهمة ٤٢ دقيقة
  assert.deepEqual(dayStats(log, day), { sessions: 1, minutes: 69.1 });
});
