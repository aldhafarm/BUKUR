// اختبارات متتبع العادات — الحلقة تقبل الضغط المتكرر: كاملة ← نصف ← ثلث ← ربع ← فارغة (وصف المالك).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arcPath, cycle, daysInMonth, fractionOf, monthDays, monthScore, nextLevel, streak } from '../app/widgets/habits/habits.js';

test('الضغط المتكرر: فارغة ← كاملة ← نصف ← ثلث ← ربع ← فارغة', () => {
  const seq = [];
  let l = 0;
  for (let k = 0; k < 5; k++) { l = nextLevel(l); seq.push(fractionOf(l)); }
  assert.deepEqual(seq, [1, 1 / 2, 1 / 3, 1 / 4, 0]);
});

test('الخانة الفارغة تُحذف من السجل، ولا تتأثر العادات الأخرى', () => {
  let m = { b: { '2026-11-01': 1 } };
  for (let k = 0; k < 5; k++) m = cycle(m, 'a', '2026-11-08');
  assert.deepEqual(m.a, {});
  assert.deepEqual(m.b, { '2026-11-01': 1 });
  m = cycle(cycle(m, 'a', '2026-11-08'), 'a', '2026-11-08');
  assert.equal(m.a['2026-11-08'], 2);
});

test('أيام الشهر: ٢٨ إلى ٣١', () => {
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(daysInMonth(2028, 1), 29);
  assert.equal(daysInMonth(2026, 10), 30);
  assert.equal(monthDays(2026, 11).length, 31);
  assert.equal(monthDays(2026, 10)[7].key, '2026-11-08');
});

test('نسبة الشهر: مجموع الكسور ÷ الأيام المنقضية فقط', () => {
  const m = { a: { '2026-11-01': 1, '2026-11-02': 2, '2026-11-03': 4, '2026-11-20': 1 } };
  const s = monthScore(m, 'a', 2026, 10, new Date(2026, 10, 4, 12));
  assert.equal(s.days, 4);
  assert.equal(s.done, 1.75);
  assert.equal(s.pct, 44);
});

test('السلسلة: أيام كاملة متتالية حتى اليوم أو أمس؛ الجزئي يقطعها', () => {
  const m = { a: { '2026-11-05': 1, '2026-11-06': 1, '2026-11-07': 1, '2026-11-04': 2, '2026-11-03': 1 } };
  assert.equal(streak(m, 'a', new Date(2026, 10, 8)), 3);   // اليوم لم يُسجَّل بعد
  assert.equal(streak(m, 'a', new Date(2026, 10, 7)), 3);
  assert.equal(streak(m, 'a', new Date(2026, 10, 10)), 0);
});

test('قوس الحلقة: فارغ للصفر، دائرة للكامل، ونصف دائرة للنصف', () => {
  assert.equal(arcPath(0), '');
  assert.match(arcPath(1), /A 9 9 0 1 1/);
  assert.match(arcPath(0.5), /A 9 9 0 0 1 12\.000 21\.000/);
});
