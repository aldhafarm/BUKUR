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
