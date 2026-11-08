// اختبارات شارة الإضافة: الرقم واللون فوق الأيقونة حسب حالة المؤقت.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, alarmsFor, badgeFor, minutesText } from '../extension/badge.js';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 8, 9, 0, 0);
const run = (left, phase = 'focus', phaseMs = 25 * MIN) => ({ kind: 'down', status: 'running', phase, endsAt: T0 + left, remainingMs: null, phaseMs });

test('نص الدقائق: التنازلي يقرّب لأعلى (٣:٢٠ ← 4)، والتصاعدي لأسفل وتحت الدقيقة «<1»، ومن ساعة «1:05»', () => {
  assert.deepEqual([minutesText(3.33 * MIN), minutesText(30_000), minutesText(65 * MIN)], ['4', '1', '1:05']);
  assert.deepEqual([minutesText(18.9 * MIN, true), minutesText(30_000, true), minutesText(65.5 * MIN, true)], ['18', '<1', '1:05']);
});

test('التنازلي: الرقم المتبقي ولونه بحسب المرحلة كالحلقة، والراحة أزرق، والانتهاء ✓', () => {
  assert.deepEqual(badgeFor(run(20 * MIN), T0), { text: '20', color: COLORS.cyan });   // ٨٠٪ باقٍ
  assert.equal(badgeFor(run(15 * MIN), T0).color, COLORS.yellow);                      // ٦٠٪
  assert.equal(badgeFor(run(10 * MIN), T0).color, COLORS.orange);                      // ٤٠٪
  assert.equal(badgeFor(run(5 * MIN), T0).color, COLORS.red);                          // ٢٠٪
  assert.equal(badgeFor(run(3 * MIN, 'short', 5 * MIN), T0).color, COLORS.blue);
  assert.deepEqual(badgeFor(run(0), T0 + 1000), { text: '✓', color: COLORS.done });
});

test('الموقوف رمادي بالمتبقي، والخامل بلا شارة، والتصاعدي يعدّ الدقائق المنقضية', () => {
  assert.deepEqual(badgeFor({ kind: 'down', status: 'paused', phase: 'focus', remainingMs: 12 * MIN, phaseMs: 25 * MIN }, T0), { text: '12', color: COLORS.grey });
  assert.equal(badgeFor({ kind: 'down', status: 'idle' }, T0).text, '');
  assert.equal(badgeFor(null, T0).text, '');
  const up = { kind: 'up', status: 'running', startedAt: T0, elapsedMs: 10 * MIN };
  assert.deepEqual(badgeFor(up, T0 + 32 * MIN), { text: '42', color: COLORS.cyan });
});

test('المنبّهات: تحديث كل نصف دقيقة ومنبّه الانتهاء أثناء العدّ فقط', () => {
  assert.deepEqual(alarmsFor(run(10 * MIN)).map((a) => a.name), ['bukur-tick', 'bukur-end']);
  assert.equal(alarmsFor(run(10 * MIN))[1].info.when, T0 + 10 * MIN);
  assert.deepEqual(alarmsFor({ kind: 'up', status: 'running', startedAt: T0, elapsedMs: 0 }).map((a) => a.name), ['bukur-tick']);
  assert.deepEqual(alarmsFor({ kind: 'down', status: 'paused' }), []);
});
