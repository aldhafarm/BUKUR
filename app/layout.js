// حالة التخطيط — دوال نقية تُختبر بلا متصفح: الترتيب، الإخفاء، الطي، الحجم.

/** يوفّق الترتيب المحفوظ مع الودجات المتاحة: يحذف المختفي من السجل ويضيف الجديد في الآخر. */
export function reconcileOrder(saved, ids) {
  const known = (saved ?? []).filter((id) => ids.includes(id));
  return [...known, ...ids.filter((id) => !known.includes(id))];
}

/** ينقل id ليصبح قبل target (أو في الآخر إن كان target فارغاً). */
export function moveBefore(order, id, target) {
  if (id === target) return order;
  const rest = order.filter((x) => x !== id);
  const i = target ? rest.indexOf(target) : -1;
  return i === -1 ? [...rest, id] : [...rest.slice(0, i), id, ...rest.slice(i)];
}

/** ينقل id خطوة للأعلى (-1) أو للأسفل (+1) — بديل لوحة المفاتيح للسحب. */
export function moveBy(order, id, step) {
  const i = order.indexOf(id);
  const j = i + step;
  if (i === -1 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** الحجم التالي في دورة الأحجام المسموحة. */
export function nextSize(sizes, current) {
  const i = sizes.indexOf(current);
  return sizes[(i + 1) % sizes.length];
}

/** عرض البطاقة في الشبكة: ١ عمود ← ٢ عمودان ← ٣ كامل العرض ← ١. */
export const WIDTH_LABEL = { 1: 'عمود واحد', 2: 'عمودان', 3: 'كامل العرض' };
export const nextWidth = (w) => ((Number(w) || 1) % 3) + 1;
export const widthOf = (saved, fallback = 1) => ([1, 2, 3].includes(Number(saved)) ? Number(saved) : fallback);

export const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
