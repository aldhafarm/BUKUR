// «متتبع العادات» (طلب المالك، ٨ نوفمبر): جدول أيام الشهر (٢٨–٣١) × العادات التي تريد الالتزام بها.
// كل خانة حلقة تقبل الضغط المتكرر: كاملة ← نصف ← ثلث ← ربع ← فارغة (habits.js).
// الأيام صفوف والعادات أعمدة: يناسب عرض القائمة الجانبية الضيق.
import { LEVEL_LABEL, arcPath, cycle, fractionOf, monthDays, monthScore, streak } from './habits.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DOW = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const HUES = [150, 25, 205, 45, 280, 0, 100, 330];
const MAX_HABITS = 8;

function ring(frac, hue, today) {
  const p = arcPath(frac);
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" fill="none" stroke="${today ? 'var(--orange)' : '#d9ccb6'}" stroke-width="${today ? 2 : 1.2}"/>
    ${p ? `<path d="${p}" fill="hsl(${hue} 55% 42%)"/>` : ''}
  </svg>`;
}

export default {
  id: 'habits',
  name: 'متتبع العادات',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaults: { habits: [], marks: {} },

  mount(el, ctx) {
    const now = new Date();
    let view = { y: now.getFullYear(), m: now.getMonth() };
    let armed = null; // حذف العادة يحتاج ضغطتين

    function render() {
      const { habits, marks } = ctx.store.get();
      const today = new Date();
      const tKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      let days = monthDays(view.y, view.m);
      // الحجم الصغير: آخر سبعة أيام من الشهر المعروض حتى اليوم
      if (ctx.size === 's') {
        const upto = days.filter((d) => d.key <= tKey);
        days = (upto.length ? upto : days).slice(-7);
      }
      const isCurrent = view.y === today.getFullYear() && view.m === today.getMonth();
      el.innerHTML = `
        <div class="hb">
          <div class="hb-head">
            <button type="button" data-month="-1" aria-label="الشهر السابق">→</button>
            <b>${MONTHS[view.m]} ${view.y}</b>
            <button type="button" data-month="1" aria-label="الشهر التالي">←</button>
            ${isCurrent ? '' : '<button type="button" data-month="0" class="hb-today">هذا الشهر</button>'}
          </div>
          ${habits.length ? `
          <div class="hb-scroll">
          <table class="hb-grid" style="--n:${habits.length}">
            <thead><tr><th scope="col" class="hb-day">اليوم</th>${habits.map((h, i) => `
              <th scope="col" title="${esc(h.name)}"><span class="hb-name" style="color:hsl(${HUES[i % HUES.length]} 55% 32%)">${esc(h.name)}</span></th>`).join('')}</tr></thead>
            <tbody>${days.map((d) => `
              <tr class="${d.key === tKey ? 'hb-now' : ''}${d.dow === 5 ? ' hb-fri' : ''}">
                <th scope="row" class="hb-day">${d.d} <small>${DOW[d.dow]}</small></th>
                ${habits.map((h, i) => {
                  const lvl = marks[h.id]?.[d.key] ?? 0;
                  const future = d.key > tKey;
                  return `<td><button type="button" class="hb-cell" data-h="${esc(h.id)}" data-k="${d.key}" ${future ? 'disabled' : ''}
                    aria-label="${esc(h.name)} — ${d.d} ${MONTHS[view.m]}: ${LEVEL_LABEL[lvl]}">${ring(fractionOf(lvl), HUES[i % HUES.length], d.key === tKey)}</button></td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
            <tfoot data-size="m l"><tr><th scope="row" class="hb-day">الشهر</th>${habits.map((h) => {
              const s = monthScore(marks, h.id, view.y, view.m, today);
              const k = streak(marks, h.id, today);
              return `<td class="hb-score"><b>${s.pct}٪</b>${k > 1 ? `<small>🔥${k}</small>` : ''}</td>`;
            }).join('')}</tr></tfoot>
          </table></div>` : '<p class="hb-empty">أضف عادة تريد الالتزام بها، ثم اضغط حلقة اليوم كلما أنجزتها.</p>'}
          <form class="hb-add" data-size="m l">
            <input name="h" maxlength="24" placeholder="عادة جديدة… (مثل: ورد، رياضة، قراءة)" aria-label="اسم العادة" ${habits.length >= MAX_HABITS ? 'disabled' : ''}>
            <button type="submit" ${habits.length >= MAX_HABITS ? 'disabled' : ''}>＋</button>
          </form>
          ${habits.length ? `<div class="hb-list" data-size="l">${habits.map((h) => `<button type="button" data-del="${esc(h.id)}">${armed === h.id ? 'اضغط مرة ثانية للحذف' : `× ${esc(h.name)}`}</button>`).join('')}</div>` : ''}
          <p class="hb-hint" data-size="l">ضغطة: تمت · ثانية: نصفها · ثالثة: ثلثها · رابعة: ربعها · خامسة: تُمسح. النسبة من الأيام المنقضية، و🔥 أيام كاملة متتالية.</p>
        </div>`;
      for (const n of el.querySelectorAll('[data-size]')) n.hidden = !n.dataset.size.split(' ').includes(ctx.size);
    }

    el.addEventListener('click', (e) => {
      const cell = e.target.closest('.hb-cell');
      if (cell) { ctx.store.set({ marks: cycle(ctx.store.get().marks, cell.dataset.h, cell.dataset.k) }); return; }
      const mb = e.target.closest('[data-month]');
      if (mb) {
        const d = Number(mb.dataset.month);
        const t = new Date();
        view = d === 0 ? { y: t.getFullYear(), m: t.getMonth() } : (() => { const x = new Date(view.y, view.m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; })();
        render();
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = del.dataset.del;
        if (armed !== id) { armed = id; render(); setTimeout(() => { if (armed === id) { armed = null; render(); } }, 3000); return; }
        armed = null;
        const { habits, marks } = ctx.store.get();
        const rest = { ...marks }; delete rest[id];
        ctx.store.set({ habits: habits.filter((h) => h.id !== id), marks: rest });
      }
    });
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const name = input.value.trim();
      const { habits } = ctx.store.get();
      if (!name || habits.length >= MAX_HABITS) return;
      ctx.store.set({ habits: [...habits, { id: uid(), name }] });
      el.querySelector('.hb-add input')?.focus();
    });

    const unsub = ctx.store.subscribe(render);
    const off = ctx.onResize(render);
    render();
    return () => { unsub(); off(); el.innerHTML = ''; };
  },
};
