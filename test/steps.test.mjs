// الخطوات تحت المهمة: الإضافة والإنجاز والحذف، ونسبة المهمة منها، وحفظ المحرّر لا يمحو الجهد ولا الخطوات.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTask } from '../app/widgets/planner/plan.js';
import { addStep, keepExtras, removeStep, stepsLabel, stepsProgress, toggleStep } from '../app/widgets/planner/steps.js';

const course = makeTask({ name: 'مقرر الإحصاء', start: '2026-09-01', end: '2026-12-31', progress: 40 }, 'c');

test('خطوات المقرّر: الواجب والاختبار، والنسبة تُحسب منها', () => {
  let t = addStep(course, ' واجب ١ ', 's1');
  t = addStep(t, 'اختبار نصفي', 's2', '2026-10-20');
  t = addStep(t, 'مشروع', 's3');
  t = addStep(t, '   ', 'nope');                 // الفارغ يُهمل
  assert.equal(t.steps.length, 3);
  assert.equal(t.steps[0].name, 'واجب ١');
  assert.equal(t.steps[1].due, '2026-10-20');
  assert.equal(t.progress, 0);                   // صارت النسبة من الخطوات
  t = toggleStep(t, 's1'); t = toggleStep(t, 's2');
  assert.equal(t.progress, 67);
  assert.equal(stepsLabel(t), '2/3');
  t = toggleStep(t, 's2');
  assert.equal(stepsProgress(t), 33);
});

test('حذف آخر خطوة يعيد النسبة يدوية، والمهمة بلا خطوات لا تتغير', () => {
  let t = toggleStep(addStep(course, 'واجب', 's1'), 's1');
  assert.equal(t.progress, 100);
  t = removeStep(t, 's1');
  assert.equal('steps' in t, false);
  assert.equal(t.progress, 100);
  assert.equal(stepsProgress(course), null);
  assert.equal(stepsLabel(course), '');
});

test('إصلاح: حفظ المحرّر لا يمحو سجل الجهد ولا الخطوات', () => {
  const prev = { ...toggleStep(addStep(course, 'واجب', 's1'), 's1'), effort: { '2026-11-09': 1 } };
  const edited = makeTask({ name: 'مقرر الإحصاء ١', start: '2026-09-01', end: '2026-12-31', progress: 10 }, 'c'); // ما يبنيه النموذج
  const saved = keepExtras(prev, edited);
  assert.deepEqual(saved.effort, { '2026-11-09': 1 });
  assert.equal(saved.steps.length, 1);
  assert.equal(saved.progress, 100);             // النسبة من الخطوات لا من شريط النموذج
  assert.equal(saved.name, 'مقرر الإحصاء ١');
  const plain = keepExtras(course, makeTask({ name: 'x', progress: 55 }, 'c'));
  assert.equal(plain.progress, 55);              // بلا خطوات: يدوية كما كانت
});
