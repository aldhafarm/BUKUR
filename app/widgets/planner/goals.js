// الأهداف ومؤشرات القياس (طلب المالك): مشروع ← أهداف موزونة ← قياس لكل هدف.
// • أوزان الأهداف مجموعها ١٠٠٪ دائماً: الهدف بلا وزن محدَّد يتقاسم الباقي بالتساوي (١٠ أهداف ← ١٠٪ لكلٍّ).
// • إنجاز المشروع = Σ (إنجاز الهدف × وزنه)، ويُقارن بالحد الأدنى للرضا (٧٠٪ افتراضاً).
// • قياس الهدف ثلاثة أنواع: رقم (من بداية إلى مستهدف)، أو تمّ/لم يتم، أو من مهامه المرتبطة به.
const clamp = (x, a = 0, b = 100) => Math.min(b, Math.max(a, x));
const num = (x, d) => (Number.isFinite(Number(x)) && x !== '' && x != null ? Number(x) : d);

export const GOAL_KINDS = { number: 'رقم', done: 'تمّ/لم يتم', tasks: 'من المهام' };

/** هدف سليم. weight = null يعني «تلقائي» (يتقاسم الباقي). */
export function makeGoal({ name, project, kind = 'number', weight = null, baseline = 0, target = 100, current = null, unit = '' }, id) {
  const k = GOAL_KINDS[kind] ? kind : 'number';
  const w = weight === '' || weight == null ? null : clamp(Math.round(num(weight, 0)));
  const b = num(baseline, 0);
  return { id, project, name: String(name ?? '').trim() || 'هدف', kind: k, weight: w, baseline: b, target: num(target, 100),
    current: k === 'done' ? (current === true || current === 1 || current === '1' || current === 'on' ? 1 : 0) : num(current, b), unit: String(unit ?? '').trim().slice(0, 12) };
}

export const goalsOf = (goals, projectId) => (goals ?? []).filter((g) => g.project === projectId);

/**
 * الأوزان الفعلية: المحدَّد كما هو، والتلقائي يتقاسم (١٠٠ − مجموع المحدَّد) بالتساوي.
 * ok = المجموع ١٠٠ بالضبط؛ وإلا msg يشرح (زيادة أو نقص).
 */
export function effectiveWeights(goals) {
  const fixed = goals.filter((g) => g.weight != null).reduce((a, g) => a + g.weight, 0);
  const autos = goals.filter((g) => g.weight == null);
  const share = autos.length ? Math.max(0, 100 - fixed) / autos.length : 0;
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight ?? share]));
  const total = Math.round(Object.values(weights).reduce((a, w) => a + w, 0) * 100) / 100;
  const ok = !goals.length || Math.abs(total - 100) < 0.01;
  const msg = ok ? '' : total > 100 ? `الأوزان ${total}٪ — زادت ${Math.round((total - 100) * 100) / 100}٪ عن ١٠٠٪` : `الأوزان ${total}٪ — ينقصها ${Math.round((100 - total) * 100) / 100}٪`;
  return { weights, total, ok, msg };
}

/** أوزان متساوية (كلها تلقائية). */
export const equalize = (goals) => goals.map((g) => ({ ...g, weight: null }));

/** إنجاز الهدف (٠–١٠٠) أو null إن لم يكن قابلاً للقياس بعد (هدف مهام بلا مهام). */
export function goalProgress(goal, tasks = []) {
  if (goal.kind === 'done') return goal.current ? 100 : 0;
  if (goal.kind === 'tasks') {
    let w = 0, sum = 0;
    for (const t of tasks) {
      if (t.goal !== goal.id) continue;
      const days = t.start && t.end ? Math.round((new Date(t.end) - new Date(t.start)) / 864e5) + 1 : 1;
      w += days; sum += days * (t.progress ?? 0);
    }
    return w ? Math.round(sum / w) : null;
  }
  const span = goal.target - goal.baseline; // سالب = المطلوب خفض الرقم (تكلفة، أخطاء…)
  if (!span) return goal.current === goal.target ? 100 : 0;
  return Math.round(clamp(((goal.current - goal.baseline) / span) * 100));
}

/**
 * درجة المشروع من أهدافه: Σ إنجاز × وزن ÷ ١٠٠ (الهدف غير المقيس يُحسب صفراً).
 * status: met (≥ الحد الأدنى للرضا) أو below؛ و null إن لم تكن للمشروع أهداف.
 */
export function projectScore(project, goals, tasks = []) {
  const gs = goalsOf(goals, project.id);
  if (!gs.length) return null;
  const { weights, total, ok, msg } = effectiveWeights(gs);
  const rows = gs.map((g) => ({ goal: g, weight: weights[g.id], progress: goalProgress(g, tasks) }));
  // إن لم يكن مجموع الأوزان ١٠٠ (والتنبيه ظاهر) تُقسم على المجموع الفعلي، فلا تتجاوز الدرجة ١٠٠٪
  const score = total ? Math.round(rows.reduce((a, r) => a + (r.progress ?? 0) * r.weight, 0) / total) : 0;
  const threshold = project.threshold ?? 70;
  return { score, threshold, status: score >= threshold ? 'met' : 'below', rows, weightsOk: ok, msg };
}
