// «المخطط» (جانت) — طلب المالك: منظومة تخطيط تعرض المهام ونسب إنجازها داخل أي تقسيم للتقويم.
// زر واحد متعدد الضغطات يدور: سنة (شبكة ١٢ شهراً × ٣١ يوماً) ← موسم ← شهر ← أسبوع ← يوم.
// أنظمة المواسم كلها متاحة بزر ثانٍ: مواسم النجوم · الطوالع · الفصول الفلكية · أرباع السنة.
// المرحلة الأولى: مهام بمدة وتصنيف ونسبة إنجاز، وفرز بالتصنيف (كـ AnuCal)، و«لاحقاً» للمهام بلا موعد تُسحب إلى يوم؛ والخطط والأهداف (عشرية ← سنوية ← يومية) لاحقاً فوقها.
import { icon, tip } from '../../icons.js';
import {
  CATEGORIES, colorOf, countByCategory, visibleTasks, MONTHS, SCOPE_LABEL, SYSTEMS, addDays, barFor, diffDays, key, makeTask, nextScope, nextSystem, parse, scopeFor, twoRanges, isWeekend, WEEKEND_PRESETS, DOW, undatedTasks, scheduleOn, unschedule, YEAR_LAYOUT_LABEL, nextYearLayout, monthOffset, WEEKDAY_COLS, yearWeeks, monthCells, GRID_PRESETS, SPANS, buildGrid, gridBars,
  periodAt, rangeFor, rangeProgress, shift, tasksIn, yearRows,
} from './plan.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const SCOPE_ICON = { year: 'grid_view', season: 'filter_vintage', month: 'calendar_view_month', week: 'calendar_view_week', day: 'calendar_view_day', months2: 'date_range', periods2: 'eco' };
const NARROW = typeof matchMedia === 'function' ? matchMedia('(max-width: 520px)') : { matches: false, addEventListener() {}, removeEventListener() {} }; // القائمة الجانبية
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
  defaults: { tasks: [], scope: 'month', anchor: null, system: 'star', hidden: [], lastCat: 'work', weekend: [5, 6], weekStart: 0, yearLayout: 'date' }, // hidden: تصنيفات مطفأة · weekend: أيام العطلة الرسمية

  mount(el, ctx) {
    const store = ctx.store;
    let editing = null; // معرّف المهمة المفتوحة للتعديل
    const today = () => key(new Date());
    const anchor = () => store.get().anchor ?? today();

    // خانة يوم في السنة: رقمه وحرفه، وظل العطلة، وخط لون الموسم، ودائرة حمراء لليوم
    // bare: خانة بلا رقم ولا حرف (الرقم أو الحرف في رأس العمود) — في ترتيبي «بالتاريخ» و«محاذاة باليوم»
    function dayCell(s, d, t0, label, bare = false) {
      const k = key(d);
      const p = periodAt(s.system, k);
      const wk = s.weekend.includes(d.getDay()) ? ' pl-wkend' : '';
      const full = `${DOW[d.getDay()]} ${label}${p ? ` · ${p.name}` : ''}`;
      return `<i style="--s:${p?.color ?? 'transparent'}" class="${k === t0 ? 'pl-now' : ''}${wk}${bare ? ' pl-bare' : ''}" data-day="${k}" ${tip(full)}>${bare ? '' : `<b>${d.getDate()}</b><s>${DOW1[d.getDay()]}</s>`}</i>`;
    }

    function yearView(s, r) {
      const y = parse(r.start).getFullYear();
      const t0 = today();
      const L = s.yearLayout;
      if (L === 'months') return yearMonthsView(s, y, t0);
      if (L === 'weeks') return yearWeeksView(s, y, t0);
      if (GRID_PRESETS[L]) return gridView(s, r, GRID_PRESETS[L], t0);
      // بالتاريخ (١–٣١) أو محاذاة بيوم الأسبوع (٣٧ عموداً، يُزاح أول كل شهر إلى عمود يومه)
      const aligned = L === 'weekday';
      const cols = aligned ? WEEKDAY_COLS : 31;
      const rows = yearRows(s.tasks, y).map((row) => {
        const off = aligned ? monthOffset(y, row.m, s.weekStart) : 0;
        const cells = Array.from({ length: cols }, (_, i) => {
          const day = i - off + 1;
          if (day < 1 || day > row.days) return '<i class="pl-off"></i>';
          return dayCell(s, new Date(y, row.m, day), t0, `${day} ${row.name}`, true);
        }).join('');
        const lanes = row.bars.map((b, i) => bar(b.t, { ...b, col: b.col + off }, `grid-row:${i + 2}`)).join('');
        return `<div class="pl-yrow"><b>${row.name.slice(0, 3)}</b><div class="pl-ydays" style="--cols:${cols}">${cells}${lanes}</div></div>`;
      }).join('');
      // رأس الأعمدة (طلب المالك): أرقام الأيام ١–٣١ في «بالتاريخ»، وحروف الأيام في «محاذاة باليوم» — والخانات بلا نص
      const head = `<div class="pl-yrow pl-ywhead"><b></b><div class="pl-ydays" style="--cols:${cols}">${Array.from({ length: cols }, (_, i) => `<i${!aligned && (y === parse(t0).getFullYear()) && i + 1 === parse(t0).getDate() ? ' class="pl-hnow"' : ''}>${aligned ? DOW1[(i + s.weekStart) % 7] : i + 1}</i>`).join('')}</div></div>`;
      return `<div class="pl-year">${head}${rows}</div>`;
    }

    // العارض العام (فترة × صفوف × أعمدة): صف لكل قطعة من وحدة الصفوف، وخلاياه بوحدة الأعمدة باسمها،
    // وأشرطة المهام تمتد على الخلايا التي تمسّها. التركيبات الجديدة = بيانات في GRID_PRESETS.
    function gridView(s, range, preset, t0) {
      const g = buildGrid(range, preset.rows, preset.cols, { system: s.system, weekStart: s.weekStart });
      const fmt = (k) => `${parse(k).getDate()} ${MONTHS[parse(k).getMonth()].slice(0, 3)}`;
      const head = g.header ? `<div class="pl-yrow pl-ywhead"><b></b><div class="pl-ydays" style="--cols:${g.cols}">${g.header.map((h) => `<i>${h}</i>`).join('')}</div></div>` : '';
      return `<div class="pl-year pl-grid">${head}${g.rows.map((row) => {
        const cells = Array.from({ length: g.cols }, (_, i) => {
          const c = row.cells.find((x) => x.col === i);
          if (!c) return '<i class="pl-off"></i>';
          const now = c.start <= t0 && t0 <= c.end;
          return `<i class="pl-gcell${now ? ' pl-gnow' : ''}" style="--s:${c.color ?? row.color ?? 'transparent'}" data-day="${c.start}" ${tip(`${c.label}: ${fmt(c.start)} ← ${fmt(c.end)} (${diffDays(c.start, c.end) + 1} يوماً)`)}><b>${esc(c.label)}</b><small>${fmt(c.start)}</small></i>`;
        }).join('');
        const lanes = gridBars(s.tasks, row).map((b, i) => bar(b.t, { ...b, wide: true }, `grid-row:${i + 2}`)).join(''); // خلايا عريضة: الاسم دائماً
        return `<div class="pl-yrow" style="--rc:${row.color ?? 'var(--green-700)'}"><b class="pl-rlabel" ${tip(`${row.label}: ${fmt(row.start)} ← ${fmt(row.end)}`)}>${esc(row.label)}</b><div class="pl-ydays" style="--cols:${g.cols}">${cells}${lanes}</div></div>`;
      }).join('')}</div>`;
    }

    // مقسّم أسابيع: صف لكل أسبوع × ٧ أيام، وعلامة الشهر عند أوله
    function yearWeeksView(s, y, t0) {
      const head = `<div class="pl-yrow pl-ywhead"><b></b><div class="pl-ydays" style="--cols:7">${Array.from({ length: 7 }, (_, i) => `<i>${DOW[(i + s.weekStart) % 7]}</i>`).join('')}</div></div>`;
      return `<div class="pl-year pl-yweeks">${head}${yearWeeks(y, s.weekStart).map((w) => {
        const cells = Array.from({ length: 7 }, (_, i) => {
          const k = addDays(w.start, i);
          const d = parse(k);
          return d.getFullYear() === y ? dayCell(s, d, t0, `${d.getDate()} ${MONTHS[d.getMonth()]}`) : '<i class="pl-off"></i>';
        }).join('');
        const lanes = tasksIn(s.tasks, w).map((t, i) => bar(t, barFor(t, w), `grid-row:${i + 2}`)).join('');
        return `<div class="pl-yrow${w.monthStart != null ? ' pl-mstart' : ''}"><b ${tip(`الأسبوع ${w.n}`)}>${w.monthStart != null ? MONTHS[w.monthStart].slice(0, 3) : `<small>${w.n}</small>`}</b><div class="pl-ydays" style="--cols:7">${cells}${lanes}</div></div>`;
      }).join('')}</div>`;
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

    // أزرار الفرز بالتصنيف: كل زر يُظهر أو يخفي مهام تصنيفه، وعليه عددها في النطاق المعروض
    function catsBar(s, r) {
      const n = countByCategory(s.tasks, r);
      const allOn = !s.hidden.length;
      return `<div class="pl-cats" role="group" aria-label="فرز حسب التصنيف">${CATEGORIES.map((c) => `
        <button type="button" class="pl-cat" data-cat="${c.id}" aria-pressed="${!s.hidden.includes(c.id)}" style="--c:${c.color}" ${tip(`${c.label}: ${n[c.id]} في هذا النطاق — اضغط للإظهار أو الإخفاء`)}>
          <i></i>${c.label}${n[c.id] ? `<em>${n[c.id]}</em>` : ''}</button>`).join('')}
        <button type="button" class="pl-btn" data-act="cats-all" ${tip(allOn ? 'أخفِ كل التصنيفات' : 'أظهر كل التصنيفات')}>${icon(allOn ? 'visibility_off' : 'visibility')}</button>
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
      const t = s.tasks.find((x) => x.id === editing);
      if (!t) return '';
      return `<form class="pl-edit" data-edit="${esc(t.id)}">
        <input name="name" value="${esc(t.name)}" maxlength="60" aria-label="اسم المهمة">
        <label>${icon('date_range')}<input type="date" name="start" value="${t.start ?? ''}" aria-label="البداية"><input type="date" name="end" value="${t.end ?? ''}" aria-label="النهاية"></label>
        <label class="pl-prog">${icon('check')}<input type="range" name="progress" min="0" max="100" step="5" value="${t.progress}" aria-label="نسبة الإنجاز"><output>${t.progress}٪</output></label>
        <div class="pl-colors" role="radiogroup" aria-label="التصنيف">${CATEGORIES.map((c) => `<label ${tip(c.label)}><input type="radio" name="category" value="${c.id}" ${c.id === t.category ? 'checked' : ''}><i style="background:${c.color}"></i></label>`).join('')}</div>
        <div class="pl-row">
          <button type="submit" ${tip('حفظ')}>${icon('check')}</button>
          ${t.start ? `<button type="button" data-act="unschedule" ${tip('أعدها إلى «لاحقاً» (بلا موعد)')}>${icon('move_to_inbox')}</button>` : ''}
          <button type="button" data-act="del" ${tip('حذف المهمة')}>${icon('delete')}</button>
          <button type="button" data-act="close" ${tip('إغلاق')}>${icon('close')}</button>
        </div>
      </form>`;
    }

    function render() {
      const all = store.get();
      const s = { ...all, tasks: visibleTasks(all.tasks, all.hidden ?? []), hidden: all.hidden ?? [] }; // الفرز يسري على كل العروض والنسبة
      s.weekend = Array.isArray(all.weekend) ? all.weekend : [5, 6];
      s.weekStart = Number.isInteger(all.weekStart) ? all.weekStart : 0;
      s.yearLayout = all.yearLayout ?? 'date';
      const narrow = NARROW.matches;
      s.scope = scopeFor(all.scope, narrow); // السنة والشهر الكامل والموسم الكامل للتطبيق الكامل فقط
      const two = s.scope === 'months2' || s.scope === 'periods2' ? twoRanges(s.scope, anchor(), s.system) : null;
      const preset = s.scope === 'year' ? GRID_PRESETS[s.yearLayout] : null;
      const r = two ? { start: two[0].start, end: two[1].end, label: `${two[0].label} ← ${two[1].label}` }
        : preset ? SPANS[preset.span].range(anchor()) : rangeFor(s.scope, anchor(), s.system);
      const prog = rangeProgress(s.tasks, r);
      const body = s.scope === 'year' ? yearView(s, r) : s.scope === 'day' ? dayView(s, r) : two ? agendaView(s, two)
        : s.scope === 'week' && narrow ? weekDaysView(s, r) : ganttView(s, r);
      const t0 = today();
      el.innerHTML = `<div class="pl">
        <div class="pl-top">
          <button type="button" class="pl-btn pl-scope" data-act="scope" ${tip(narrow ? 'بدّل العرض: يوم ← أسبوع ← شهران ← فترتان (السنة والشهر الكامل في التبويب الكامل)' : 'بدّل العرض: سنة ← موسم ← شهر ← أسبوع ← يوم')}>${icon(SCOPE_ICON[s.scope])}<span>${SCOPE_LABEL[s.scope]}</span></button>
          ${s.scope === 'year' ? `<button type="button" class="pl-btn" data-act="ylayout" ${tip('ترتيب السنة — اضغط للتبديل: بالتاريخ ← محاذاة باليوم ← أشهر ← أسابيع ← مواسم × أشهر ← طوالع × منازل')}>${icon({ date: 'format_list_numbered', weekday: 'view_week', months: 'calendar_view_month', weeks: 'view_agenda', seasonsMonths: 'filter_vintage', tawaliManazil: 'eco' }[s.yearLayout])}<span>${YEAR_LAYOUT_LABEL[s.yearLayout]}</span></button>` : ''}
          <button type="button" class="pl-btn" data-act="system" ${tip('نظام المواسم — اضغط للتبديل')}>${icon('eco')}<span>${SYSTEMS[s.system].label}</span></button>
          <span class="pl-nav">
            <button type="button" class="pl-btn" data-act="prev" ${tip('السابق')}>${icon('chevron_right')}</button>
            <b>${esc(r.label)}</b>
            <button type="button" class="pl-btn" data-act="next" ${tip('التالي')}>${icon('chevron_left')}</button>
            <button type="button" class="pl-btn" data-act="today" ${tip('اليوم')}>${icon('today')}</button>
            <button type="button" class="pl-btn" data-act="settings" aria-expanded="${showSettings}" ${tip('الإعدادات: عطلة نهاية الأسبوع')}>${icon('settings')}</button>
          </span>
          ${prog == null ? '' : `<span class="pl-chip" ${tip('إنجاز المهام في هذا النطاق (موزون بالأيام)')}>${prog}٪</span>`}
        </div>
        ${settings(s)}
        ${catsBar({ ...s, tasks: all.tasks }, r)}
        <div class="pl-body">${body}</div>
        ${laterBox(s)}
        ${editor(all)}
        <form class="pl-add" data-size="m l">
          <input name="name" maxlength="60" placeholder="مهمة جديدة…" aria-label="اسم المهمة" required>
          <input type="date" name="start" value="${t0}" aria-label="البداية">
          <input type="date" name="end" value="${addDays(t0, 6)}" aria-label="النهاية">
          <select name="category" aria-label="التصنيف">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === all.lastCat ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
          <button type="submit" name="when" value="dated" ${tip('أضف المهمة بتاريخيها')}>${icon('add')}</button>
          <button type="submit" name="when" value="later" class="pl-later-btn" ${tip('أضفها إلى «لاحقاً» بلا موعد')}>${icon('inbox')}</button>
        </form>
      </div>`;
      for (const n of el.querySelectorAll('[data-size]')) n.hidden = !n.dataset.size.split(' ').includes(ctx.size);
    }

    el.addEventListener('click', (e) => {
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
      if (act === 'ylayout') store.set({ yearLayout: nextYearLayout(s.yearLayout ?? 'date') });
      if (act === 'system') store.set({ system: nextSystem(s.system) });
      if (act === 'prev' || act === 'next') store.set({ anchor: shift(scopeFor(s.scope, NARROW.matches), anchor(), act === 'next' ? 1 : -1, s.system) });
      if (act === 'today') store.set({ anchor: null });
      if (act === 'cats-all') store.set({ hidden: (s.hidden ?? []).length ? [] : CATEGORIES.map((c) => c.id) });
      if (act === 'close') { editing = null; render(); }
      if (act === 'unschedule') { store.set({ tasks: s.tasks.map((t) => (t.id === editing ? unschedule(t) : t)) }); editing = null; render(); }
      if (act === 'del' && confirm('حذف المهمة؟')) { store.set({ tasks: s.tasks.filter((t) => t.id !== editing) }); editing = null; render(); }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-weekend-preset]') && WEEKEND_PRESETS[e.target.value]) store.set({ weekend: [...WEEKEND_PRESETS[e.target.value].days] });
      if (e.target.matches('[data-week-start]')) store.set({ weekStart: Number(e.target.value) });
    });
    el.addEventListener('input', (e) => {
      if (e.target.name === 'progress') e.target.nextElementSibling.textContent = `${e.target.value}٪`;
    });
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const s = store.get();
      if (e.target.matches('.pl-add')) {
        const later = e.submitter?.value === 'later';
        store.set({ tasks: [...s.tasks, makeTask({ ...f, ...(later ? { start: null, end: null } : {}), progress: 0 }, uid())], lastCat: f.category,
          hidden: (s.hidden ?? []).filter((x) => x !== f.category) }); // التصنيف المضاف إليه يظهر
      } else if (e.target.dataset.edit) {
        const id = e.target.dataset.edit;
        store.set({ tasks: s.tasks.map((t) => (t.id === id ? makeTask(f, id) : t)) });
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
