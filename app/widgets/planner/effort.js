// الجهد اليومي لكل مهمة (فكرة المالك): أمام المهمة في كل يوم من مداها مربّعٌ متعدد الضغطات كمتتبّع العادات —
// ضغطة: يوم كامل · ثم ½ · ⅓ · ¼ · ثم فارغ. فيظهر توزيع الجهد الفعلي على أيام الشهر ومراحل ٨–١٨–٢٨ بأطوالها الحقيقية.
// التخزين: task.effort = { 'YYYY-MM-DD': مستوى } — المستوى موضعٌ في LEVELS (كالعادات تماماً).
import { LEVELS, fractionOf, nextLevel } from '../habits/habits.js';
import { CYCLE, addDays, diffDays, segmentsOf } from './plan.js';

export { LEVELS, fractionOf };

/** هل اليوم داخل مدى المهمة؟ */
export const inTask = (t, k) => Boolean(t.start && t.end && t.start <= k && k <= t.end);

/** الضغطة التالية على مربّع المهمة في يوم (خارج مداها: لا تغيير). */
export function cycleEffort(task, k) {
  if (!inTask(task, k)) return task;
  const lvl = nextLevel(task.effort?.[k]);
  const effort = { ...(task.effort ?? {}) };
  if (lvl) effort[k] = lvl; else delete effort[k];
  return { ...task, effort };
}

export const effortOn = (task, k) => fractionOf(task.effort?.[k]);

/** مجموع جهد المهمة (أيام-جهد) في نطاق، أو كلها. */
export function taskEffort(task, r = null) {
  return Object.entries(task.effort ?? {}).filter(([k]) => !r || (r.start <= k && k <= r.end)).reduce((a, [, l]) => a + fractionOf(l), 0);
}

/** حِمل اليوم: مجموع جهد المهام فيه. */
export const dayLoad = (tasks, k) => tasks.reduce((a, t) => a + effortOn(t, k), 0);

/**
 * حِمل كل مرحلة من مراحل ٨–١٨–٢٨ داخل نطاق: {phase, label, color, start, end, days, effort, planned}.
 * planned: أيام-مهام مجدولة في المرحلة (كل مهمة تمسّ اليوم = ١) — «المخطَّط» مقابل «المبذول».
 */
export function phaseLoads(tasks, r) {
  return segmentsOf('cycle', r.start, r.end).map((seg) => {
    const c = CYCLE.find((x) => x.id === seg.phase);
    const days = diffDays(seg.start, seg.end) + 1;
    let effort = 0, planned = 0;
    for (let i = 0; i < days; i++) {
      const k = addDays(seg.start, i);
      effort += dayLoad(tasks, k);
      planned += tasks.filter((t) => inTask(t, k)).length;
    }
    return { phase: seg.phase, label: c.label, from: c.from, color: c.color, start: seg.start, end: seg.end, days, effort, planned };
  });
}

/** عرض الكسر مختصراً بأرقام المخطط نفسها (1، ½، ⅓، ¼، 2½، 1.2 …). */
export function fmtEffort(x) {
  const n = Math.round(x * 100) / 100;
  if (!n) return '0';
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  const sym = Math.abs(frac - 0.5) < 0.01 ? '½' : Math.abs(frac - 1 / 3) < 0.01 ? '⅓' : Math.abs(frac - 0.25) < 0.01 ? '¼' : '';
  if (sym || frac < 0.001) return `${whole || ''}${sym}`;
  return String(Math.round(n * 10) / 10);
}
