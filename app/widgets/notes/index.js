// ودجة الملاحظات — حفظ تلقائي، ومعها «الاستذكار المتباعد» (طلب المالك، ٨ نوفمبر):
// أي سطر أو نص محدد يُضاف بطاقةَ مراجعة، وتظهر البطاقات المستحقة يومياً بفترات لايتنر المتزايدة (sr.js).
import { dueItems, facesOf, newItem, pickText, review, whenLabel } from './sr.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);

export default {
  id: 'notes',
  name: 'ملاحظات',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaults: { text: '', tab: 'note', srOn: false, cards: [] },

  mount(el, ctx) {
    el.innerHTML = `
      <div class="nt">
        <div class="nt-bar">
          <div class="nt-tabs" role="tablist">
            <button type="button" role="tab" data-tab="note">ملاحظة</button>
            <button type="button" role="tab" data-tab="sr" hidden>استذكار <span class="nt-due"></span></button>
          </div>
          <label class="nt-switch" title="تتبّع الاستذكار المتباعد لما تضيفه من الملاحظة"><input type="checkbox" data-sr-on> تابع الاستذكار</label>
        </div>
        <div class="nt-pane" data-pane="note">
          <textarea class="nt-text" placeholder="اكتب ملاحظة… تُحفظ تلقائياً" aria-label="ملاحظات"></textarea>
          <div class="nt-add" hidden>
            <button type="button" data-add>＋ أضف السطر للاستذكار</button>
            <span class="nt-hint">ضع المؤشر على سطر أو حدّد نصاً. «سؤال: جواب» تصير بطاقة بوجهين.</span>
          </div>
        </div>
        <div class="nt-pane" data-pane="sr" hidden></div>
      </div>`;
    const area = el.querySelector('textarea');
    const srPane = el.querySelector('[data-pane="sr"]');
    area.value = ctx.store.get().text;
    const rows = { s: 3, m: 6, l: 12 };
    let toast = '';
    const shown = new Set(); // بطاقات كُشف جوابها

    function save(patch) { ctx.store.set(patch); }

    function paint() {
      const st = ctx.store.get();
      const today = new Date();
      const cards = st.cards ?? [];
      const due = dueItems(cards, today);
      el.querySelector('[data-sr-on]').checked = !!st.srOn;
      el.querySelector('.nt-add').hidden = !st.srOn;
      const srTab = el.querySelector('[data-tab="sr"]');
      srTab.hidden = !st.srOn;
      el.querySelector('.nt-due').textContent = due.length ? `(${due.length})` : '';
      const tab = st.srOn ? st.tab : 'note';
      for (const b of el.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', b.dataset.tab === tab);
      for (const p of el.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== tab;
      if (tab !== 'sr') return;
      const upcoming = cards.filter((c) => !due.includes(c)).sort((a, b) => (a.due < b.due ? -1 : 1));
      srPane.innerHTML = `
        ${toast ? `<p class="nt-toast">${esc(toast)}</p>` : ''}
        ${due.length ? `<p class="nt-sub">للمراجعة اليوم: ${due.length}</p>
          <ul class="nt-cards">${due.map((c) => `
            <li data-id="${esc(c.id)}">
              ${(() => {
                const f = facesOf(c);
                const open = !f.back || shown.has(c.id);
                return `<p class="nt-q">${esc(f.front)}</p>
                  ${f.back ? (open ? `<p class="nt-a">${esc(f.back)}</p>` : '<button type="button" data-show class="nt-show">اكشف الجواب</button>') : ''}
                  <p class="nt-meta">الصندوق ${c.box + 1} من ٧ · ${esc(whenLabel(c, today))}</p>
                  ${open ? `<div class="nt-acts">
                    <button type="button" data-rev="1" class="nt-ok">✓ تذكّرتها</button>
                    <button type="button" data-rev="0" class="nt-no">✗ نسيتها</button>
                  </div>` : ''}`;
              })()}
            </li>`).join('')}</ul>`
          : `<p class="nt-sub">${cards.length ? 'لا مراجعة اليوم ✓' : 'لا بطاقات بعد. اكتب في «ملاحظة» ثم «أضف السطر للاستذكار».'}</p>`}
        ${upcoming.length ? `<details class="nt-next" data-size="m l"><summary>القادمة (${upcoming.length})</summary>
          <ul>${upcoming.map((c) => `<li data-id="${esc(c.id)}"><span>${esc(facesOf(c).front)}</span><small>${esc(whenLabel(c, today))} · صندوق ${c.box + 1}</small><button type="button" data-del aria-label="حذف">×</button></li>`).join('')}</ul></details>` : ''}
        <p class="nt-hint" data-size="l">المراجعة بعد يوم، ثم ٣ أيام، ثم أسبوع، ثم أسبوعين، ثم شهر، ثم أشهر. «نسيتها» تعيدها للبداية.</p>`;
      applySize(ctx.size);
    }

    function applySize(size) {
      area.rows = rows[size] ?? 6;
      for (const n of el.querySelectorAll('[data-size]')) n.hidden = !n.dataset.size.split(' ').includes(size);
    }

    let pending;
    area.addEventListener('input', () => {
      clearTimeout(pending);
      pending = setTimeout(() => save({ text: area.value }), 300);
    });

    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-sr-on]')) save({ srOn: e.target.checked, tab: e.target.checked ? ctx.store.get().tab : 'note' });
    });
    el.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { toast = ''; save({ tab: tabBtn.dataset.tab }); return; }
      if (e.target.closest('[data-add]')) {
        const text = pickText(area.value, area.selectionStart, area.selectionEnd);
        const hint = el.querySelector('.nt-add .nt-hint');
        if (!text) { hint.textContent = 'السطر فارغ: ضع المؤشر على سطر فيه نص.'; return; }
        const cards = ctx.store.get().cards ?? [];
        if (cards.some((c) => c.text === text)) { hint.textContent = 'هذا النص مضاف من قبل.'; return; }
        save({ text: area.value, cards: [...cards, newItem(text, new Date(), uid())] });
        hint.textContent = `أُضيف — أول مراجعة غداً: «${text.slice(0, 40)}»`;
        return;
      }
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const id = li.dataset.id;
      const cards = ctx.store.get().cards ?? [];
      if (e.target.closest('[data-show]')) { shown.add(id); paint(); return; }
      const rev = e.target.closest('[data-rev]');
      if (rev) {
        const ok = rev.dataset.rev === '1';
        shown.delete(id);
        const next = cards.map((c) => (c.id === id ? review(c, ok, new Date()) : c));
        const c = next.find((x) => x.id === id);
        toast = ok ? `✓ المراجعة القادمة ${whenLabel(c, new Date())}` : '↺ تعود غداً من البداية';
        save({ cards: next });
        return;
      }
      if (e.target.closest('[data-del]')) save({ cards: cards.filter((c) => c.id !== id) });
    });

    const unsub = ctx.store.subscribe(paint);
    const offResize = ctx.onResize(applySize);
    paint();
    applySize(ctx.size);
    // يتجدد عدّ المستحقة عند بداية يوم جديد والقائمة مفتوحة
    const daily = setInterval(paint, 10 * 60_000);
    return () => {
      clearTimeout(pending);
      clearInterval(daily);
      ctx.store.set({ text: area.value });
      unsub();
      offResize();
      el.innerHTML = '';
    };
  },
};
