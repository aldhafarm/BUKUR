// المشاريع (هيكلة المالك): مشروع ← خطته (مخطط جانت) ← مهامه.
// • الاهتمامات وسوم على المشروع للفرز فقط (عمل، شخصي، أسرة…) — هي التصنيفات السابقة، انتقلت من المهمة إلى المشروع.
// • الأرشيف: المشروع المنتهي يخرج من التخطيط الجاري إلى قائمة الأرشيف، ويُسترجع متى شئت.
// • المهمة بلا مشروع تبقى «مهمة حرّة» باهتمامها القديم (توافق مع ما قبل المشاريع).
import { CATEGORIES } from './plan.js';

export const INTERESTS = CATEGORIES; // الاسم الجديد للتصنيفات
const INT = Object.fromEntries(INTERESTS.map((c) => [c.id, c]));

/** مشروع سليم: اسم، واهتمامات معروفة فقط (بلا تكرار)، وحالة نشط/مؤرشف. */
export function makeProject({ name, interests = [], status = 'active', archivedAt = null }, id) {
  const tags = [...new Set((Array.isArray(interests) ? interests : [interests]).filter((x) => INT[x]))];
  return { id, name: String(name ?? '').trim() || 'مشروع', interests: tags, status: status === 'archived' ? 'archived' : 'active', archivedAt: status === 'archived' ? archivedAt : null };
}

export const projectOf = (task, projects) => (task?.project ? (projects ?? []).find((p) => p.id === task.project) ?? null : null);

/** اهتمامات المهمة: اهتمامات مشروعها، وإلا اهتمامها القديم (مهام ما قبل المشاريع). */
export function interestsOf(task, projects) {
  const p = projectOf(task, projects);
  if (p) return p.interests;
  return task.category ? [task.category] : [];
}

/** لون المهمة: لون أول اهتمام لمشروعها، وإلا لونها القديم. */
export function taskColor(task, projects) {
  const first = interestsOf(task, projects)[0];
  return INT[first]?.color ?? task.color ?? '#3b82c4';
}

export const isArchived = (task, projects) => projectOf(task, projects)?.status === 'archived';

/**
 * المهام المعروضة: تُستبعد مهام المشاريع المؤرشفة (إلا حين نعرض المشروع المؤرشف نفسه)،
 * ويُطبَّق فرز الاهتمامات (مهمة تظهر إن كان لها اهتمام واحد ظاهر على الأقل، أو لا اهتمام لها)،
 * وفرز المشروع المختار.
 */
export function filterTasks(tasks, projects, { hidden = [], project = null } = {}) {
  return (tasks ?? []).filter((t) => {
    if (project) return t.project === project;
    if (isArchived(t, projects)) return false;
    const ints = interestsOf(t, projects);
    return !ints.length || ints.some((i) => !hidden.includes(i));
  });
}

export const tasksOfProject = (tasks, id) => (tasks ?? []).filter((t) => t.project === id);

/** مدى المشروع: من أبكر بداية إلى أبعد نهاية بين مهامه المجدولة (null إن لم تُجدول). */
export function projectRange(tasks, id) {
  const ts = tasksOfProject(tasks, id).filter((t) => t.start && t.end);
  if (!ts.length) return null;
  return { start: ts.reduce((m, t) => (t.start < m ? t.start : m), ts[0].start), end: ts.reduce((m, t) => (t.end > m ? t.end : m), ts[0].end) };
}

/** إنجاز المشروع: متوسط نسب مهامه موزوناً بمددها (المهمة بلا موعد يوماً واحداً). */
export function projectProgress(tasks, id) {
  let w = 0, sum = 0;
  for (const t of tasksOfProject(tasks, id)) {
    const days = t.start && t.end ? Math.round((new Date(t.end) - new Date(t.start)) / 864e5) + 1 : 1;
    w += days; sum += days * (t.progress ?? 0);
  }
  return w ? Math.round(sum / w) : null;
}

export const activeProjects = (projects) => (projects ?? []).filter((p) => p.status !== 'archived');
export const archivedProjects = (projects) => (projects ?? []).filter((p) => p.status === 'archived').sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
export const archive = (p, day) => ({ ...p, status: 'archived', archivedAt: day });
export const restore = (p) => ({ ...p, status: 'active', archivedAt: null });

/** عدد المشاريع النشطة لكل اهتمام — يظهر على أزرار الفرز. */
export function countByInterest(projects) {
  const out = Object.fromEntries(INTERESTS.map((c) => [c.id, 0]));
  for (const p of activeProjects(projects)) for (const i of p.interests) out[i] += 1;
  return out;
}
