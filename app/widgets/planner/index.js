// «المخطط» (جانت) — طلب المالك: منظومة تخطيط تعرض المهام ونسب إنجازها داخل أي تقسيم للتقويم.
// زر واحد متعدد الضغطات يدور: سنة (شبكة ١٢ شهراً × ٣١ يوماً) ← موسم ← شهر ← أسبوع ← يوم.
// أنظمة المواسم كلها متاحة بزر ثانٍ: مواسم النجوم · الطوالع · الفصول الفلكية · أرباع السنة.
// المرحلة الأولى: مهام بمدة وتصنيف ونسبة إنجاز، وفرز بالتصنيف (كـ AnuCal)، و«لاحقاً» للمهام بلا موعد تُسحب إلى يوم؛ والخطط والأهداف (عشرية ← سنوية ← يومية) لاحقاً فوقها.
import { icon, tip } from '../../icons.js';
import {
  INTERESTS, activeProjects, archive, archivedProjects, filterTasks, interestsOf, makeProject, projectOf,
  projectProgress, projectRange, restore, taskColor,
} from './projects.js';
import { GOAL_KINDS, effectiveWeights, equalize, goalsOf, makeGoal, projectScore } from './goals.js';
import {
  CATEGORIES, MONTHS, SCOPE_LABEL, SYSTEMS, addDays, barFor, diffDays, key, makeTask, nextScope, nextSystem, parse, scopeFor, twoRanges, isWeekend, WEEKEND_PRESETS, DOW, undatedTasks, scheduleOn, unschedule, monthCells, GRID_PRESETS, PRESET_IDS, SPANS, UNITS, buildGrid, gridBars, colLabel, nextCols, nextRows, nextSpan, normalizeGrid, presetOf, shiftSpan,
  periodAt, rangeFor, rangeProgress, shift, tasksIn,
} from './plan.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const SCOPE_ICON = { year: 'grid_view', season: 'filter_vintage', month: 'calendar_view_month', week: 'calendar_view_week', day: 'calendar_view_day', months2: 'date_range', periods2: 'eco' };
const NARROW = typeof matchMedia === 'function' ? matchMedia('(max-width: 520px)') : { matches: false, addEventListener() {}, removeEventListener() {} }; // القائمة الجانبية
/** إعداد التقويم المبني من الحالة؛ الترتيبات القديمة (yearLayout) تُرحَّل إلى قوالبها. */
function gridOf(state) {
  const legacy = state.yearLayout === 'months' ? { ...GRID_PRESETS.date, months: true } : GRID_PRESETS[state.yearLayout];
  const g0 = state.grid ?? legacy ?? GRID_PRESETS.date;
  return { ...normalizeGrid(g0), months: Boolean(g0.months) };
}
// المشاريع الحالية (تُحدَّث في كل رسم) — لون المهمة من أول اهتمام لمشروعها
let currentProjects = [];
const colorOf = (t) => taskColor(t, currentProjects);
const DOW1 = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // حرف اليوم داخل خانة السنة (كـ AnuCal)

/** شريط مهمة: لونها، والجزء المنجز ممتلئ من بدايتها (اليمين). */
const bar = (t, b, extra = '') => `<button type="button" draggable="true" class="pl-task${b.clipStart ? ' cut-s' : ''}${b.clipEnd ? ' cut-e' : ''}" data-task="${esc(t.id)}"
  style="grid-column:${b.col + 1} / span ${b.span};--c:${colorOf(t)};--p:${Math.round(b.fill * 100)}%;${extra}" ${tip(`${t.name} · ${t.progress}٪ · ${t.start} ← ${t.end}`)}>
  <span>${b.span > 2 || b.wide ? esc(t.name) : ''}</span></button>`;

export default {
  id: 'planner',
  name: 'المخطط',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaultWidth: 2,
  defaults: { tasks: [], scope: 'month', anchor: null, system: 'star', hidden: [], lastCat: 'work', weekend: [5, 6], weekStart: 0, grid: null, view: 'cal', projects: [], project: null, lastProject: '', goals: [] }, // projects: المشاريع؛ project: المشروع المفتوح // view: تقويم أو جانت للشهر والموسم والأسبوع // grid: {span, rows, cols, months?} للتقويم المبني // hidden: تصنيفات مطفأة · weekend: أيام العطلة الرسمية

  mount(el, ctx) {
    const store = ctx.store;
    let editing = null; // معرّف المهمة المفتوحة للتعديل
    const today = () => key(new Date());
    const anchor = () => store.get().anchor ?? today();

    // خانة يوم: رقمه وحرفه، وظل العطلة، وخط لون الموسم، والأحمر لليوم.
    // bare: بلا رقم ولا حرف حين يكونان في رأس العمود (رقم اليوم، أو محاذاة يوم الأسبوع لصفوف غير الأسابيع) — طلب المالك
    function dayCell(s, d, t0, bare = false) {
      const k = key(d);
      const p = periodAt(s.system, k);
      const wk = s.weekend.includes(d.getDay()) ? ' pl-wkend' : '';
      const full = `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${p ? ` · ${p.name}` : ''}`;
      return `<i style="--s:${p?.color ?? 'transparent'}" class="${k === t0 ? 'pl-now' : ''}${wk}${bare ? ' pl-bare' : ''}" data-day="${k}" ${tip(full)}>${bare ? '' : `<b>${d.getDate()}</b><s>${DOW1[d.getDay()]}</s>`}</i>`;
    }

    // ── العارض العام: كل تقويم = فترة × صفوف × أعمدة (buildGrid). الخلية يوماً (رقم اليوم، يوم الأسبوع، أيام)
    // أو وحدة باسمها (شهر، منزلة، طالع…)، وأشرطة المهام تمتد على الخلايا التي تمسّها.
    function calView(s, range, t0, G = s.grid) {
      if (G.months) return yearMonthsView(s, parse(range.start).getFullYear(), t0);
      const g = buildGrid(range, G.rows, G.cols, { system: s.system, weekStart: s.weekStart });
      const dayCols = G.cols === 'dayNum' || G.cols === 'weekday' || G.cols === 'day';
      const bare = G.cols === 'dayNum' || (G.cols === 'weekday' && G.rows !== 'week');
      const fmt = (k) => `${parse(k).getDate()} ${MONTHS[parse(k).getMonth()].slice(0, 3)}`;
      const todayCol = G.cols === 'dayNum' && t0 >= range.start && t0 <= range.end ? parse(t0).getDate() - 1 : -1;
      // أعمدة مشتركة بين كل الصفوف (مثل أشهر الخطة العشرية): أسماؤها في الرأس، والخلايا بلا نص (طلب المالك)
      const shared = !g.header && !dayCols && g.rows.length > 1 && Array.from({ length: g.cols }, (_, i) => new Set(g.rows.map((rw) => rw.cells.find((c) => c.col === i)?.label)).size === 1).every(Boolean);
      if (shared) g.header = Array.from({ length: g.cols }, (_, i) => g.rows[0].cells.find((c) => c.col === i).label);
      const head = g.header ? `<div class="pl-yrow pl-ywhead"><b></b><div class="pl-ydays" style="--cols:${g.cols}">${g.header.map((h, i) => `<i${i === todayCol ? ' class="pl-hnow"' : ''}>${G.cols === 'weekday' && g.cols > 7 ? DOW1[(i + s.weekStart) % 7] : h}</i>`).join('')}</div></div>` : '';
      const rowLabel = (row) => {
        if (G.rows === 'week') { const first = row.cells.find((c) => c.start.endsWith('-01')); return first ? MONTHS[parse(first.start).getMonth()].slice(0, 3) : `<small>${parse(row.start).getDate()}</small>`; }
        return esc(dayCols && G.rows === 'month' ? row.label.slice(0, 3) : row.label);
      };
      const rows = g.rows.map((row) => {
        const cells = Array.from({ length: g.cols }, (_, i) => {
          const c = row.cells.find((x) => x.col === i);
          if (!c) return '<i class="pl-off"></i>';
          if (dayCols) return dayCell(s, parse(c.start), t0, bare);
          const now = c.start <= t0 && t0 <= c.end;
          return `<i class="pl-gcell${now ? ' pl-gnow' : ''}" style="--s:${c.color ?? row.color ?? 'transparent'}" data-day="${c.start}" ${tip(`${c.label}: ${fmt(c.start)} ← ${fmt(c.end)} (${diffDays(c.start, c.end) + 1} يوماً)`)}>${shared ? '' : `<b>${esc(c.label)}</b><small>${fmt(c.start)}</small>`}</i>`;
        }).join('');
        const lanes = gridBars(s.tasks, row).map((b, i) => bar(b.t, { ...b, wide: !dayCols }, `grid-row:${i + 2}`)).join('');
        const mstart = G.rows === 'week' && row.cells.some((c) => c.start.endsWith('-01')) ? ' pl-mstart' : '';
        return `<div class="pl-yrow${mstart}" style="--rc:${row.color ?? 'var(--green-700)'}"><b class="${dayCols ? '' : 'pl-rlabel'}" ${tip(`${row.label}: ${fmt(row.start)} ← ${fmt(row.end)}`)}>${rowLabel(row)}</b><div class="pl-ydays" style="--cols:${g.cols}">${cells}${lanes}</div></div>`;
      }).join('');
      return `<div class="pl-year${dayCols ? (g.cols <= 7 ? ' pl-yweeks' : '') : ' pl-grid'}">${head}${rows}</div>`;
    }

    // مقسّم أشهراً: ١٢ تقويماً صغيراً؛ تحت كل يوم نقاط بألوان تصنيفات مهامه، والضغط يفتح ذلك اليوم
    function yearMonthsView(s, y, t0) {
      return `<div class="pl-ymonths">${MONTHS.map((name, m) => {
        const cells = monthCells(y, m, s.weekStart).map((k) => {
          if (!k) return '<i class="pl-off"></i>';
          const d = parse(k);
          const list = tasksIn(s.tasks, { start: k, end: k });
          const dots = list.slice(0, 3).map((t) => `<u style="background:${colorOf(t)}"></u>`).join('');
          const p = periodAt(s.system, k);
          return `<button type="button" data-goto="${k}" data-day="${k}" style="--s:${p?.color ?? 'transparent'}" class="${k === t0 ? 'pl-now' : ''}${s.weekend.includes(d.getDay()) ? ' pl-wkend' : ''}" ${tip(`${d.getDate()} ${name}${list.length ? ` · ${list.map((t) => t.name).join('، ')}` : ''}`)}><b>${d.getDate()}</b><span>${dots}</span></button>`;
        }).join('');
        return `<section class="pl-mini"><h5>${name}</h5><div class="pl-mgrid">${Array.from({ length: 7 }, (_, i) => `<em>${DOW1[(i + s.weekStart) % 7]}</em>`).join('')}${cells}</div></section>`;
      }).join('')}</div>`;
    }

    // أزرار بناء التقويم (نموذج المالك): القوالب · الفترة · الصفوف · الأعمدة — كل زر يدور على الصالح فقط
    function builderBar(s) {
      const G = s.grid;
      const pid = G.months ? 'months' : presetOf(G);
      const pLabel = pid === 'months' ? '١٢ شهراً صغيراً' : pid ? GRID_PRESETS[pid].label : 'مخصص';
      return `<span class="pl-builder">
        <button type="button" class="pl-btn" data-act="preset" ${tip('القوالب الجاهزة — اضغط للتالي')}>${icon('view_quilt')}<span>${pLabel}</span></button>
        ${G.months ? '' : `<button type="button" class="pl-btn pl-ax" data-act="g-span" ${tip('الفترة — اضغط للتبديل')}><em>الفترة</em>${SPANS[G.span].label}</button>
        <button type="button" class="pl-btn pl-ax" data-act="g-rows" ${tip('الصفوف (لا تتجاوز الفترة) — اضغط للتبديل')}><em>الصفوف</em>${UNITS[G.rows].label}</button>
        <button type="button" class="pl-btn pl-ax" data-act="g-cols" ${tip('الأعمدة (يحتويها الصف) — اضغط للتبديل')}><em>الأعمدة</em>${colLabel(G.cols)}</button>`}
      </span>`;
    }

    // أزرار الفرز بالاهتمامات (وسوم المشاريع): كل زر يُظهر أو يخفي مهام اهتمامه، وعليه عددها في النطاق المعروض
    function catsBar(s, r, projects) {
      const n = Object.fromEntries(INTERESTS.map((c) => [c.id, 0]));
      for (const t of tasksIn(s.tasks, r)) for (const i of interestsOf(t, projects)) if (i in n) n[i] += 1;
      const allOn = !s.hidden.length;
      return `<div class="pl-cats" role="group" aria-label="فرز حسب الاهتمام">${INTERESTS.map((c) => `
        <button type="button" class="pl-cat" data-cat="${c.id}" aria-pressed="${!s.hidden.includes(c.id)}" style="--c:${c.color}" ${tip(`${c.label}: ${n[c.id]} في هذا النطاق — اضغط للإظهار أو الإخفاء`)}>
          <i></i>${c.label}${n[c.id] ? `<em>${n[c.id]}</em>` : ''}</button>`).join('')}
        <button type="button" class="pl-btn" data-act="cats-all" ${tip(allOn ? 'أخفِ كل الاهتمامات' : 'أظهر كل الاهتمامات')}>${icon(allOn ? 'visibility_off' : 'visibility')}</button>
      </div>`;
    }

    // ── المشاريع: مشروع ← خطته (جانت) ← مهامه؛ الاهتمامات وسوم؛ والمنتهي إلى الأرشيف
    let showProjects = false;
    let showGoals = true;
    /** إنجاز المشروع: درجة أهدافه الموزونة إن كانت له أهداف، وإلا نسبة مهامه (موزونة بالأيام). */
    const scoreOf = (all, p) => projectScore(p, all.goals ?? [], all.tasks)?.score ?? projectProgress(all.tasks, p.id);

    // ── أهداف المشروع المفتوح: أوزان مجموعها ١٠٠٪، وقياس لكل هدف، والدرجة مقابل الحد الأدنى للرضا
    function goalsPanel(all, p) {
      if (!showGoals) return '';
      const sc = projectScore(p, all.goals ?? [], all.tasks);
      const gs = goalsOf(all.goals, p.id);
      const { weights } = effectiveWeights(gs);
      const row = ({ goal: g, progress }) => `<li>
        <b>${esc(g.name)}</b>
        <label class="pl-gw" ${tip('الوزن ٪ — اتركه فارغاً ليتقاسم الباقي بالتساوي')}><input type="number" min="0" max="100" step="1" data-gweight="${esc(g.id)}" value="${g.weight ?? ''}" placeholder="${Math.round(weights[g.id] * 10) / 10}">٪</label>
        <span class="pl-gm">${g.kind === 'done'
          ? `<label ${tip('تمّ؟')}><input type="checkbox" data-gdone="${esc(g.id)}" ${g.current ? 'checked' : ''}> تمّ</label>`
          : g.kind === 'tasks'
            ? `<small>${all.tasks.filter((t) => t.goal === g.id).length} مهمة</small>`
            : `<input type="number" step="any" data-gcur="${esc(g.id)}" value="${g.current}" aria-label="القيمة الحالية"><small>/ ${g.target} ${esc(g.unit)}</small>`}</span>
        <span class="pl-meter" style="--p:${progress ?? 0}%;--c:var(--green-700)"><i></i></span>
        <em>${progress == null ? '—' : `${progress}٪`}</em>
        <button type="button" class="pl-btn" data-gdel="${esc(g.id)}" ${tip('احذف الهدف')}>${icon('delete')}</button>
      </li>`;
      return `<div class="pl-goals">
        <div class="pl-gohead">
          ${icon('flag')}<b>الأهداف</b>
          ${sc ? `<span class="pl-score ${sc.status}" ${tip(`الإنجاز الموزون ${sc.score}٪ — الحد الأدنى للرضا ${sc.threshold}٪`)}><span style="--p:${sc.score}%;--t:${sc.threshold}%"><i></i><u></u></span>${sc.score}٪</span>` : ''}
          <label class="pl-gth" ${tip('الحد الأدنى للرضا عن إنجاز المشروع')}>${icon('ads_click')}<input type="number" min="0" max="100" step="5" data-pthreshold="${esc(p.id)}" value="${p.threshold ?? 70}">٪</label>
        </div>
        ${sc && !sc.weightsOk ? `<div class="pl-gwarn">${esc(sc.msg)} <button type="button" data-act="eq-weights">${icon('balance')} وزّع بالتساوي</button></div>` : ''}
        <ul class="pl-glist">${sc ? sc.rows.map(row).join('') : '<li class="pl-empty">لا أهداف بعد — أضف أهداف المشروع، ولكلٍّ وزنه وقياسه. الأوزان تُوزَّع بالتساوي ما لم تحدّدها.</li>'}</ul>
        <form class="pl-gadd">
          <input name="gname" maxlength="60" placeholder="هدف جديد…" aria-label="اسم الهدف" required>
          <select name="kind" aria-label="طريقة القياس">${Object.entries(GOAL_KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
          <input name="baseline" type="number" step="any" placeholder="من" aria-label="قيمة البداية" ${tip('قيمة البداية (للرقم)')}>
          <input name="target" type="number" step="any" placeholder="إلى" aria-label="المستهدف" ${tip('المستهدف (للرقم) — أصغر من البداية إن كان المطلوب خفضاً')}>
          <input name="unit" maxlength="12" placeholder="الوحدة" aria-label="الوحدة">
          <input name="weight" type="number" min="0" max="100" placeholder="الوزن ٪" aria-label="الوزن" ${tip('اتركه فارغاً ليتقاسم الباقي بالتساوي')}>
          <button type="submit" ${tip('أضف الهدف')}>${icon('add')}</button>
        </form>
      </div>`;
    }
    function projectsPanel(all) {
      if (!showProjects) return '';
      const fmt = (k) => `${parse(k).getDate()} ${MONTHS[parse(k).getMonth()].slice(0, 3)} ${parse(k).getFullYear()}`;
      const row = (p) => {
        const rg = projectRange(all.tasks, p.id);
        const pr = scoreOf(all, p);
        const n = all.tasks.filter((t) => t.project === p.id).length;
        return `<li class="${all.project === p.id ? 'on' : ''}">
          <button type="button" class="pl-pname" data-popen="${esc(p.id)}" ${tip('افتح خطة المشروع (جانت)')}>${esc(p.name)}</button>
          <span class="pl-ptags">${INTERESTS.map((c) => `<button type="button" data-ptag="${esc(p.id)}" data-tag="${c.id}" aria-pressed="${p.interests.includes(c.id)}" style="--c:${c.color}" ${tip(`${c.label} — اضغط لإضافة الوسم أو إزالته`)}>${c.label}</button>`).join('')}</span>
          <small>${n} مهمة${rg ? ` · ${fmt(rg.start)} ← ${fmt(rg.end)}` : ''}</small>
          ${pr == null ? '' : `<span class="pl-meter" style="--p:${pr}%;--c:var(--green-700)"><i></i></span><em>${pr}٪</em>`}
          ${p.status === 'archived'
            ? `<button type="button" class="pl-btn" data-prestore="${esc(p.id)}" ${tip('أعده إلى المشاريع النشطة')}>${icon('unarchive')}</button>`
            : `<button type="button" class="pl-btn" data-parchive="${esc(p.id)}" ${tip('انتهى المشروع — انقله إلى الأرشيف')}>${icon('archive')}</button>`}
        </li>`;
      };
      const act = activeProjects(all.projects);
      const arc = archivedProjects(all.projects);
      return `<div class="pl-projects">
        <form class="pl-padd">
          <input name="pname" maxlength="60" placeholder="مشروع جديد…" aria-label="اسم المشروع" required>
          <span class="pl-ptags">${INTERESTS.map((c) => `<label style="--c:${c.color}"><input type="checkbox" name="interest" value="${c.id}"><span>${c.label}</span></label>`).join('')}</span>
          <button type="submit" ${tip('أنشئ المشروع')}>${icon('add')}</button>
        </form>
        <ul class="pl-plist">${act.map(row).join('') || '<li class="pl-empty">لا مشاريع بعد — أنشئ مشروعاً، ثم أضف إليه مهام.</li>'}</ul>
        <details class="pl-archive" ${arc.length ? '' : 'hidden'}><summary>${icon('inventory_2')} الأرشيف <em>${arc.length}</em></summary>
          <ul class="pl-plist">${arc.map(row).join('')}</ul></details>
      </div>`;
    }

    function ganttView(s, r) {
      const n = diffDays(r.start, r.end) + 1;
      const t0 = today();
      const step = n > 40 ? 7 : 1;
      const head = Array.from({ length: n }, (_, i) => {
        const d = parse(addDays(r.start, i));
        const lab = step === 1 ? d.getDate() : (i % step === 0 ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : '');
        const minor = step === 1 && d.getDate() !== 1 && d.getDate() % 5 !== 0 ? ' pl-minor' : ''; // يُخفى في العرض الضيق
        return `<i data-day="${addDays(r.start, i)}" class="${addDays(r.start, i) === t0 ? 'pl-now' : ''}${s.weekend.includes(d.getDay()) ? ' pl-fri' : ''}${minor}">${lab}</i>`;
      }).join('');
      const bands = Array.from({ length: n }, (_, i) => `<i style="--s:${periodAt(s.system, addDays(r.start, i))?.color ?? 'transparent'}"></i>`).join('');
      const list = tasksIn(s.tasks, r);
      const rows = list.map((t) => `<div class="pl-grow"><b ${tip(t.name)}>${esc(t.name)}</b><div class="pl-cells" data-start="${r.start}" style="--n:${n}">${bar(t, barFor(t, r))}</div></div>`).join('');
      return `<div class="pl-gantt" style="--n:${n}">
        <div class="pl-grow pl-ghead"><b></b><div class="pl-cells pl-band" style="--n:${n}">${bands}</div></div>
        <div class="pl-grow pl-ghead"><b></b><div class="pl-cells pl-days" style="--n:${n}">${head}</div></div>
        ${rows || '<p class="pl-empty">لا مهام في هذا النطاق — أضف مهمة بالأسفل.</p>'}
      </div>`;
    }

    function dayView(s, r) {
      const list = tasksIn(s.tasks, r);
      if (!list.length) return '<p class="pl-empty">لا مهام اليوم.</p>';
      return `<ul class="pl-day">${list.map((t) => `<li><button type="button" data-task="${esc(t.id)}" style="--c:${colorOf(t)};--p:${t.progress}%">
        <b>${esc(t.name)}</b><small>${t.start} ← ${t.end} · بقي ${Math.max(0, diffDays(r.start, t.end))} يوم</small><span class="pl-meter"><i></i></span><em>${t.progress}٪</em></button></li>`).join('')}</ul>`;
    }

    // الأسبوع يوماً يوماً (القائمة الجانبية): لكل يوم سطر بتاريخه، وتحته مهامه الجارية بنسبها
    function weekDaysView(s, r) {
      const t0 = today();
      return `<ol class="pl-week">${Array.from({ length: 7 }, (_, i) => {
        const k = addDays(r.start, i);
        const d = parse(k);
        const list = tasksIn(s.tasks, { start: k, end: k });
        return `<li data-day="${k}" class="${k === t0 ? 'pl-now' : ''}${isWeekend(k, s.weekend) ? ' pl-wkend' : ''}">
          <b>${DOW[d.getDay()]} <span>${d.getDate()} ${MONTHS[d.getMonth()]}</span></b>
          ${list.map((t) => `<button type="button" draggable="true" class="pl-chipt" data-task="${esc(t.id)}" style="--c:${colorOf(t)};--p:${t.progress}%" ${tip(`${t.name} · ${t.progress}٪`)}>${esc(t.name)}<em>${t.progress}٪</em></button>`).join('') || '<small>—</small>'}
        </li>`;
      }).join('')}</ol>`;
    }

    // الحالي والتالي (شهران، أو موسمان/طالعان/منزلتان): لكل نطاق عنوانه ومهامه بمدتها ونسبتها
    function agendaView(s, ranges) {
      return ranges.map((rg, i) => {
        const list = tasksIn(s.tasks, rg);
        return `<section class="pl-agenda" style="--s:${rg.color ?? 'var(--green-700)'}">
          <h4>${i === 0 ? 'الحالي' : 'التالي'}: ${esc(rg.label)} <small>${parse(rg.start).getDate()} ${MONTHS[parse(rg.start).getMonth()]} ← ${parse(rg.end).getDate()} ${MONTHS[parse(rg.end).getMonth()]}</small>
            ${rangeProgress(s.tasks, rg) == null ? '' : `<em>${rangeProgress(s.tasks, rg)}٪</em>`}</h4>
          ${list.length ? `<ul class="pl-day">${list.map((t) => `<li><button type="button" data-task="${esc(t.id)}" style="--c:${colorOf(t)};--p:${t.progress}%">
            <b>${esc(t.name)}</b><small>${t.start} ← ${t.end}</small><span class="pl-meter"><i></i></span><em>${t.progress}٪</em></button></li>`).join('')}</ul>` : '<p class="pl-empty">لا مهام.</p>'}
        </section>`;
      }).join('');
    }

    // «لاحقاً»: المهام بلا موعد — النظام نفسه، فئة خاصة. تُسحب إلى يوم (أو تُفتح وتُعطى تاريخاً)، ويُسحب إليها لإلغاء الموعد.
    function laterBox(s) {
      const list = undatedTasks(s.tasks);
      return `<details class="pl-later" data-drop-later ${list.length ? 'open' : ''}>
        <summary>${icon('inbox')} لاحقاً <em>${list.length}</em> <small>بلا موعد — اسحب المهمة إلى يوم لجدولتها</small></summary>
        <div class="pl-later-list">${list.map((t) => `<button type="button" draggable="true" class="pl-chipt" data-task="${esc(t.id)}" style="--c:${colorOf(t)};--p:${t.progress}%" ${tip(`${t.name} · ${t.progress}٪ — اسحبها إلى يوم أو اضغطها لتحديد موعد`)}>${esc(t.name)}${t.progress ? `<em>${t.progress}٪</em>` : ''}</button>`).join('') || '<small>فارغ — أضف مهمة بلا تاريخ بزر «لاحقاً».</small>'}</div>
      </details>`;
    }

    // ⚙ الإعدادات: أيام عطلة نهاية الأسبوع الرسمية (تختلف بين البلدان)
    let showSettings = false;
    function settings(s) {
      if (!showSettings) return '';
      const preset = Object.entries(WEEKEND_PRESETS).find(([, v]) => v.days.length === s.weekend.length && v.days.every((d) => s.weekend.includes(d)))?.[0] ?? 'custom';
      return `<div class="pl-set">
        <label>عطلة نهاية الأسبوع
          <select data-weekend-preset>${Object.entries(WEEKEND_PRESETS).map(([id, v]) => `<option value="${id}" ${id === preset ? 'selected' : ''}>${v.label}</option>`).join('')}
            <option value="custom" ${preset === 'custom' ? 'selected' : ''} disabled>مخصص</option></select></label>
        <label>بداية الأسبوع <select data-week-start>${DOW.map((n, i) => `<option value="${i}" ${i === s.weekStart ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="pl-wdays" role="group" aria-label="أيام العطلة">${DOW.map((n, i) => `<button type="button" data-wday="${i}" aria-pressed="${s.weekend.includes(i)}">${n}</button>`).join('')}</div>
      </div>`;
    }

    function editor(s) {
      const all = s;
      const t = s.tasks.find((x) => x.id === editing);
      if (!t) return '';
      return `<form class="pl-edit" data-edit="${esc(t.id)}">
        <input name="name" value="${esc(t.name)}" maxlength="60" aria-label="اسم المهمة">
        <label>${icon('date_range')}<input type="date" name="start" value="${t.start ?? ''}" aria-label="البداية"><input type="date" name="end" value="${t.end ?? ''}" aria-label="النهاية"></label>
        <label class="pl-prog">${icon('check')}<input type="range" name="progress" min="0" max="100" step="5" value="${t.progress}" aria-label="نسبة الإنجاز"><output>${t.progress}٪</output></label>
        <select name="project" aria-label="المشروع"><option value="">بلا مشروع</option>${activeProjects(s.projects).concat(projectOf(t, s.projects)?.status === 'archived' ? [projectOf(t, s.projects)] : []).map((p) => `<option value="${esc(p.id)}" ${p.id === t.project ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        ${goalsOf(all.goals, t.project).length ? `<select name="goal" aria-label="الهدف"><option value="">بلا هدف</option>${goalsOf(all.goals, t.project).map((g) => `<option value="${esc(g.id)}" ${g.id === t.goal ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>` : ''}
        <div class="pl-colors" role="radiogroup" aria-label="اهتمام المهمة الحرّة">${CATEGORIES.map((c) => `<label ${tip(`${c.label} (للمهمة بلا مشروع)`)}><input type="radio" name="category" value="${c.id}" ${c.id === t.category ? 'checked' : ''}><i style="background:${c.color}"></i></label>`).join('')}</div>
        <div class="pl-row">
          <button type="submit" ${tip('حفظ')}>${icon('check')}</button>
          ${t.start ? `<button type="button" data-act="unschedule" ${tip('أعدها إلى «لاحقاً» (بلا موعد)')}>${icon('move_to_inbox')}</button>` : ''}
          <button type="button" data-act="del" ${tip('حذف المهمة')}>${icon('delete')}</button>
          <button type="button" data-act="close" ${tip('إغلاق')}>${icon('close')}</button>
        </div>
      </form>`;
    }

    // حارس إعادة الدخول: استبدال innerHTML يُفقد الحقلَ المحرَّر تركيزه فيطلق «change» أثناء الرسم
    // (تعديل وزن هدف أو قيمته) — فيُؤجَّل الرسم المتداخل ويُعاد بعد انتهاء الحالي بأحدث حالة.
    let rendering = false, again = false;
    function render() {
      if (rendering) { again = true; return; }
      rendering = true;
      try { draw(); } finally { rendering = false; }
      if (again) { again = false; render(); }
    }
    function draw() {
      const all = store.get();
      all.projects = all.projects ?? [];
      currentProjects = all.projects;
      const openProject = all.project ? all.projects.find((p) => p.id === all.project) ?? null : null;
      // الفرز يسري على كل العروض والنسبة: المشروع المفتوح وحده، أو كل المشاريع النشطة بفرز الاهتمامات
      const s = { ...all, tasks: filterTasks(all.tasks, all.projects, { hidden: all.hidden ?? [], project: openProject?.id ?? null }), hidden: all.hidden ?? [] };
      s.weekend = Array.isArray(all.weekend) ? all.weekend : [5, 6];
      s.weekStart = Number.isInteger(all.weekStart) ? all.weekStart : 0;
      s.grid = gridOf(all);
      const narrow = NARROW.matches;
      s.scope = scopeFor(all.scope, narrow); // السنة والشهر الكامل والموسم الكامل للتطبيق الكامل فقط
      const two = s.scope === 'months2' || s.scope === 'periods2' ? twoRanges(s.scope, anchor(), s.system) : null;
      const spanOpts = { system: s.system, weekStart: s.weekStart };
      const r = two ? { start: two[0].start, end: two[1].end, label: `${two[0].label} ← ${two[1].label}` }
        : s.scope === 'year' ? SPANS[s.grid.months ? 'year' : s.grid.span].range(anchor(), spanOpts) : rangeFor(s.scope, anchor(), s.system);
      const prog = rangeProgress(s.tasks, r);
      // دمج التقويم في الشهر والموسم والأسبوع (طلب المالك): شبكة أسابيع × أيام بالمحرّك نفسه، أو جانت
      const calScope = !narrow && ['month', 'season', 'week'].includes(s.scope);
      const asCal = calScope && (all.view ?? 'cal') === 'cal';
      // خطة المشروع: جانت على مدى مهامه (أو الشهر الحالي إن لم تُجدول بعد)
      const planMode = openProject && all.planView !== false && !narrow;
      if (planMode) {
        const pr = projectRange(all.tasks, openProject.id) ?? rangeFor('month', today());
        Object.assign(r, { start: pr.start, end: pr.end, label: `خطة: ${openProject.name}` });
      }
      const body = planMode ? ganttView(s, r) : s.scope === 'year' ? calView(s, r, today()) : asCal ? calView(s, r, today(), { rows: 'week', cols: 'weekday' }) : s.scope === 'day' ? dayView(s, r) : two ? agendaView(s, two)
        : s.scope === 'week' && narrow ? weekDaysView(s, r) : ganttView(s, r);
      const t0 = today();
      el.innerHTML = `<div class="pl">
        <div class="pl-top">
          <button type="button" class="pl-btn pl-scope" data-act="scope" ${tip(narrow ? 'بدّل العرض: يوم ← أسبوع ← شهران ← فترتان (السنة والشهر الكامل في التبويب الكامل)' : 'بدّل العرض: سنة ← موسم ← شهر ← أسبوع ← يوم')}>${icon(SCOPE_ICON[s.scope])}<span>${SCOPE_LABEL[s.scope]}</span></button>
          ${s.scope === 'year' ? builderBar(s) : ''}
          ${calScope ? `<button type="button" class="pl-btn" data-act="view" ${tip(asCal ? 'تقويم (أسابيع × أيام) — اضغط لجانت' : 'جانت (صف لكل مهمة) — اضغط للتقويم')}>${icon(asCal ? 'calendar_month' : 'view_timeline')}<span>${asCal ? 'تقويم' : 'جانت'}</span></button>` : ''}
          <button type="button" class="pl-btn" data-act="system" ${tip('نظام المواسم — اضغط للتبديل')}>${icon('eco')}<span>${SYSTEMS[s.system].label}</span></button>
          <span class="pl-nav">
            <button type="button" class="pl-btn" data-act="prev" ${tip('السابق')}>${icon('chevron_right')}</button>
            <b>${esc(r.label)}</b>
            <button type="button" class="pl-btn" data-act="next" ${tip('التالي')}>${icon('chevron_left')}</button>
            <button type="button" class="pl-btn" data-act="today" ${tip('اليوم')}>${icon('today')}</button>
            <button type="button" class="pl-btn" data-act="projects" aria-expanded="${showProjects}" ${tip('المشاريع والأرشيف')}>${icon('folder')}<span>${activeProjects(all.projects).length}</span></button>
            <button type="button" class="pl-btn" data-act="settings" aria-expanded="${showSettings}" ${tip('الإعدادات: عطلة نهاية الأسبوع')}>${icon('settings')}</button>
          </span>
          ${prog == null ? '' : `<span class="pl-chip" ${tip('إنجاز المهام في هذا النطاق (موزون بالأيام)')}>${prog}٪</span>`}
        </div>
        ${settings(s)}
        ${projectsPanel(all)}
        ${openProject ? `<div class="pl-pbanner" style="--c:${INTERESTS.find((c) => c.id === openProject.interests[0])?.color ?? 'var(--green-700)'}">
          ${icon('folder_open')}<b>${esc(openProject.name)}</b>${openProject.status === 'archived' ? '<small>(مؤرشف)</small>' : ''}
          <em>${scoreOf(all, openProject) ?? 0}٪</em>
          <button type="button" class="pl-btn" data-act="goals-toggle" aria-expanded="${showGoals}" ${tip('الأهداف ومؤشرات القياس')}>${icon('flag')}<span>${goalsOf(all.goals, openProject.id).length}</span></button>
          ${narrow ? '' : `<button type="button" class="pl-btn" data-act="plan-toggle" ${tip(planMode ? 'اعرض المشروع في التقويم' : 'اعرض خطة المشروع (جانت)')}>${icon(planMode ? 'calendar_month' : 'view_timeline')}</button>`}
          <button type="button" class="pl-btn" data-act="pclose" ${tip('أغلق المشروع — اعرض كل المشاريع')}>${icon('close')}</button>
        </div>${goalsPanel(all, openProject)}` : catsBar({ ...s, tasks: filterTasks(all.tasks, all.projects, {}) }, r, all.projects)}
        <div class="pl-body">${body}</div>
        ${laterBox(s)}
        ${editor(all)}
        <form class="pl-add" data-size="m l">
          <input name="name" maxlength="60" placeholder="مهمة جديدة…" aria-label="اسم المهمة" required>
          <input type="date" name="start" value="${t0}" aria-label="البداية">
          <input type="date" name="end" value="${addDays(t0, 6)}" aria-label="النهاية">
          <select name="project" aria-label="المشروع"><option value="">بلا مشروع</option>${activeProjects(all.projects).map((p) => `<option value="${esc(p.id)}" ${p.id === (openProject?.id ?? all.lastProject) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
          ${openProject ? goalsOf(all.goals, openProject.id).length ? `<select name="goal" aria-label="الهدف"><option value="">بلا هدف</option>${goalsOf(all.goals, openProject.id).map((g) => `<option value="${esc(g.id)}" ${g.id === '' ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>` : '' : ''}
          <select name="category" aria-label="اهتمام المهمة الحرّة" ${tip('اهتمام المهمة إن كانت بلا مشروع')}>${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === all.lastCat ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
          <button type="submit" name="when" value="dated" ${tip('أضف المهمة بتاريخيها')}>${icon('add')}</button>
          <button type="submit" name="when" value="later" class="pl-later-btn" ${tip('أضفها إلى «لاحقاً» بلا موعد')}>${icon('inbox')}</button>
        </form>
      </div>`;
      for (const n of el.querySelectorAll('[data-size]')) n.hidden = !n.dataset.size.split(' ').includes(ctx.size);
    }

    el.addEventListener('click', (e) => {
      const pick = (attr) => e.target.closest(`[${attr}]`)?.getAttribute(attr);
      const st = store.get();
      const projects = st.projects ?? [];
      const setP = (id, fn) => store.set({ projects: projects.map((p) => (p.id === id ? fn(p) : p)) });
      if (pick('data-gdel') && confirm('حذف الهدف؟ (مهامه تبقى)')) {
        const id = pick('data-gdel');
        store.set({ goals: (st.goals ?? []).filter((g) => g.id !== id), tasks: st.tasks.map(({ goal, ...t }) => (goal === id ? t : { ...t, ...(goal ? { goal } : {}) })) });
        return;
      }
      if (pick('data-popen')) { store.set({ project: pick('data-popen'), planView: true }); return; }
      if (pick('data-parchive')) { const id = pick('data-parchive'); setP(id, (p) => archive(p, today())); if (st.project === id) store.set({ project: null }); return; }
      if (pick('data-prestore')) { setP(pick('data-prestore'), restore); return; }
      if (pick('data-ptag')) {
        const tag = e.target.closest('[data-tag]').dataset.tag;
        setP(pick('data-ptag'), (p) => makeProject({ ...p, interests: p.interests.includes(tag) ? p.interests.filter((x) => x !== tag) : [...p.interests, tag] }, p.id));
        return;
      }
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        const h = store.get().hidden ?? [];
        store.set({ hidden: h.includes(cat.dataset.cat) ? h.filter((x) => x !== cat.dataset.cat) : [...h, cat.dataset.cat] });
        return;
      }
      const taskBtn = e.target.closest('[data-task]');
      if (taskBtn) { editing = taskBtn.dataset.task; render(); return; }
      const go = e.target.closest('[data-goto]'); // يوم في التقويم الشهري الصغير ← عرض ذلك اليوم
      if (go) { store.set({ anchor: go.dataset.goto, scope: 'day' }); return; }
      const wd = e.target.closest('[data-wday]');
      if (wd) {
        const w = store.get().weekend ?? [5, 6];
        const d = Number(wd.dataset.wday);
        store.set({ weekend: w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort() });
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const s = store.get();
      if (act === 'scope') store.set({ scope: nextScope(scopeFor(s.scope, NARROW.matches), NARROW.matches) });
      if (act === 'settings') { showSettings = !showSettings; render(); }
      if (act === 'projects') { showProjects = !showProjects; render(); }
      if (act === 'goals-toggle') { showGoals = !showGoals; render(); }
      if (act === 'eq-weights') { const mine = new Set(goalsOf(s.goals, s.project).map((g) => g.id)); store.set({ goals: (s.goals ?? []).map((g) => (mine.has(g.id) ? equalize([g])[0] : g)) }); }
      if (act === 'pclose') store.set({ project: null });
      if (act === 'plan-toggle') store.set({ planView: s.planView === false });
      const curGrid = () => gridOf(s);
      if (act === 'preset') {
        const G = curGrid();
        const cur = G.months ? 'months' : presetOf(G);
        const next = PRESET_IDS[(PRESET_IDS.indexOf(cur) + 1) % PRESET_IDS.length];
        store.set({ grid: next === 'months' ? { ...GRID_PRESETS.date, months: true } : { ...GRID_PRESETS[next] }, anchor: null });
      }
      if (act === 'g-span') store.set({ grid: nextSpan(curGrid()), anchor: null });
      if (act === 'view') store.set({ view: (s.view ?? 'cal') === 'cal' ? 'gantt' : 'cal' });
      if (act === 'g-rows') store.set({ grid: nextRows(curGrid()) });
      if (act === 'g-cols') store.set({ grid: nextCols(curGrid()) });
      if (act === 'system') store.set({ system: nextSystem(s.system) });
      if (act === 'prev' || act === 'next') {
        const sc = scopeFor(s.scope, NARROW.matches);
        const dir = act === 'next' ? 1 : -1;
        const G = sc === 'year' ? curGrid() : null;
        store.set({ anchor: G ? shiftSpan(G.months ? 'year' : G.span, anchor(), dir, { system: s.system, weekStart: s.weekStart ?? 0 }) : shift(sc, anchor(), dir, s.system) });
      }
      if (act === 'today') store.set({ anchor: null });
      if (act === 'cats-all') store.set({ hidden: (s.hidden ?? []).length ? [] : CATEGORIES.map((c) => c.id) });
      if (act === 'close') { editing = null; render(); }
      if (act === 'unschedule') { store.set({ tasks: s.tasks.map((t) => (t.id === editing ? unschedule(t) : t)) }); editing = null; render(); }
      if (act === 'del' && confirm('حذف المهمة؟')) { store.set({ tasks: s.tasks.filter((t) => t.id !== editing) }); editing = null; render(); }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-weekend-preset]') && WEEKEND_PRESETS[e.target.value]) store.set({ weekend: [...WEEKEND_PRESETS[e.target.value].days] });
      if (e.target.matches('[data-week-start]')) store.set({ weekStart: Number(e.target.value) });
      const st = store.get();
      const setG = (id, patch) => store.set({ goals: (st.goals ?? []).map((g) => (g.id === id ? makeGoal({ ...g, ...patch }, id) : g)) });
      if (e.target.dataset.gweight) setG(e.target.dataset.gweight, { weight: e.target.value });
      if (e.target.dataset.gcur) setG(e.target.dataset.gcur, { current: e.target.value });
      if (e.target.dataset.gdone) setG(e.target.dataset.gdone, { current: e.target.checked });
      if (e.target.dataset.pthreshold) store.set({ projects: (st.projects ?? []).map((p) => (p.id === e.target.dataset.pthreshold ? makeProject({ ...p, threshold: e.target.value }, p.id) : p)) });
    });
    el.addEventListener('input', (e) => {
      if (e.target.name === 'progress') e.target.nextElementSibling.textContent = `${e.target.value}٪`;
    });
    /** ربط المهمة بمشروعها: مهمة المشروع تأخذ اهتماماته (فلا تحمل اهتماماً خاصاً)، والحرّة تبقى باهتمامها. */
    const withProject = (t, pid, goal) => {
      if (!pid) return t;
      const { category, color, ...rest } = t;
      const g = goal && (store.get().goals ?? []).some((x) => x.id === goal && x.project === pid) ? goal : undefined; // الهدف من المشروع نفسه فقط
      return { ...rest, project: pid, ...(g ? { goal: g } : {}) };
    };
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.target.matches('.pl-gadd')) {
        const fd = Object.fromEntries(new FormData(e.target));
        const st = store.get();
        const g = makeGoal({ name: fd.gname, project: st.project, kind: fd.kind, weight: fd.weight, baseline: fd.baseline, target: fd.target, unit: fd.unit }, `g${uid()}`);
        store.set({ goals: [...(st.goals ?? []), g] });
        return;
      }
      if (e.target.matches('.pl-padd')) {
        const fd = new FormData(e.target);
        const st = store.get();
        const p = makeProject({ name: fd.get('pname'), interests: fd.getAll('interest') }, `p${uid()}`);
        store.set({ projects: [...(st.projects ?? []), p], lastProject: p.id });
        return;
      }
      const f = Object.fromEntries(new FormData(e.target));
      const s = store.get();
      if (e.target.matches('.pl-add')) {
        const later = e.submitter?.value === 'later';
        const nt = withProject(makeTask({ ...f, ...(later ? { start: null, end: null } : {}), progress: 0 }, uid()), f.project, f.goal);
        store.set({ tasks: [...s.tasks, nt], lastCat: f.category, lastProject: f.project ?? '',
          hidden: (s.hidden ?? []).filter((x) => x !== f.category) }); // التصنيف المضاف إليه يظهر
      } else if (e.target.dataset.edit) {
        const id = e.target.dataset.edit;
        store.set({ tasks: s.tasks.map((t) => (t.id === id ? withProject(makeTask(f, id), f.project, f.goal) : t)) });
        editing = null;
        render();
      }
    });

    // ── السحب والإفلات: مهمة إلى يوم (جدولة أو نقل بمدتها)، أو إلى «لاحقاً» (إلغاء الموعد)
    let dragId = null;
    const dayAt = (e) => {
      const d = e.target.closest('[data-day]');
      if (d) return d.dataset.day;
      const row = e.target.closest('.pl-cells[data-start]'); // صف جانت: اليوم من موضع المؤشر (الزمن من اليمين)
      if (!row) return null;
      const rc = row.getBoundingClientRect();
      const n = Number(getComputedStyle(row).getPropertyValue('--n')) || 1;
      const i = Math.min(n - 1, Math.max(0, Math.floor(((rc.right - e.clientX) / rc.width) * n)));
      return addDays(row.dataset.start, i);
    };
    el.addEventListener('dragstart', (e) => {
      const t = e.target.closest('[data-task][draggable]');
      if (!t) return;
      dragId = t.dataset.task;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    el.addEventListener('dragover', (e) => {
      if (!dragId) return;
      const ok = dayAt(e) || e.target.closest('[data-drop-later]');
      if (!ok) return;
      e.preventDefault();
      for (const x of el.querySelectorAll('.pl-drop')) x.classList.remove('pl-drop');
      (e.target.closest('[data-day], .pl-cells[data-start], [data-drop-later]'))?.classList.add('pl-drop');
    });
    el.addEventListener('drop', (e) => {
      if (!dragId) return;
      e.preventDefault();
      const day = dayAt(e);
      const toLater = !day && e.target.closest('[data-drop-later]');
      const s = store.get();
      if (day || toLater) store.set({ tasks: s.tasks.map((t) => (t.id === dragId ? (day ? scheduleOn(t, day) : unschedule(t)) : t)) });
      dragId = null;
    });
    el.addEventListener('dragend', () => { dragId = null; for (const x of el.querySelectorAll('.pl-drop')) x.classList.remove('pl-drop'); });

    const unsub = store.subscribe(render);
    const off = ctx.onResize(render);
    NARROW.addEventListener('change', render); // القائمة الجانبية ⇄ التبويب الكامل
    render();
    return () => { unsub(); off(); NARROW.removeEventListener('change', render); el.innerHTML = ''; };
  },
};
