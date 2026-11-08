// ودجة «أقوال الأعلام» — تُربط لاحقاً بأداة «الأعلام» (نفس العلماء ونفس البيانات).
// القاعدة: لا قول بلا مصدر. كل قول هنا نصّه حرفياً من المكتبة الشاملة مع كتابه وجزئه وصفحته؛
// ومن لم يُعثر له على قول موثّق يظهر بلا قول بدل قولٍ منسوب لا يصح.
// الصور رمزية (نجمة هندسية) — لا صور حقيقية لهؤلاء الأعلام.

const DATA_URL = new URL('./alam.json', import.meta.url).href;

const STATUS_LABEL = { verified: 'موثّق من الشاملة', partial: 'موثّق جزئياً', unverified: 'لا قول موثّق بعد' };

function star(initial, hue) {
  // نجمة ثمانية (مربعان متراكبان) بحرف أول — صورة رمزية لا تدّعي شبهاً
  return `<svg viewBox="0 0 100 100" class="qt-star" aria-hidden="true">
    <rect x="22" y="22" width="56" height="56" rx="3" fill="hsl(${hue} 40% 30%)"/>
    <rect x="22" y="22" width="56" height="56" rx="3" fill="hsl(${hue} 45% 38%)" transform="rotate(45 50 50)"/>
    <circle cx="50" cy="50" r="22" fill="#fbf7f0"/>
    <text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="24" font-weight="700" fill="hsl(${hue} 40% 25%)">${initial}</text>
  </svg>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function citation(src) {
  if (!src) return '';
  const parts = [src.book && `«${esc(src.book)}»`, src.author && esc(src.author), src.part && `ج${esc(src.part)}`, src.page && `ص${esc(src.page)}`].filter(Boolean);
  const auto = src.numbering && /آلي/.test(src.numbering) ? ' (بترقيم الشاملة آليًّا)' : '';
  return parts.join('، ') + auto;
}

// «قول اليوم»: يتبدّل يومياً بين من لهم أقوال موثّقة، ثابت طوال اليوم
function dailyIndex(items, date) {
  const day = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86_400_000);
  return items.length ? day % items.length : 0;
}

export default {
  id: 'quotes',
  name: 'أقوال الأعلام',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaults: { pick: null }, // null = قول اليوم

  mount(el, ctx) {
    el.innerHTML = `<div class="qt"><p class="qt-loading">…</p></div>`;
    const root = el.querySelector('.qt');
    let alam = [];
    let alive = true;

    // كل (عَلَم، قول) عنصرٌ يُعرض؛ ومن لا قول له يظهر في القائمة فقط
    const entries = () => alam.flatMap((a) => (a.quotes ?? []).map((q, qi) => ({ a, q, key: `${a.id}:${qi}` })));

    function render() {
      const list = entries();
      const pick = ctx.store.get().pick;
      let i = list.findIndex((e) => e.key === pick);
      if (i < 0) i = dailyIndex(list, new Date());
      const cur = list[i];
      const chosenAlam = pick && !cur ? alam.find((a) => a.id === pick) : null;
      const a = chosenAlam ?? cur?.a;
      if (!a) { root.innerHTML = '<p class="qt-empty">لا بيانات بعد.</p>'; return; }
      const hue = (alam.indexOf(a) * 36) % 360;
      root.innerHTML = `
        <div class="qt-head">
          ${star(esc(a.name.replace(/^(ابن|أبو)\s+/, '')[0]), hue)}
          <div class="qt-who">
            <b>${esc(a.name)}</b>
            <span>${[a.died?.hijri && `ت ${esc(a.died.hijri)}هـ`, a.died?.gregorian && `${esc(a.died.gregorian)}م`, a.field && esc(a.field)].filter(Boolean).join(' · ')}</span>
            ${a.famousBook ? `<span>أشهر كتبه: ${esc(a.famousBook)}</span>` : ''}
          </div>
        </div>
        ${cur && !chosenAlam ? `
          <blockquote class="qt-text">${esc(cur.q.text)}</blockquote>
          <p class="qt-src">${cur.q.kind === 'reported' ? 'نُقل عنه في ' : 'من '}${citation(cur.q.source)}</p>
          ${cur.q.note ? `<p class="qt-note" data-size="l">${esc(cur.q.note)}</p>` : ''}` :
          `<p class="qt-empty">${STATUS_LABEL.unverified} — لا نعرض قولاً منسوباً حتى يُوثَّق من مصدره.</p>`}
        <p class="qt-badge" data-status="${esc(a.status)}">${STATUS_LABEL[a.status] ?? ''}</p>
        ${a.bioSummary ? `<p class="qt-bio" data-size="l">${esc(a.bioSummary)}<br><small>المصدر: ${citation(a.bioSource)}</small></p>` : ''}
        <div class="qt-nav" data-size="m l">
          <button type="button" data-step="1" aria-label="السابق">→</button>
          <button type="button" data-today>قول اليوم</button>
          <button type="button" data-step="-1" aria-label="التالي">←</button>
        </div>
        <div class="qt-chips" data-size="l">${alam.map((x) => `<button type="button" data-alam="${esc(x.id)}" aria-pressed="${x.id === a.id}" ${x.quotes?.length ? '' : 'data-empty'}>${esc(x.name)}</button>`).join('')}</div>`;
      applySize(ctx.size);
      root.querySelector('[data-step="1"]')?.addEventListener('click', () => step(-1, list, i));
      root.querySelector('[data-step="-1"]')?.addEventListener('click', () => step(1, list, i));
    }

    function step(d, list, i) {
      if (!list.length) return;
      ctx.store.set({ pick: list[(i + d + list.length) % list.length].key });
    }

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-today]')) ctx.store.set({ pick: null });
      const chip = e.target.closest('[data-alam]');
      if (chip) {
        const first = entries().find((x) => x.a.id === chip.dataset.alam);
        ctx.store.set({ pick: first ? first.key : chip.dataset.alam });
      }
    });

    function applySize(size) {
      for (const node of root.querySelectorAll('[data-size]')) node.hidden = !node.dataset.size.split(' ').includes(size);
    }

    fetch(DATA_URL).then((r) => r.json()).then((d) => { if (alive) { alam = d; render(); } })
      .catch(() => { if (alive) root.innerHTML = '<p class="qt-empty">تعذّر تحميل الأقوال.</p>'; });

    const unsub = ctx.store.subscribe(render);
    const off = ctx.onResize(applySize);
    return () => { alive = false; unsub(); off(); el.innerHTML = ''; };
  },
};
