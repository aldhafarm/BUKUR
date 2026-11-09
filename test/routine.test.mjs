// الروتين اليومي: النوم يحدّد الاستيقاظ، والكتل تعبر منتصف الليل، والمجموع ٢٤ ساعة، وسجل النوم كعادة.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MASTER_TEMPLATE, allBlocks, blockAt, cycleSleep, fromMin, leftIn, sleepBlock, sleepScore, span, toMin, totals } from '../app/widgets/routine/routine.js';

test('الوقت: تحويل، ومدة تعبر منتصف الليل، وصيغة خاطئة', () => {
  assert.equal(toMin('22:30'), 1350);
  assert.equal(toMin('24:00'), null);
  assert.equal(toMin('7'), null);
  assert.equal(fromMin(1500), '01:00');
  assert.equal(span('22:00', '05:30'), 450);
});

test('النوم: موعد النوم + الساعات = الاستيقاظ، محصوراً بين ٤ و١٢ ساعة', () => {
  assert.deepEqual(sleepBlock('22:00', 7.5), { id: 'sleep', name: 'نوم', cat: 'sleep', start: '22:00', end: '05:30', fixed: true });
  assert.equal(sleepBlock('23:00', 2).end, '03:00');   // ٤ ساعات حدّاً أدنى
  assert.equal(sleepBlock('bad', 20).start, '22:00');  // افتراضي ٢٢:٠٠، و١٢ حدّاً أعلى
  assert.equal(sleepBlock('bad', 20).end, '10:00');
});

test('الكتل مرتّبة من الاستيقاظ، والكتلة الحالية والمتبقي فيها', () => {
  const st = { bed: '22:00', sleepHours: 5.5, blocks: MASTER_TEMPLATE };
  const bs = allBlocks(st);
  assert.equal(bs[0].cat, 'sleep');
  assert.equal(bs[1].name, 'تأليف'); // أول كتلة بعد الاستيقاظ ٠٣:٣٠
  const now = blockAt(bs, toMin('10:15'));
  assert.equal(now.name, 'عمل');
  assert.equal(leftIn(now, toMin('10:15')), 285); // حتى ١٥:٠٠
  assert.equal(blockAt(bs, toMin('17:45')), null); // بين القيلولة والإنتاج: وقت حرّ
  assert.equal(blockAt(bs, toMin('01:00')).cat, 'sleep');
});

test('المجموع ٢٤ ساعة: لكل فئة، والحرّ، والتداخل', () => {
  const t = totals(allBlocks({ bed: '22:00', sleepHours: 5.5, blocks: MASTER_TEMPLATE }));
  const sum = Object.values(t.byCat).reduce((a, b) => a + b, 0) + t.free;
  assert.equal(sum, 1440);
  assert.equal(t.byCat.sleep, 330 + 90); // نوم ٥.٥ + قيلولة ١.٥
  assert.equal(t.byCat.primary, 360);
  assert.equal(t.free, 30);              // ١٧:٣٠–١٨:٠٠
  assert.equal(t.overlap, 0);
  const o = totals(allBlocks({ bed: '22:00', sleepHours: 8, blocks: [{ name: 'سهر', cat: 'other', start: '23:00', end: '00:00' }] }));
  assert.equal(o.overlap, 60);
});

test('سجل النوم كعادة: الضغطات، والالتزام في آخر ٧ أيام', () => {
  let log = cycleSleep({}, '2026-11-09');
  assert.equal(log['2026-11-09'], 1);
  log = cycleSleep(log, '2026-11-08'); log = cycleSleep(log, '2026-11-08'); // ½
  assert.equal(sleepScore(log, '2026-11-09'), Math.round((1.5 / 7) * 100));
  for (let i = 0; i < 4; i++) log = cycleSleep(log, '2026-11-09'); // يعود فارغاً
  assert.equal('2026-11-09' in log, false);
});
