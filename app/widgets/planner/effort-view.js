// عرض «الجهد» (فكرة المالك): صف لكل مهمة، وعمود لكل يوم، وفوقها مراحل ٨–١٨–٢٨ بأطوالها الحقيقية
// (الختام يوم إلى أربعة أيام لا خانة مساوية للانطلاق). أمام المهمة في أيام مداها مربّع متعدد الضغطات كمتتبّع العادات.
import { tip } from '../../icons.js';
import { arcPath } from '../habits/habits.js';
import { addDays, cycleStation, diffDays, parse } from './plan.js';
import { dayLoad, effortOn, fmtEffort, inTask, phaseLoads, taskEffort } from './effort.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LABEL = { 1: 'يوم كامل', 0.5: 'نصف', [1 / 3]: 'ثلث', 0.25: 'ربع' };

function ring(frac, color) {
  const p = arcPath(frac);
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="#d9ccb6" stroke-width="1.2"/>${p ? `<path d="${p}" fill="${color}"/>` : ''}</svg>`;
}

/**
 * tasks: مهام النطاق (بعد الفرز) · r: {start, end} · opts: {today, weekend[], balanceDay, colorOf(t), DOW1[]}
 */
export function effortView(tasks, r, { today, weekend = [], balanceDay = null, colorOf, DOW1 }) {
  const n = diffDays(r.start, r.end) + 1;
  const days = Array.from({ length: n }, (_, i) => addDays(r.start, i));
  const list = tasks.filter((t) => t.start && t.end && t.start <= r.end && t.end >= r.start);
  const phases = phaseLoads(list, r);
  const col = (k) => diffDays(r.start, k) + 2; // العمود ١ لاسم المهمة
  const cls = (k) => {
    const d = parse(k).getDay();
    const st = cycleStation(k);
    return `${k === today ? ' ef-now' : ''}${weekend.includes(d) ? ' ef-wk' : ''}${balanceDay != null && d === Number(balanceDay) ? ' ef-bal' : ''}${st ? ' ef-st' : ''}`;
  };
  const band = phases.map((p) => `<div class="ef-phase" style="grid-column:${col(p.start)} / span ${p.days};--c:${p.color}" ${tip(`${p.label} ${p.from}: ${p.days} أيام · المبذول ${fmtEffort(p.effort)} يوم-جهد · المخطَّط ${p.planned} يوم-مهمة`)}>
      <b>${p.label} ${p.from}</b><small>${fmtEffort(p.effort)} / ${p.days}</small></div>`).join('');
  const head = days.map((k) => {
    const st = cycleStation(k);
    return `<div class="ef-day${cls(k)}" style="grid-column:${col(k)}${st ? `;--st:${st.color}` : ''}" data-day="${k}"><b>${parse(k).getDate()}</b><s>${DOW1[parse(k).getDay()]}</s></div>`;
  }).join('');
  const rows = list.map((t, i) => {
    const c = colorOf(t);
    const cells = days.map((k) => {
      if (!inTask(t, k)) return `<i class="ef-off${cls(k)}" style="grid-column:${col(k)}"></i>`;
      const f = effortOn(t, k);
      return `<button type="button" class="ef-cell${cls(k)}" style="grid-column:${col(k)}" data-eff="${esc(t.id)}" data-k="${k}" aria-label="${esc(t.name)} — ${parse(k).getDate()}: ${LABEL[f] ?? 'فارغ'}" ${tip(`${t.name} · ${parse(k).getDate()}: ${LABEL[f] ?? 'فارغ'} — اضغط: كامل ← ½ ← ⅓ ← ¼ ← فارغ`)}>${ring(f, c)}</button>`;
    }).join('');
    return `<div class="ef-name" style="grid-row:${i + 3};--c:${c}"><button type="button" data-task="${esc(t.id)}">${esc(t.name)}</button><small>${fmtEffort(taskEffort(t, r))} يوم · ${t.progress}٪</small></div>
      <div class="ef-row" style="grid-row:${i + 3}">${cells}</div>`;
  }).join('');
  const loadRow = days.map((k) => {
    const l = dayLoad(list, k);
    return `<div class="ef-load${cls(k)}" style="grid-column:${col(k)};--h:${Math.min(1, l / 2) * 100}%" ${tip(`حِمل ${parse(k).getDate()}: ${fmtEffort(l)} يوم-جهد`)}><i></i><small>${l ? fmtEffort(l) : ''}</small></div>`;
  }).join('');
  return `<div class="ef" style="--n:${n}">
    <div class="ef-grid" style="grid-template-columns:minmax(110px,160px) repeat(${n}, minmax(18px,1fr))">
      <div class="ef-corner" style="grid-row:1 / span 2">المهمة</div>
      <div class="ef-bandrow" style="grid-row:1">${band}</div>
      <div class="ef-headrow" style="grid-row:2">${head}</div>
      ${rows || `<p class="pl-empty" style="grid-column:1 / -1;grid-row:3">لا مهام بمواعيد في هذا النطاق — أضف مهمة أو اسحب من «لاحقاً».</p>`}
      <div class="ef-name ef-total" style="grid-row:${list.length + 3 || 4}">حِمل اليوم</div>
      <div class="ef-row" style="grid-row:${list.length + 3 || 4}">${loadRow}</div>
    </div>
  </div>`;
}
