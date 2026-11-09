// اختبارات الأهداف ومؤشرات القياس: أوزان مجموعها ١٠٠٪، وقياس كل هدف، ودرجة المشروع مقابل حد الرضا.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject } from '../app/widgets/planner/projects.js';
import { effectiveWeights, equalize, goalProgress, makeGoal, projectScore } from '../app/widgets/planner/goals.js';

const P = makeProject({ name: 'الدكتوراه' }, 'P');
const g = (o, id) => makeGoal({ project: 'P', ...o }, id);

test('عشرة أهداف بلا أوزان ← ١٠٪ لكلٍّ، والمجموع ١٠٠', () => {
  const gs = Array.from({ length: 10 }, (_, i) => g({ name: `هدف ${i}` }, `g${i}`));
  const w = effectiveWeights(gs);
  assert.ok(Object.values(w.weights).every((x) => x === 10));
  assert.equal(w.total, 100); assert.ok(w.ok);
});

test('أوزان مخصّصة: المحدَّد يبقى، والتلقائي يتقاسم الباقي؛ والزيادة أو النقص يُنبَّه عليهما', () => {
  const gs = [g({ weight: 40 }, 'a'), g({ weight: 30 }, 'b'), g({}, 'c'), g({}, 'd')];
  assert.deepEqual(effectiveWeights(gs).weights, { a: 40, b: 30, c: 15, d: 15 });
  const over = effectiveWeights([g({ weight: 70 }, 'a'), g({ weight: 50 }, 'b')]);
  assert.equal(over.ok, false); assert.match(over.msg, /زادت 20/);
  const under = effectiveWeights([g({ weight: 30 }, 'a'), g({ weight: 50 }, 'b')]);
  assert.equal(under.ok, false); assert.match(under.msg, /ينقصها 20/);
  assert.ok(effectiveWeights(equalize([g({ weight: 70 }, 'a'), g({ weight: 50 }, 'b')])).ok);
  assert.equal(makeGoal({ weight: 150 }, 'x').weight, 100);
});

test('قياس الهدف: رقم (صعوداً ونزولاً ومحصوراً)، وتمّ/لم يتم، ومن المهام', () => {
  assert.equal(goalProgress(g({ baseline: 0, target: 120, current: 45 }, 'n')), 38);
  assert.equal(goalProgress(g({ baseline: 1000, target: 600, current: 800 }, 'down')), 50); // خفض التكلفة
  assert.equal(goalProgress(g({ baseline: 0, target: 10, current: 15 }, 'over')), 100);
  assert.equal(goalProgress(g({ kind: 'done', current: 'on' }, 'd')), 100);
  assert.equal(goalProgress(g({ kind: 'done' }, 'd2')), 0);
  const tasks = [
    { id: 1, goal: 't', start: '2026-11-01', end: '2026-11-03', progress: 100 }, // ٣ أيام
    { id: 2, goal: 't', start: null, end: null, progress: 0 },                      // يوم واحد
    { id: 3, goal: 'other', progress: 100 },
  ];
  assert.equal(goalProgress(g({ kind: 'tasks' }, 't'), tasks), 75);
  assert.equal(goalProgress(g({ kind: 'tasks' }, 'none'), tasks), null);
});

test('درجة المشروع موزونة، وتُقارن بالحد الأدنى للرضا (٧٠٪ افتراضاً)', () => {
  const goals = [
    g({ weight: 50, current: 100 }, 'a'),           // ١٠٠٪ × ٥٠
    g({ weight: 30, kind: 'done', current: 1 }, 'b'), // ١٠٠٪ × ٣٠
    g({ weight: 20, current: 0 }, 'c'),             // ٠٪
    makeGoal({ project: 'Q', current: 100 }, 'q'),  // مشروع آخر
  ];
  const r = projectScore(P, goals, []);
  assert.equal(r.score, 80); assert.equal(r.threshold, 70); assert.equal(r.status, 'met'); assert.equal(r.rows.length, 3);
  assert.equal(projectScore(makeProject({ name: 'x', threshold: 90 }, 'P'), goals).status, 'below');
  assert.equal(projectScore(makeProject({ name: 'بلا أهداف' }, 'Z'), goals), null);
  assert.equal(makeProject({ name: 'x', threshold: 140 }, 'T').threshold, 100);
  // أوزان مجموعها ١٢٠ (خطأ ظاهر): الدرجة تُقسم على المجموع فلا تتجاوز ١٠٠
  const bad = projectScore(P, [g({ weight: 60, current: 100 }, 'a'), g({ weight: 60, current: 100 }, 'b')]);
  assert.equal(bad.score, 100); assert.equal(bad.weightsOk, false);
});
