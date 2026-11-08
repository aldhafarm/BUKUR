// اختبارات المشاريع: مشروع ← خطة (جانت) ← مهام، والاهتمامات وسوم للفرز، والأرشيف.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTask } from '../app/widgets/planner/plan.js';
import {
  INTERESTS, activeProjects, archive, archivedProjects, countByInterest, filterTasks, interestsOf, makeProject,
  projectProgress, projectRange, restore, taskColor, tasksOfProject,
} from '../app/widgets/planner/projects.js';

const phd = makeProject({ name: ' رسالة الدكتوراه ', interests: ['study', 'work', 'study', 'nope'] }, 'P1');
const farm = makeProject({ name: 'مزرعة العائلة', interests: ['farm', 'family'] }, 'P2');
const t = (o, id) => ({ ...makeTask(o, id), project: o.project });
const tasks = [
  t({ name: 'مراجعة الأدبيات', start: '2026-11-01', end: '2026-11-10', progress: 100, project: 'P1' }, 'a'),
  t({ name: 'التحليل', start: '2026-11-11', end: '2026-11-30', progress: 25, project: 'P1' }, 'b'),
  t({ name: 'زراعة الشتلات', start: '2026-12-01', end: '2026-12-05', progress: 0, project: 'P2' }, 'c'),
  { ...makeTask({ name: 'قديمة', start: '2026-11-03', end: '2026-11-03', category: 'health' }, 'd') },   // مهمة حرّة قبل المشاريع
];

test('المشروع: اسم مهذّب، واهتمامات معروفة بلا تكرار، ونشط افتراضاً', () => {
  assert.deepEqual([phd.name, phd.interests, phd.status], ['رسالة الدكتوراه', ['study', 'work'], 'active']);
  assert.equal(INTERESTS.length, 6);
});

test('اهتمامات المهمة ولونها من مشروعها، والمهمة الحرّة باهتمامها القديم', () => {
  const ps = [phd, farm];
  assert.deepEqual(interestsOf(tasks[0], ps), ['study', 'work']);
  assert.deepEqual(interestsOf(tasks[3], ps), ['health']);
  assert.equal(taskColor(tasks[2], ps), INTERESTS.find((c) => c.id === 'farm').color);
});

test('الخطة: مدى المشروع من مهامه، وإنجازه موزوناً بالأيام', () => {
  assert.deepEqual(projectRange(tasks, 'P1'), { start: '2026-11-01', end: '2026-11-30' });
  assert.equal(projectProgress(tasks, 'P1'), 50);              // (١٠×١٠٠ + ٢٠×٢٥) ÷ ٣٠
  assert.equal(projectRange(tasks, 'P9'), null);
  assert.deepEqual(tasksOfProject(tasks, 'P2').map((x) => x.id), ['c']);
});

test('الفرز بالاهتمام: مهمة المشروع تظهر إن ظهر أحد اهتماماته، والمشروع المختار وحده', () => {
  const ps = [phd, farm];
  assert.deepEqual(filterTasks(tasks, ps, { hidden: ['study'] }).map((x) => x.id), ['a', 'b', 'c', 'd']); // P1 ما زال «عمل»
  assert.deepEqual(filterTasks(tasks, ps, { hidden: ['study', 'work'] }).map((x) => x.id), ['c', 'd']);
  assert.deepEqual(filterTasks(tasks, ps, { project: 'P2' }).map((x) => x.id), ['c']);
  assert.deepEqual(countByInterest(ps), { work: 1, study: 1, personal: 0, health: 0, family: 1, farm: 1 });
});

test('الأرشيف: المشروع المنتهي يخرج من التخطيط الجاري، ويُعرض وحده عند فتحه، ويُسترجع', () => {
  const done = archive(farm, '2026-12-06');
  const ps = [phd, done];
  assert.deepEqual([activeProjects(ps).map((p) => p.id), archivedProjects(ps).map((p) => p.id)], [['P1'], ['P2']]);
  assert.deepEqual(filterTasks(tasks, ps).map((x) => x.id), ['a', 'b', 'd']);                 // مهام المؤرشف مخفية
  assert.deepEqual(filterTasks(tasks, ps, { project: 'P2' }).map((x) => x.id), ['c']);        // لكن تُعرض عند فتحه
  assert.equal(countByInterest(ps).farm, 0);
  assert.deepEqual([restore(done).status, restore(done).archivedAt], ['active', null]);
});
