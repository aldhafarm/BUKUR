// دورة ٨–١٨–٢٨ (منهج البكور): مراحل الشهر مواقعُ للمهام، ومحطات ٨ و١٨ و٢٨، ويوم التوازن الأسبوعي.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CYCLE, GRID_PRESETS, buildGrid, cyclePhase, cycleStation, gridBars, isBalanceDay, makeTask, rangeFor, segmentsOf, validCombo } from '../app/widgets/planner/plan.js';

test('الشهر أربع مراحل: ١–٧ · ٨–١٧ · ١٨–٢٧ · ٢٨–آخره (فبراير غير الكبيس: الختام يوم ٢٨ وحده)', () => {
  const nov = segmentsOf('cycle', '2026-11-01', '2026-11-30');
  assert.deepEqual(nov.map((c) => `${c.start}→${c.end}`), ['2026-11-01→2026-11-07', '2026-11-08→2026-11-17', '2026-11-18→2026-11-27', '2026-11-28→2026-11-30']);
  assert.deepEqual(nov.map((c) => c.phase), CYCLE.map((c) => c.id));
  assert.equal(segmentsOf('cycle', '2027-02-01', '2027-02-28').at(-1).start, '2027-02-28');
  assert.equal(segmentsOf('cycle', '2028-02-01', '2028-02-29').at(-1).end, '2028-02-29'); // كبيسة
  assert.equal(segmentsOf('cycle', '2026-11-10', '2026-11-20').length, 2); // تُقصّ على النطاق
});

test('المحطات واليوم في دورته', () => {
  assert.equal(cycleStation('2026-11-08').en, 'START');
  assert.equal(cycleStation('2026-11-18').en, 'CHECK');
  assert.equal(cycleStation('2026-11-28').en, 'CLOSE');
  assert.equal(cycleStation('2026-11-01'), null);
  assert.equal(cycleStation('2026-11-09'), null);
  assert.equal(cyclePhase('2026-11-07').id, 'reset');
  assert.equal(cyclePhase('2026-11-17').id, 'start');
  assert.equal(cyclePhase('2026-11-30').id, 'close');
});

test('المراحل وحدة في المحرّك: سنة × مراحل = ١٢ × ٤، وشهر بمراحله صفوفاً، والمهام تمتد على مواقعها', () => {
  assert.ok(validCombo('month', 'cycle'));
  assert.ok(!validCombo('week', 'cycle')); // الأسبوع لا يحتوي مرحلة
  const y = buildGrid({ start: '2027-01-01', end: '2027-12-31' }, 'month', 'cycle');
  assert.equal(y.rows.length, 12); assert.ok(y.rows.every((r) => r.cells.length === 4));
  const m = buildGrid(rangeFor('month', '2026-11-08'), 'cycle', 'dayNum');
  assert.deepEqual(m.rows.map((r) => r.cells.length), [7, 10, 10, 3]);
  const t = makeTask({ name: 'تقرير منتصف الشهر', start: '2026-11-15', end: '2026-11-20' }, 'x');
  const nov = buildGrid(rangeFor('month', '2026-11-08'), 'month', 'cycle').rows[0];
  const [b] = gridBars([t], nov);
  assert.equal(b.col, 1); assert.equal(b.span, 2); // من «انطلاق» إلى «مراجعة»
  assert.ok(GRID_PRESETS.cycleYear && GRID_PRESETS.cycleMonth);
});

test('يوم التوازن الأسبوعي: يختاره المستخدم (الجمعة افتراضاً)، ويمكن إلغاؤه', () => {
  assert.equal(isBalanceDay('2026-11-13', 5), true);   // جمعة
  assert.equal(isBalanceDay('2026-11-14', 5), false);
  assert.equal(isBalanceDay('2026-11-13', null), false);
  assert.equal(isBalanceDay('2026-11-14', '6'), true);
});
