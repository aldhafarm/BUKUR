// «المخطط» (جانت) — طلب المالك: منظومة تخطيط تعرض المهام ونسب إنجازها داخل أي تقسيم للتقويم.
// زر واحد متعدد الضغطات يدور: سنة (شبكة ١٢ شهراً × ٣١ يوماً) ← موسم ← شهر ← أسبوع ← يوم.
// أنظمة المواسم كلها متاحة بزر ثانٍ: مواسم النجوم · الطوالع · الفصول الفلكية · أرباع السنة.
// المرحلة الأولى: مهام بمدة وتصنيف ونسبة إنجاز، وفرز بالتصنيف (كـ AnuCal)؛ والخطط والأهداف (عشرية ← سنوية ← يومية) لاحقاً فوقها.
import { icon, tip } from '../../icons.js';
import {
  CATEGORIES, colorOf, countByCategory, visibleTasks, MONTHS, SCOPE_LABEL, SYSTEMS, addDays, barFor, diffDays, key, makeTask, nextScope, nextSystem, parse, scopeFor, twoRanges, isWeekend, WEEKEND_PRESETS, DOW,
  periodAt, rangeFor, rangeProgress, shift, tasksIn, yearRows,
} from './plan.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const SCOPE_ICON = { year: 'grid_view', season: 'filter_vintage', month: 'calendar_view_month', week: 'calendar_view_week', day: 'calendar_view_day', months2: 'date_range', periods2: 'eco' };
const NARROW = typeof matchMedia === 'function' ? matchMedia('(max-width: 520px)') : { matches: false, addEventListener() {}, removeEventListener() {} }; // القائمة الجانبية
const DOW1 = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // حرف اليوم داخل خانة السنة (كـ AnuCal)

/** شريط مهمة: لونها، والجزء المنجز ممتلئ من بدايتها (اليمين). */
const bar = (t, b, extra = '') => `<button type="button" class="pl-task${b.clipStart ? ' cut-s' : ''}${b.clipEnd ? ' cut-e' : ''}" data-task="${esc(t.id)}"
  style="grid-column:${b.col + 1} / span ${b.span};--c:${colorOf(t)};--p:${Math.round(b.fill * 100)}%;${extra}" ${tip(`${t.name} · ${t.progress}٪ · ${t.start} ← ${t.end}`)}>
  <span>${b.span > 2 ? esc(t.name) : ''}</span></button>`;

export default {
  id: 'planner',
  name: 'المخطط',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaultWidth: 2,
  defaults: { tasks: [], scope: 'month', anchor: null, system: 'star', hidden: [], lastCat: 'work', weekend: [5, 6] }, // hidden: تصنيفات مطفأة · weekend: أيام العطلة الرسمية

  mount(el, ctx) {
    const store = ctx.store;
    let editing = null; // معرّف المهمة المفتوحة للتعديل
    const today = () => key(new Date());
    const anchor = () => store.get().anchor ?? today();

    function yearView(s, r) {
      const y = parse(r.start).getFullYear();
      const t0 = today();
      return `<div class="pl-year">${yearRows(s.tasks, y).map((row) => {
        const cells = Array.from({ length: 31 }, (_, i) => {
          if (i >= row.days) return '<i class="pl-off"></i>';
          const d = new Date(y, row.m, i + 1);
          const k = key(d);
          const p = periodAt(s.system, k);
          const wk = s.weekend.includes(d.getDay()) ? ' pl-wkend' : ''; // عطلة نهاية الأسبوع بحسب إعداد المستخدم
          return `<i style="--s:${p?.color ?? 'transparent'}" class="${k === t0 ? 'pl-now' : ''}${wk}" ${tip(`${i + 1} ${row.name}${p ? ` · ${p.name}` : ''}`)}><b>${i + 1}</b><s>${DOW1[d.getDay()]}</s></i>`;
        }).join('');
        const lanes = row.bars.map((b, i) => bar(b.t, b, `grid-row:${i + 2}`)).join('');
        return `<div class="pl-yrow"><b>${row.name.slice(0, 3)}</b><div class="pl-ydays">${cells}${lanes}</div></div>`;
      }).join('')}
        <div class="pl-yrow pl-yhead"><b></b><div class="pl-ydays">${Array.from({ length: 31 }, (_, i) => `<i>${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</i>`).join('')}</div></div>
      </div>`;
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
        return `<i class="${addDays(r.start, i) === t0 ? 'pl-now' : ''}${s.weekend.includes(d.getDay()) ? ' pl-fri' : ''}${minor}">${lab}</i>`;
      }).join('');
      const bands = Array.from({ length: n }, (_, i) => `<i style="--s:${periodAt(s.system, addDays(r.start, i))?.color ?? 'transparent'}"></i>`).join('');
      const list = tasksIn(s.tasks, r);
      const rows = list.map((t) => `<div class="pl-grow"><b ${tip(t.name)}>${esc(t.name)}</b><div class="pl-cells" style="--n:${n}">${bar(t, barFor(t, r))}</div></div>`).join('');
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
        return `<li class="${k === t0 ? 'pl-now' : ''}${isWeekend(k, s.weekend) ? ' pl-wkend' : ''}">
          <b>${DOW[d.getDay()]} <span>${d.getDate()} ${MONTHS[d.getMonth()]}</span></b>
          ${list.map((t) => `<button type="button" class="pl-chipt" data-task="${esc(t.id)}" style="--c:${colorOf(t)};--p:${t.progress}%" ${tip(`${t.name} · ${t.progress}٪`)}>${esc(t.name)}<em>${t.progress}٪</em></button>`).join('') || '<small>—</small>'}
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

    // ⚙ الإعدادات: أيام عطلة نهاية الأسبوع الرسمية (تختلف بين البلدان)
    let showSettings = false;
    function settings(s) {
      if (!showSettings) return '';
      const preset = Object.entries(WEEKEND_PRESETS).find(([, v]) => v.days.length === s.weekend.length && v.days.every((d) => s.weekend.includes(d)))?.[0] ?? 'custom';
      return `<div class="pl-set">
        <label>عطلة نهاية الأسبوع
          <select data-weekend-preset>${Object.entries(WEEKEND_PRESETS).map(([id, v]) => `<option value="${id}" ${id === preset ? 'selected' : ''}>${v.label}</option>`).join('')}
            <option value="custom" ${preset === 'custom' ? 'selected' : ''} disabled>مخصص</option></select></label>
        <div class="pl-wdays" role="group" aria-label="أيام العطلة">${DOW.map((n, i) => `<button type="button" data-wday="${i}" aria-pressed="${s.weekend.includes(i)}">${n}</button>`).join('')}</div>
      </div>`;
    }

    function editor(s) {
      const t = s.tasks.find((x) => x.id === editing);
      if (!t) return '';
      return `<form class="pl-edit" data-edit="${esc(t.id)}">
        <input name="name" value="${esc(t.name)}" maxlength="60" aria-label="اسم المهمة">
        <label>${icon('date_range')}<input type="date" name="start" value="${t.start}" aria-label="البداية"><input type="date" name="end" value="${t.end}" aria-label="النهاية"></label>
        <label class="pl-prog">${icon('check')}<input type="range" name="progress" min="0" max="100" step="5" value="${t.progress}" aria-label="نسبة الإنجاز"><output>${t.progress}٪</output></label>
        <div class="pl-colors" role="radiogroup" aria-label="التصنيف">${CATEGORIES.map((c) => `<label ${tip(c.label)}><input type="radio" name="category" value="${c.id}" ${c.id === t.category ? 'checked' : ''}><i style="background:${c.color}"></i></label>`).join('')}</div>
        <div class="pl-row">
          <button type="submit" ${tip('حفظ')}>${icon('check')}</button>
          <button type="button" data-act="del" ${tip('حذف المهمة')}>${icon('delete')}</button>
          <button type="button" data-act="close" ${tip('إغلاق')}>${icon('close')}</button>
        </div>
      </form>`;
    }

    function render() {
      const all = store.get();
      const s = { ...all, tasks: visibleTasks(all.tasks, all.hidden ?? []), hidden: all.hidden ?? [] }; // الفرز يسري على كل العروض والنسبة
      s.weekend = Array.isArray(all.weekend) ? all.weekend : [5, 6];
      const narrow = NARROW.matches;
      s.scope = scopeFor(all.scope, narrow); // السنة والشهر الكامل والموسم الكامل للتطبيق الكامل فقط
      const two = s.scope === 'months2' || s.scope === 'periods2' ? twoRanges(s.scope, anchor(), s.system) : null;
      const r = two ? { start: two[0].start, end: two[1].end, label: `${two[0].label} ← ${two[1].label}` } : rangeFor(s.scope, anchor(), s.system);
      const prog = rangeProgress(s.tasks, r);
      const body = s.scope === 'year' ? yearView(s, r) : s.scope === 'day' ? dayView(s, r) : two ? agendaView(s, two)
        : s.scope === 'week' && narrow ? weekDaysView(s, r) : ganttView(s, r);
      const t0 = today();
      el.innerHTML = `<div class="pl">
        <div class="pl-top">
          <button type="button" class="pl-btn pl-scope" data-act="scope" ${tip(narrow ? 'بدّل العرض: يوم ← أسبوع ← شهران ← فترتان (السنة والشهر الكامل في التبويب الكامل)' : 'بدّل العرض: سنة ← موسم ← شهر ← أسبوع ← يوم')}>${icon(SCOPE_ICON[s.scope])}<span>${SCOPE_LABEL[s.scope]}</span></button>
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
        ${editor(all)}
        <form class="pl-add" data-size="m l">
          <input name="name" maxlength="60" placeholder="مهمة جديدة…" aria-label="اسم المهمة" required>
          <input type="date" name="start" value="${t0}" aria-label="البداية">
          <input type="date" name="end" value="${addDays(t0, 6)}" aria-label="النهاية">
          <select name="category" aria-label="التصنيف">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === all.lastCat ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
          <button type="submit" ${tip('أضف المهمة')}>${icon('add')}</button>
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
      if (act === 'system') store.set({ system: nextSystem(s.system) });
      if (act === 'prev' || act === 'next') store.set({ anchor: shift(scopeFor(s.scope, NARROW.matches), anchor(), act === 'next' ? 1 : -1, s.system) });
      if (act === 'today') store.set({ anchor: null });
      if (act === 'cats-all') store.set({ hidden: (s.hidden ?? []).length ? [] : CATEGORIES.map((c) => c.id) });
      if (act === 'close') { editing = null; render(); }
      if (act === 'del' && confirm('حذف المهمة؟')) { store.set({ tasks: s.tasks.filter((t) => t.id !== editing) }); editing = null; render(); }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-weekend-preset]') && WEEKEND_PRESETS[e.target.value]) store.set({ weekend: [...WEEKEND_PRESETS[e.target.value].days] });
    });
    el.addEventListener('input', (e) => {
      if (e.target.name === 'progress') e.target.nextElementSibling.textContent = `${e.target.value}٪`;
    });
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const s = store.get();
      if (e.target.matches('.pl-add')) {
        store.set({ tasks: [...s.tasks, makeTask({ ...f, progress: 0 }, uid())], lastCat: f.category,
          hidden: (s.hidden ?? []).filter((x) => x !== f.category) }); // التصنيف المضاف إليه يظهر
      } else if (e.target.dataset.edit) {
        const id = e.target.dataset.edit;
        store.set({ tasks: s.tasks.map((t) => (t.id === id ? makeTask(f, id) : t)) });
        editing = null;
        render();
      }
    });

    const unsub = store.subscribe(render);
    const off = ctx.onResize(render);
    NARROW.addEventListener('change', render); // القائمة الجانبية ⇄ التبويب الكامل
    render();
    return () => { unsub(); off(); NARROW.removeEventListener('change', render); el.innerHTML = ''; };
  },
};
