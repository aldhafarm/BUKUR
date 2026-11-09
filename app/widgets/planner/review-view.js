// لوحة مراجعات الشهر (٨–١٨–٢٨): ثلاث صفحات من دفتر البكور، وفي مراجعة ١٨ وختام ٢٨ أرقامٌ حيّة من المخطط
// (إنجاز مهام الشهر، ودرجات أهداف المشاريع مقابل حد الرضا) — فلا تُكتب النسبة يدوياً.
import { icon, tip } from '../../icons.js';
import { MONTHS } from './plan.js';
import { STAGES, STAGE_IDS, monthOf, reviewOf, stageFill } from './reviews.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** الأرقام الحيّة: {monthProgress, tasksTotal, tasksDone, projects:[{name, score, threshold, status, goals:[{name, progress, weight}]}]} */
function autoBox(auto) {
  const meter = (p, c = 'var(--green-700)') => `<span class="pl-meter" style="--p:${p ?? 0}%;--c:${c}"><i></i></span>`;
  const proj = auto.projects.map((p) => `<li class="${p.status}">
      <b>${esc(p.name)}</b><em ${tip(`الحد الأدنى للرضا ${p.threshold}٪`)}>${p.score}٪ <small>/ ${p.threshold}٪</small></em>
      ${meter(p.score, p.status === 'met' ? 'var(--green-700)' : '#d97706')}
      <ul>${p.goals.map((g) => `<li><span>${esc(g.name)} <small>(${Math.round(g.weight * 10) / 10}٪)</small></span><em>${g.progress == null ? '—' : `${g.progress}٪`}</em></li>`).join('')}</ul>
    </li>`).join('');
  return `<div class="pl-rvauto">
    <div class="pl-rvsum">${icon('fact_check')}<b>مهام الشهر</b><em>${auto.monthProgress == null ? '—' : `${auto.monthProgress}٪`}</em><small>${auto.tasksDone} من ${auto.tasksTotal} مكتملة</small>${meter(auto.monthProgress)}</div>
    ${proj ? `<ul class="pl-rvproj">${proj}</ul>` : '<p class="pl-empty">لا مشاريع بأهداف بعد — نسب الأهداف تظهر هنا تلقائياً.</p>'}
  </div>`;
}

function field(f, v) {
  const a = `data-rv="${f.id}" aria-label="${esc(f.label)}"`;
  if (f.type === 'scale') {
    return `<label class="pl-rvscale">${esc(f.label)}<select ${a}><option value="">—</option>${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${v === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'long') return `<label class="pl-rvlong">${esc(f.label)}<textarea ${a} rows="2" maxlength="2000">${esc(v ?? '')}</textarea></label>`;
  return `<label>${esc(f.label)}<input ${a} maxlength="200" value="${esc(v ?? '')}"></label>`;
}

/** اللوحة كاملة لشهر mk وصفحته stage. */
export function reviewPanel(reviews, mk, stage, auto) {
  const d = monthOf(mk);
  const st = STAGES[stage];
  const page = reviewOf(reviews, mk, stage);
  return `<div class="pl-review" style="--rv:${st.color}">
    <div class="pl-rvhead">
      ${icon('rate_review')}<b>مراجعة ${MONTHS[d.getMonth()]} ${d.getFullYear()}</b>
      <button type="button" class="pl-btn" data-act="rv-prev" ${tip('الشهر السابق')}>${icon('chevron_right')}</button>
      <button type="button" class="pl-btn" data-act="rv-next" ${tip('الشهر التالي')}>${icon('chevron_left')}</button>
      <button type="button" class="pl-btn" data-act="rv-close" ${tip('إغلاق المراجعة')}>${icon('close')}</button>
    </div>
    <div class="pl-rvtabs" role="tablist">${STAGE_IDS.map((id) => {
      const fill = stageFill(reviews, mk, id);
      return `<button type="button" role="tab" data-rvstage="${id}" aria-selected="${id === stage}" style="--c:${STAGES[id].color}" ${tip(`${STAGES[id].en} — معبّأة ${fill}٪`)}>${STAGES[id].label}${fill ? `<em>${fill === 100 ? '✓' : `${fill}٪`}</em>` : ''}</button>`;
    }).join('')}</div>
    ${st.auto ? autoBox(auto) : ''}
    <div class="pl-rvform">${st.fields.map((f) => field(f, page[f.id])).join('')}</div>
  </div>`;
}
