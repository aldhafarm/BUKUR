// اختبارات الاستذكار المتباعد في الملاحظات — الفترات من وصف المالك (يوم، ٣ أيام، أسبوع، أسبوعان، شهر، أشهر).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTERVALS, addDays, dueItems, isDue, newItem, pickText, review, whenLabel } from '../app/widgets/notes/sr.js';

const D = (y, m, d) => new Date(y, m - 1, d, 10);

test('البطاقة الجديدة: تعلّم اليوم، أول مراجعة غداً', () => {
  const it = newItem(' Genetic drift ', D(2026, 11, 8), 'a');
  assert.equal(it.text, 'Genetic drift');
  assert.equal(it.due, '2026-11-09');
  assert.equal(isDue(it, D(2026, 11, 8)), false);
  assert.equal(isDue(it, D(2026, 11, 9)), true);
});

test('تذكّرتها: فترات متزايدة ١ ← ٣ ← ٧ ← ١٤ ← ٣٠ ← ٩٠ ← ١٨٠ يوماً ثم تثبت', () => {
  assert.deepEqual(INTERVALS, [1, 3, 7, 14, 30, 90, 180]);
  let it = newItem('x', D(2026, 11, 8), 'a');
  const gaps = [];
  let day = D(2026, 11, 9);
  for (let k = 0; k < 7; k++) {
    const before = it.due;
    it = review(it, true, day);
    const [y, m, d] = it.due.split('-').map(Number);
    gaps.push(Math.round((new Date(y, m - 1, d) - new Date(day.getFullYear(), day.getMonth(), day.getDate())) / 864e5));
    day = new Date(y, m - 1, d, 10);
    assert.ok(it.due > before);
  }
  assert.deepEqual(gaps, [3, 7, 14, 30, 90, 180, 180]);
});

test('نسيتها: تعود للصندوق الأول ومراجعة غداً، وتُعدّ مرات النسيان', () => {
  let it = review(review(newItem('x', D(2026, 11, 8), 'a'), true, D(2026, 11, 9)), true, D(2026, 11, 12));
  it = review(it, false, D(2026, 11, 19));
  assert.equal(it.box, 0);
  assert.equal(it.due, '2026-11-20');
  assert.equal(it.lapses, 1);
  assert.equal(it.reviews, 3);
});

test('المستحقة اليوم: المتأخرة أولاً، ولا يظهر ما موعده لاحقاً', () => {
  const a = { ...newItem('a', D(2026, 11, 1), 'a'), due: '2026-11-05' };
  const b = { ...newItem('b', D(2026, 11, 1), 'b'), due: '2026-11-08' };
  const c = { ...newItem('c', D(2026, 11, 1), 'c'), due: '2026-11-09' };
  assert.deepEqual(dueItems([b, c, a], D(2026, 11, 8)).map((x) => x.id), ['a', 'b']);
  assert.equal(whenLabel(a, D(2026, 11, 8)), 'متأخرة 3 يوم');
  assert.equal(whenLabel(c, D(2026, 11, 8)), 'غداً');
});

test('عبور نهاية الشهر والسنة في حساب المواعيد', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
});

test('النص المضاف: المحدد إن وُجد، وإلا سطر المؤشر', () => {
  const v = 'سطر أول\nBottleneck: loss of variation\nسطر ثالث';
  assert.equal(pickText(v, 10, 10), 'Bottleneck: loss of variation');
  assert.equal(pickText(v, 8, 18), 'Bottleneck');
});
