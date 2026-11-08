// ودجة ملاحظات بسيطة — ثانية الودجات، لتجربة الترتيب والطي والإخفاء. حفظ تلقائي.
export default {
  id: 'notes',
  name: 'ملاحظات',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaults: { text: '' },

  mount(el, ctx) {
    el.innerHTML = `<textarea class="nt-text" placeholder="اكتب ملاحظة… تُحفظ تلقائياً" aria-label="ملاحظات"></textarea>`;
    const area = el.querySelector('textarea');
    area.value = ctx.store.get().text;
    const rows = { s: 3, m: 6, l: 12 };
    const applySize = (size) => { area.rows = rows[size] ?? 6; };
    let pending;
    area.addEventListener('input', () => {
      clearTimeout(pending);
      pending = setTimeout(() => ctx.store.set({ text: area.value }), 300);
    });
    const offResize = ctx.onResize(applySize);
    applySize(ctx.size);
    return () => {
      clearTimeout(pending);
      ctx.store.set({ text: area.value });
      offResize();
      el.innerHTML = '';
    };
  },
};
