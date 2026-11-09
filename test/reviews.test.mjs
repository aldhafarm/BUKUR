// مراجعات ٨–١٨–٢٨: الصفحة الافتراضية لليوم، وحفظ الحقول وتنظيفها، ونسبة التعبئة.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, monthKey, reviewOf, setReviewField, stageFill, stageFor } from '../app/widgets/planner/reviews.js';

test('الصفحة الافتراضية: قبل ١٨ انطلاق، ١٨–٢٧ مراجعة، ٢٨ فما بعد ختام', () => {
  assert.equal(stageFor('2026-11-03'), 'start');
  assert.equal(stageFor('2026-11-08'), 'start');
  assert.equal(stageFor('2026-11-18'), 'check');
  assert.equal(stageFor('2026-11-27'), 'check');
  assert.equal(stageFor('2026-11-28'), 'close');
  assert.equal(stageFor('2026-11-30'), 'close');
  assert.equal(monthKey('2026-11-18'), '2026-11');
});

test('حفظ الحقول: نص مقصوص، ومقياس ١–١٠، والفارغ يُحذف، والحقل المجهول يُهمل', () => {
  let r = setReviewField({}, '2026-11', 'start', 'vision', '  شهر الفصل الثالث  ');
  r = setReviewField(r, '2026-11', 'start', 'energy', '14');
  r = setReviewField(r, '2026-11', 'check', 'done', 'جمعت العينات');
  assert.deepEqual(reviewOf(r, '2026-11', 'start'), { vision: 'شهر الفصل الثالث', energy: 10 });
  assert.equal(setReviewField(r, '2026-11', 'start', 'energy', '0')['2026-11'].start.energy, 1);
  r = setReviewField(r, '2026-11', 'start', 'vision', '   ');
  assert.equal('vision' in reviewOf(r, '2026-11', 'start'), false);
  assert.equal(setReviewField(r, '2026-11', 'start', 'nope', 'x'), r);
  assert.deepEqual(reviewOf(r, '2026-12', 'close'), {});
});

test('نسبة التعبئة لكل صفحة', () => {
  const n = STAGES.close.fields.length;
  let r = {};
  assert.equal(stageFill(r, '2026-11', 'close'), 0);
  r = setReviewField(r, '2026-11', 'close', 'wins', 'أنهيت الفصل');
  r = setReviewField(r, '2026-11', 'close', 'balance', 7);
  assert.equal(stageFill(r, '2026-11', 'close'), Math.round((2 / n) * 100));
});
