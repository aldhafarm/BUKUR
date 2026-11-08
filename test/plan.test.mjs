// اختبارات المخطط (جانت): النطاقات وأنظمة المواسم وأشرطة المهام.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEMS, barFor, makeTask, nextScope, periodAt, periodsBetween, rangeFor, rangeProgress, shift, tasksIn, yearRows } from '../app/widgets/planner/plan.js';

test('الزر متعدد الضغطات (التطبيق الكامل): سنة ← موسم ← شهر ← أسبوع ← يوم ← سنة', () => {
  const seq = []; let s = 'year';
  for (let i = 0; i < 5; i++) { s = nextScope(s); seq.push(s); }
  assert.deepEqual(seq, ['season', 'month', 'week', 'day', 'year']);
});

test('مواسم النجوم من خارطة النجوم: الخريف ٦ سبتمبر (٩٢ يوماً) ثم الشتاء والربيع والصيف، ٣٦٥ يوماً', () => {
  const p = SYSTEMS.star.periods(2026);
  assert.deepEqual(p.map((x) => [x.name, x.start, x.end]), [
    ['الخريف', '2026-09-06', '2026-12-06'], ['الشتاء', '2026-12-07', '2027-03-07'],
    ['الربيع', '2027-03-08', '2027-06-06'], ['الصيف', '2027-06-07', '2027-09-05'],
  ]);
  assert.equal(periodAt('star', '2026-11-08').name, 'الخريف');
  assert.equal(periodAt('star', '2026-08-01').name, 'الصيف');     // يقع في سنة نجمية بدأت ٢٠٢٥
  assert.equal(periodAt('anwa', '2026-12-20').name, 'المربعانية');
  assert.equal(periodAt('astro', '2026-01-10').name, 'الشتاء');
  assert.equal(periodAt('quarter', '2026-11-08').name, 'الربع الرابع');
});

test('نطاقات العرض حول ٨ نوفمبر ٢٠٢٦ (أحد)', () => {
  assert.deepEqual(rangeFor('year', '2026-11-08'), { start: '2026-01-01', end: '2026-12-31', label: '2026' });
  assert.equal(rangeFor('month', '2026-11-08').end, '2026-11-30');
  assert.deepEqual([rangeFor('week', '2026-11-11').start, rangeFor('week', '2026-11-11').end], ['2026-11-08', '2026-11-14']);
  assert.equal(rangeFor('season', '2026-11-08', 'astro').label, 'الخريف');
  assert.equal(rangeFor('season', '2026-11-08', 'star').start, '2026-09-06');
});

test('التنقل بنطاق كامل: الشهر التالي، والموسم السابق، وعبور السنة', () => {
  assert.equal(shift('month', '2026-12-15', 1), '2027-01-01');
  assert.equal(shift('week', '2026-11-08', -1), '2026-11-01');
  assert.equal(shift('season', '2026-11-08', -1, 'star'), '2026-09-05');   // آخر يوم من الصيف السابق
  assert.equal(periodAt('star', shift('season', '2026-11-08', 1, 'star')).name, 'الشتاء');
});

test('شريط المهمة داخل النطاق يُقصّ عند الحدود، والسنة تقسّم المهمة على أشهرها', () => {
  const t = makeTask({ name: ' تحليل البيانات ', start: '2026-11-25', end: '2026-12-10', progress: 40 }, 'a');
  assert.equal(t.name, 'تحليل البيانات');
  assert.deepEqual(barFor(t, rangeFor('month', '2026-11-08')), { col: 24, span: 6, clipStart: false, clipEnd: true, fill: 1 }); // ٦٫٤ من ١٦ يوماً منجزة تغطي أيام نوفمبر الستة
  assert.equal(barFor(t, rangeFor('month', '2026-10-08')), null);
  const rows = yearRows([t], 2026);
  assert.deepEqual([rows[10].bars[0].col, rows[10].bars[0].span, rows[11].bars[0].col, rows[11].bars[0].span], [24, 6, 0, 10]);
});

test('مهمة بتاريخين معكوسين تُصحَّح، والنسبة بين ٠ و١٠٠، وإنجاز النطاق موزون بالأيام', () => {
  assert.deepEqual([makeTask({ start: '2026-02-10', end: '2026-02-01', progress: 140 }, 'b').start, makeTask({ progress: -3 }, 'c').progress], ['2026-02-01', 0]);
  const tasks = [makeTask({ start: '2026-11-01', end: '2026-11-10', progress: 100 }, 'x'), makeTask({ start: '2026-11-11', end: '2026-11-30', progress: 25 }, 'y')];
  assert.equal(rangeProgress(tasks, rangeFor('month', '2026-11-08')), 50);   // (١٠×١٠٠ + ٢٠×٢٥) ÷ ٣٠
  assert.equal(rangeProgress(tasks, rangeFor('month', '2026-12-08')), null);
  assert.deepEqual(tasksIn(tasks, rangeFor('week', '2026-11-08')).map((t) => t.id), ['x', 'y']);
  assert.ok(periodsBetween('quarter', '2026-11-01', '2027-01-10').length === 2);
});

test('الممتلئ يتبع خط زمن المهمة: مهمة ٢٠ يوماً منجزة ٥٠٪ تملأ أيامها العشرة الأولى فقط', () => {
  const t = makeTask({ start: '2026-11-21', end: '2026-12-10', progress: 50 }, 'f');   // ١٠ أيام في نوفمبر و١٠ في ديسمبر
  assert.equal(barFor(t, rangeFor('month', '2026-11-08')).fill, 1);      // نوفمبر: كله منجز
  assert.equal(barFor(t, rangeFor('month', '2026-12-08')).fill, 0);      // ديسمبر: لم يُنجز منه شيء
  assert.equal(barFor(makeTask({ start: '2026-11-21', end: '2026-12-10', progress: 75 }, 'g'), rangeFor('month', '2026-12-08')).fill, 0.5);
});

import { CATEGORIES, colorOf, countByCategory, visibleTasks } from '../app/widgets/planner/plan.js';

test('التصنيفات: اللون من التصنيف، والفرز يخفي التصنيفات المطفأة، والعدّ لكل تصنيف في النطاق', () => {
  const a = makeTask({ name: 'تقرير', start: '2026-11-02', end: '2026-11-05', category: 'work' }, 'a');
  const b = makeTask({ name: 'تمرين', start: '2026-11-03', end: '2026-11-03', category: 'health' }, 'b');
  const old = makeTask({ name: 'قديمة', start: '2026-11-04', end: '2026-11-04', color: '#123456' }, 'c'); // قبل التصنيفات
  assert.equal(colorOf(a), CATEGORIES.find((c) => c.id === 'work').color);
  assert.equal(colorOf(old), '#123456');
  assert.equal(makeTask({ category: 'nope' }, 'd').category, undefined);
  assert.deepEqual(visibleTasks([a, b, old], ['work']).map((t) => t.id), ['b', 'c']);
  const n = countByCategory([a, b, old], rangeFor('month', '2026-11-08'));
  assert.deepEqual([n.work, n.health, n.family], [1, 1, 0]);
});

import { NARROW_SCOPES, WEEKEND_PRESETS, isWeekend, scopeFor, twoRanges } from '../app/widgets/planner/plan.js';

test('القائمة الجانبية: يوم ← أسبوع ← شهران ← فترتان، والنطاقات الكاملة للتطبيق الكامل فقط', () => {
  const seq = []; let s = 'day';
  for (let i = 0; i < 4; i++) { s = nextScope(s, true); seq.push(s); }
  assert.deepEqual(seq, ['week', 'months2', 'periods2', 'day']);
  assert.deepEqual([scopeFor('year', true), scopeFor('months2', false), scopeFor('periods2', false), scopeFor('week', true)], ['day', 'month', 'season', 'week']);
  assert.equal(nextScope('year', true), 'day');
  assert.deepEqual(NARROW_SCOPES.includes('year'), false);
});

test('الحالي والتالي: شهران (عبر السنة)، وموسمان، ومنزلتان', () => {
  const [a, b] = twoRanges('months2', '2026-12-10');
  assert.deepEqual([a.label, b.label, b.start, b.end], ['ديسمبر 2026', 'يناير 2027', '2027-01-01', '2027-01-31']);
  assert.deepEqual(twoRanges('periods2', '2026-11-08', 'star').map((r) => r.label), ['الخريف', 'الشتاء']);
  assert.deepEqual(twoRanges('periods2', '2026-11-08', 'anwa').map((r) => r.label), ['الوسم', 'المربعانية']);
  const m = twoRanges('periods2', '2026-09-10', 'manazil');
  assert.deepEqual([m[0].label, m[0].start, m[0].end, m[1].label], ['الجبهة', '2026-09-06', '2026-09-19', 'الزبرة']);   // الجبهة ١٤ يوماً
  assert.equal(SYSTEMS.manazil.periods(2026).length, 28);
});

test('عطلة نهاية الأسبوع بحسب البلد: السعودية الجمعة والسبت، والغرب السبت والأحد', () => {
  assert.deepEqual([isWeekend('2026-11-13', WEEKEND_PRESETS.sa.days), isWeekend('2026-11-14', WEEKEND_PRESETS.sa.days), isWeekend('2026-11-15', WEEKEND_PRESETS.sa.days)], [true, true, false]);
  assert.deepEqual([isWeekend('2026-11-13', WEEKEND_PRESETS.west.days), isWeekend('2026-11-15', WEEKEND_PRESETS.west.days)], [false, true]);
  assert.equal(isWeekend('2026-11-14', WEEKEND_PRESETS.none.days), false);
});

import { isUndated, scheduleOn, undatedTasks, unschedule } from '../app/widgets/planner/plan.js';

test('«لاحقاً»: مهمة بلا تاريخ في النظام نفسه، لا تظهر في التقويم حتى تُجدوَل، وتُسحب إلى يوم', () => {
  const later = makeTask({ name: 'قراءة كتاب عن التربة', category: 'study' }, 'L');
  assert.deepEqual([later.start, later.end, isUndated(later), later.category], [null, null, true, 'study']);
  const one = makeTask({ name: 'موعد', end: '2026-11-12' }, 'O');                       // تاريخ واحد = يوم واحد
  assert.deepEqual([one.start, one.end], ['2026-11-12', '2026-11-12']);
  const all = [later, one];
  assert.deepEqual(undatedTasks(all).map((x) => x.id), ['L']);
  assert.deepEqual(tasksIn(all, rangeFor('month', '2026-11-08')).map((x) => x.id), ['O']);   // التقويم لا يعرض «لاحقاً»
  const placed = scheduleOn(later, '2026-11-14');
  assert.deepEqual([placed.start, placed.end, isUndated(placed)], ['2026-11-14', '2026-11-14', false]);
  const moved = scheduleOn(makeTask({ start: '2026-11-02', end: '2026-11-05' }, 'M'), '2026-11-20'); // نقل بمدتها
  assert.deepEqual([moved.start, moved.end], ['2026-11-20', '2026-11-23']);
  assert.equal(isUndated(unschedule(moved)), true);
});

import { WEEKDAY_COLS, monthCells, monthOffset, nextYearLayout, yearWeeks } from '../app/widgets/planner/plan.js';

test('ترتيبات السنة تدور: بالتاريخ ← باليوم ← أشهراً ← أسابيع ← مواسم × أشهر ← طوالع × منازل', () => {
  assert.deepEqual(['date', 'weekday', 'months', 'weeks', 'seasonsMonths', 'tawaliManazil'].map(nextYearLayout), ['weekday', 'months', 'weeks', 'seasonsMonths', 'tawaliManazil', 'date']);
});

test('المحاذاة باليوم: ١ نوفمبر ٢٠٢٦ أحد (إزاحة ٠ والأسبوع يبدأ الأحد)، و١ يناير ٢٠٢٦ خميس (إزاحة ٤)', () => {
  assert.equal(monthOffset(2026, 10, 0), 0);
  assert.equal(monthOffset(2026, 0, 0), 4);
  assert.equal(monthOffset(2026, 0, 6), 5);           // الأسبوع يبدأ السبت
  assert.ok(Math.max(...Array.from({ length: 12 }, (_, m) => monthOffset(2026, m) + new Date(2026, m + 1, 0).getDate())) <= WEEKDAY_COLS);
  const cells = monthCells(2026, 0);
  assert.deepEqual([cells.slice(0, 4).every((c) => c === null), cells[4], cells.length], [true, '2026-01-01', 35]);
});

test('أسابيع السنة: تبدأ بأسبوع ١ يناير وتنتهي بأسبوع ٣١ ديسمبر، وتعلّم أول كل شهر', () => {
  const w = yearWeeks(2026);
  assert.deepEqual([w[0].start, w[0].end, w.at(-1).start <= '2026-12-31', w.at(-1).end >= '2026-12-31'], ['2025-12-28', '2026-01-03', true, true]);
  assert.equal(w.length, 53);
  assert.equal(w.filter((x) => x.monthStart != null).length, 12);
  assert.equal(w.find((x) => x.monthStart === 10).start, '2026-11-01');
});

import { GRID_PRESETS, SPANS, buildGrid, gridBars, segmentsOf, validCombo } from '../app/widgets/planner/plan.js';

test('القاعدة: الصف يحتوي العمود، والخلية بوحدة العمود — والعكس مرفوض', () => {
  assert.deepEqual([validCombo('season', 'month'), validCombo('tali', 'manzil'), validCombo('month', 'dayNum'), validCombo('week', 'weekday')], [true, true, true, true]);
  assert.deepEqual([validCombo('month', 'season'), validCombo('day', 'month'), validCombo('month', 'month'), validCombo('day', 'dayNum')], [false, false, false, false]);
  assert.throws(() => buildGrid(SPANS.year.range('2026-11-08'), 'month', 'season'));
});

test('المحرّك يعيد العروض الحالية: أشهر × رقم اليوم = ١٢ صفاً × ٣١ عموداً، وأشهر × يوم الأسبوع = ٣٧ عموداً', () => {
  const y = SPANS.year.range('2026-11-08');
  const g = buildGrid(y, 'month', 'dayNum');
  assert.deepEqual([g.rows.length, g.cols, g.header[30], g.rows[1].cells.length], [12, 31, '31', 28]);
  const w = buildGrid(y, 'month', 'weekday');
  assert.deepEqual([w.cols, w.rows[0].cells[0].col, w.rows[10].cells[0].col], [37, 4, 0]);   // ١ يناير خميس، ١ نوفمبر أحد
  const wk = buildGrid(y, 'week', 'weekday');
  assert.equal(wk.rows.length, 53);
});

test('سنة × مواسم × أشهر: صف لكل موسم، وخلاياه الأشهر التي يمسّها (مقصوصة عند حدوده)', () => {
  const g = buildGrid(SPANS.year.range('2026-11-08'), 'season', 'month', { system: 'astro' });
  assert.deepEqual(g.rows.map((r) => r.label), ['الشتاء', 'الربيع', 'الصيف', 'الخريف', 'الشتاء']);
  const autumn = g.rows[3];
  assert.deepEqual(autumn.cells.map((c) => `${c.label}:${c.start.slice(5)}→${c.end.slice(5)}`), ['سبتمبر:09-22→09-30', 'أكتوبر:10-01→10-31', 'نوفمبر:11-01→11-30', 'ديسمبر:12-01→12-20']);
  assert.equal(g.header, null); // الأعمدة تختلف من صف لآخر، فاسم الشهر داخل خليته
  const star = buildGrid(SPANS.year.range('2026-11-08'), 'season', 'month', { system: 'star' });
  assert.equal(star.rows.find((r) => r.label === 'الخريف').cells[0].start, '2026-09-06');
});

test('سنة نجمية × طوالع × منازل: ٣٦٥ يوماً، ٢٨ منزلة موزعة على الطوالع بلا قصّ', () => {
  const span = SPANS.starYear.range('2026-11-08');
  assert.deepEqual([span.start, span.end], ['2026-09-06', '2027-09-05']);
  const g = buildGrid(span, 'tali', 'manzil');
  assert.equal(g.rows.reduce((n, r) => n + r.cells.length, 0), 28);
  assert.deepEqual(g.rows.map((r) => r.label).slice(0, 4), ['سهيل', 'الوسم', 'المربعانية', 'الشبط']);
  assert.deepEqual(g.rows[1].cells.map((c) => c.label), ['العواء', 'السماك', 'الغفر', 'الزبانا']);
  assert.equal(GRID_PRESETS.tawaliManazil.rows, 'tali');
  assert.equal(segmentsOf('manzil', span.start, span.end).length, 28);
});

test('أشرطة المهام في خلايا الشبكة: مهمة ١٥ أكتوبر–١٠ نوفمبر تمسّ خليتي أكتوبر ونوفمبر في صف الخريف', () => {
  const g = buildGrid(SPANS.year.range('2026-11-08'), 'season', 'month', { system: 'astro' });
  const t = makeTask({ name: 'تجربة', start: '2026-10-15', end: '2026-11-10', progress: 50 }, 'x');
  const [b] = gridBars([t], g.rows[3]);
  assert.deepEqual([b.col, b.span], [1, 2]);
  assert.equal(gridBars([t], g.rows[1]).length, 0);
});
