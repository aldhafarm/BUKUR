// الجهد اليومي لكل مهمة: الضغطات المتعددة (كامل ← ½ ← ⅓ ← ¼ ← فارغ)، والحِمل لكل يوم ولكل مرحلة ٨–١٨–٢٨.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTask } from '../app/widgets/planner/plan.js';
import { cycleEffort, dayLoad, effortOn, fmtEffort, phaseLoads, taskEffort } from '../app/widgets/planner/effort.js';

const a = makeTask({ name: 'تحليل', start: '2026-11-06', end: '2026-11-09' }, 'a');

test('الضغطات: كامل ← ½ ← ⅓ ← ¼ ← فارغ، وخارج مدى المهمة لا شيء', () => {
  let t = a;
  const seq = [];
  for (let i = 0; i < 5; i++) { t = cycleEffort(t, '2026-11-07'); seq.push(effortOn(t, '2026-11-07')); }
  assert.deepEqual(seq, [1, 1 / 2, 1 / 3, 1 / 4, 0]);
  assert.equal('2026-11-07' in t.effort, false); // الفارغ يُحذف
  assert.equal(cycleEffort(a, '2026-11-20'), a);
});

test('مجموع جهد المهمة وحِمل اليوم', () => {
  let t = cycleEffort(a, '2026-11-06');                         // ١
  t = cycleEffort(cycleEffort(t, '2026-11-08'), '2026-11-08');  // ½
  const b = cycleEffort(makeTask({ name: 'كتابة', start: '2026-11-08', end: '2026-11-08' }, 'b'), '2026-11-08'); // ١
  assert.equal(taskEffort(t), 1.5);
  assert.equal(taskEffort(t, { start: '2026-11-08', end: '2026-11-30' }), 0.5);
  assert.equal(dayLoad([t, b], '2026-11-08'), 1.5);
});

test('حِمل المراحل بأطوالها الحقيقية: تهيئة ٧ · انطلاق ١٠ · مراجعة ١٠ · ختام ٣ (نوفمبر)', () => {
  let t = cycleEffort(a, '2026-11-06');
  t = cycleEffort(t, '2026-11-09');
  const ph = phaseLoads([t], { start: '2026-11-01', end: '2026-11-30' });
  assert.deepEqual(ph.map((p) => p.days), [7, 10, 10, 3]);
  assert.deepEqual(ph.map((p) => p.effort), [1, 1, 0, 0]);
  assert.deepEqual(ph.map((p) => p.planned), [2, 2, 0, 0]); // المهمة تمسّ ٦–٧ و٨–٩
  assert.equal(phaseLoads([], { start: '2027-02-01', end: '2027-02-28' }).at(-1).days, 1);
});

test('عرض الكسور', () => {
  assert.equal(fmtEffort(0), '0');
  assert.equal(fmtEffort(1), '1');
  assert.equal(fmtEffort(0.5), '½');
  assert.equal(fmtEffort(2.5), '2½');
  assert.equal(fmtEffort(1 / 3), '⅓');
  assert.equal(fmtEffort(1.25), '1¼');
  assert.equal(fmtEffort(1.5 + 1 / 3), '1.8');
});
