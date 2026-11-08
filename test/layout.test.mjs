// اختبارات التخطيط: الترتيب والنقل والحجم — بلا متصفح.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveBefore, moveBy, nextSize, reconcileOrder, toggle } from '../app/layout.js';

test('الترتيب المحفوظ يُحترم، والودجة الجديدة تُضاف في الآخر، والمحذوفة تختفي', () => {
  assert.deepEqual(reconcileOrder(['notes', 'gone', 'bukur-clock'], ['bukur-clock', 'notes', 'tasks']), ['notes', 'bukur-clock', 'tasks']);
  assert.deepEqual(reconcileOrder(null, ['a', 'b']), ['a', 'b']);
});

test('السحب: نقل قبل بطاقة أخرى، أو إلى الآخر', () => {
  assert.deepEqual(moveBefore(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
  assert.deepEqual(moveBefore(['a', 'b', 'c'], 'a', null), ['b', 'c', 'a']);
  assert.deepEqual(moveBefore(['a', 'b'], 'a', 'a'), ['a', 'b']);
});

test('الأسهم: خطوة للأعلى/للأسفل، ولا تتجاوز الطرفين', () => {
  assert.deepEqual(moveBy(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(moveBy(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(moveBy(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
});

test('الحجم يدور بين المسموح', () => {
  assert.equal(nextSize(['s', 'm', 'l'], 'l'), 's');
  assert.equal(nextSize(['s', 'm', 'l'], 'm'), 'l');
});

test('toggle', () => {
  assert.deepEqual(toggle(['a'], 'a'), []);
  assert.deepEqual(toggle([], 'a'), ['a']);
});

import { nextWidth, widthOf } from '../app/layout.js';

test('عرض البطاقة: عمود ← عمودان ← كامل ← عمود، والقيمة غير الصالحة ترجع للافتراضي', () => {
  assert.deepEqual([nextWidth(1), nextWidth(2), nextWidth(3), nextWidth(undefined)], [2, 3, 1, 2]);
  assert.equal(widthOf('2'), 2);
  assert.equal(widthOf(7, 3), 3);
  assert.equal(widthOf(undefined), 1);
});
