// اختبارات حسابات الساعة — كل اختبار يثبت سلوكاً من الساعة الأصلية (index.html).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hourDegrees, minuteDegrees, secondDegrees, wakeHourFromBezel, hoursAwake, bezelForTime,
  awakeStatus, formatHM, formatDuration, isNightHour, angleDelta, rotate,
} from '../app/widgets/bukur-clock/time.js';

test('العقارب: قرص ٢٤ ساعة — الساعة ١٥° والدقيقة ٦°', () => {
  assert.equal(hourDegrees(0, 0), 0);
  assert.equal(hourDegrees(12, 0), 180);
  assert.equal(hourDegrees(6, 30), 97.5);
  assert.equal(minuteDegrees(15, 30), 93);
  assert.equal(secondDegrees(45), 270);
});

test('«استيقظت الآن» يجعل وقت الاستيقاظ = الآن، واليقظة = صفر', () => {
  for (const [h, m] of [[5, 0], [6, 45], [0, 0], [23, 59], [13, 7]]) {
    const rot = bezelForTime(h, m);
    assert.equal(formatHM(wakeHourFromBezel(rot)), `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    assert.ok(Math.abs(hoursAwake(h, m, rot)) < 1e-9, `يقظة صفر عند ${h}:${m}`);
  }
});

test('ساعات اليقظة: استيقظ ٥:٠٠ ← الساعة ١٣:٣٠ = ٨٫٥ ساعة، وعبر منتصف الليل', () => {
  const rot = bezelForTime(5, 0);
  assert.equal(hoursAwake(13, 30, rot), 8.5);
  const late = bezelForTime(20, 0);
  assert.equal(hoursAwake(2, 0, late), 6); // ٢٠:٠٠ ← ٠٢:٠٠
});

test('سلوك الأصل محفوظ: بعد ٢٤ ساعة يقظة تعود للصفر (قرار المالك: يُحسم لاحقاً)', () => {
  const rot = bezelForTime(5, 0);
  assert.equal(hoursAwake(5, 0, rot), 0);
});

test('الإطار عند الصفر (تصفير) يعني استيقاظاً عند ٠٠:٣٠', () => {
  assert.equal(formatHM(wakeHourFromBezel(0)), '00:30');
});

test('الحالة تتدرّج: نشيط < ١٢ ≤ فعّال < ١٦ ≤ متعب < ٢٠ ≤ نَم', () => {
  assert.equal(awakeStatus(11.99).level, 'fresh');
  assert.equal(awakeStatus(12).level, 'active');
  assert.equal(awakeStatus(16).level, 'tired');
  assert.equal(awakeStatus(20).level, 'sleep');
});

test('صيغ العرض', () => {
  assert.equal(formatHM(5.5), '05:30');
  assert.equal(formatDuration(8), '8س');
  assert.equal(formatDuration(8.5), '8س 30د');
});

test('الليل: ١٨–٠٦ و١٩–٠٥', () => {
  assert.equal(isNightHour(18, '18-06'), true);
  assert.equal(isNightHour(6, '18-06'), false);
  assert.equal(isNightHour(18, '19-05'), false);
  assert.equal(isNightHour(24, '19-05'), true);
});

test('سحب الإطار: أقصر طريق عند عبور ±١٨٠°، والزاوية تبقى ٠–٣٦٠', () => {
  assert.equal(angleDelta(170, -170), 20);
  assert.equal(angleDelta(-170, 170), -20);
  assert.equal(rotate(350, 20), 10);
  assert.equal(rotate(5, -10), 355);
});
