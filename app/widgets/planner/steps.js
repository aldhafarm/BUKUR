// الخطوات (سلّم المالك: رؤية ← خطة عشرية ← مشروع ← هدف ← مهمة ← **خطوة** ← كتلة في اليوم):
// تحت المهمة الرئيسية (المقرّر) خطواتٌ تكميلية (الواجبات والاختبارات…). إن وُجدت خطوات صارت نسبة المهمة منها تلقائياً.
// التخزين: task.steps = [{ id, name, done, due? }].

const clean = (s, n = 80) => String(s ?? '').trim().slice(0, n);

/** نسبة المهمة من خطواتها (٠–١٠٠) أو null إن لم تكن لها خطوات. */
export function stepsProgress(task) {
  const st = task.steps ?? [];
  return st.length ? Math.round((st.filter((x) => x.done).length / st.length) * 100) : null;
}
/** يضبط progress من الخطوات إن وُجدت (وإلا يتركها كما هي). */
export function syncProgress(task) {
  const p = stepsProgress(task);
  return p == null ? task : { ...task, progress: p };
}

export function addStep(task, name, id, due = null) {
  const n = clean(name);
  if (!n) return task;
  const step = { id, name: n, done: false, ...(due ? { due } : {}) };
  return syncProgress({ ...task, steps: [...(task.steps ?? []), step] });
}
export const toggleStep = (task, id) => syncProgress({ ...task, steps: (task.steps ?? []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)) });
export function removeStep(task, id) {
  const steps = (task.steps ?? []).filter((x) => x.id !== id);
  const t = { ...task, steps };
  if (!steps.length) delete t.steps; // بلا خطوات: تعود النسبة يدوية (تبقى قيمتها الأخيرة)
  return syncProgress(t);
}

/**
 * حفظ المحرّر: النموذج يعيد بناء المهمة من حقوله فقط، فتُنقل إليها البيانات التي لا يحملها النموذج
 * (سجل الجهد اليومي، والخطوات). إصلاح: كان حفظ المهمة يمحو سجل الجهد.
 */
export function keepExtras(prev, next) {
  const out = { ...next };
  if (prev?.effort) out.effort = prev.effort;
  if (prev?.steps?.length) out.steps = prev.steps;
  return syncProgress(out);
}

/** عدّ للعرض: «٢/٥» أو ''. */
export const stepsLabel = (task) => (task.steps?.length ? `${task.steps.filter((x) => x.done).length}/${task.steps.length}` : '');
