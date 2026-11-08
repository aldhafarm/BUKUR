// ودجة «أقوال الأعلام» — تُربط لاحقاً بأداة «الأعلام» (نفس العلماء ونفس البيانات).
// القاعدة: لا قول بلا مصدر. كل قول هنا نصّه حرفياً من المكتبة الشاملة مع كتابه وجزئه وصفحته؛
// ومن لم يُعثر له على قول موثّق يظهر بلا قول بدل قولٍ منسوب لا يصح.
// الصور رمزية (نجمة هندسية) — لا صور حقيقية لهؤلاء الأعلام.

import { fetchWiki } from './wiki.js';

const DATA_URL = new URL('./alam.json', import.meta.url).href;
const WIKI_TTL = 7 * 86_400_000; // تُحدَّث صورة العَلَم ومعلوماته من ويكي داتا أسبوعياً

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

// كتب العَلَم من ويكي داتا (P800): غلاف واحد، ويتوسّع لبقية كتبه
function cover(w) {
  const pic = w.image
    ? `<img src="${esc(w.image.thumb)}" alt="${esc(w.title)}" loading="lazy" referrerpolicy="no-referrer">`
    : '<span class="qt-book-ph" aria-hidden="true">📖</span>';
  return `<a class="qt-book" href="${esc(w.image?.page ?? w.url)}" target="_blank" rel="noopener" title="${esc(w.title)}">${pic}<span>${esc(w.title)}</span></a>`;
}
function booksMarkup(works, open) {
  if (!works?.length) return '';
  const first = works.find((x) => x.image) ?? works[0];
  const list = open ? works : [first];
  return `<div class="qt-books" data-open="${open}">
      <div class="qt-shelf">${list.map(cover).join('')}</div>
      ${works.length > 1 ? `<button type="button" class="qt-more" data-books>${open ? 'إخفاء ▴' : `كتبه (${works.length}) ▾`}</button>` : ''}
      <small class="qt-books-note">من ويكي داتا · الصور من كومنز وقد تكون مخطوطة أو طبعة قديمة لا غلافاً حديثاً</small>
    </div>`;
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
  defaults: { pick: null, wiki: {} }, // pick: null = قول اليوم · wiki: ذاكرة ويكي داتا لكل عَلَم

  mount(el, ctx) {
    el.innerHTML = `<div class="qt"><p class="qt-loading">…</p></div>`;
    const root = el.querySelector('.qt');
    let alam = [];
    let alive = true;
    const inflight = new Set();
    let showBooks = false; // عرض كل كتب العَلَم
    const failedAt = new Map(); // لا إعادة محاولة قبل ٥ دقائق بعد فشل الاتصال

    // صورة العَلَم ومعلوماته من ويكي داتا/ويكيبيديا — عند عرضه أول مرة، ثم من الذاكرة أسبوعاً
    function wikiFor(a) {
      const cached = ctx.store.get().wiki?.[a.id];
      if (a.enwiki && (!cached || Date.now() - cached.at > WIKI_TTL) && !inflight.has(a.id) && !(Date.now() - (failedAt.get(a.id) ?? 0) < 300_000)) {
        inflight.add(a.id);
        fetchWiki(a.enwiki)
          .then((data) => { if (alive) ctx.store.set({ wiki: { ...ctx.store.get().wiki, [a.id]: { data, at: Date.now() } } }); })
          .catch(() => { failedAt.set(a.id, Date.now()); /* بلا اتصال: تبقى النجمة الرمزية */ })
          .finally(() => inflight.delete(a.id));
      }
      return cached?.data ?? null;
    }

    // كل (عَلَم، قول) عنصرٌ يُعرض؛ ومن لا قول له يظهر في القائمة فقط
    const entries = () => alam.flatMap((a) => (a.quotes ?? []).map((q, qi) => ({ a, q, key: `${a.id}:${qi}` })));

    function render() {
      const list = entries();
      const pick = ctx.store.get().pick;
      let i = list.findIndex((e) => e.key === pick);
      // اختيار عَلَم بلا قول موثّق: تظهر بطاقته وحدها (لا «قول اليوم» بدلاً منه)
      const chosenAlam = pick && i < 0 ? alam.find((a) => a.id === pick) ?? null : null;
      if (i < 0) i = dailyIndex(list, new Date());
      const cur = chosenAlam ? null : list[i];
      const a = chosenAlam ?? cur?.a;
      if (!a) { root.innerHTML = '<p class="qt-empty">لا بيانات بعد.</p>'; return; }
      const hue = (alam.indexOf(a) * 36) % 360;
      const w = wikiFor(a);
      const avatar = w?.image
        ? `<figure class="qt-fig"><img class="qt-img" src="${esc(w.image.thumb)}" alt="${esc(a.name)} — صورة تخيّلية" loading="lazy" referrerpolicy="no-referrer">
             <figcaption><a href="${esc(w.image.page)}" target="_blank" rel="noopener">صورة تخيّلية · كومنز</a></figcaption></figure>`
        : star(esc(a.name.replace(/^(ابن|أبو)\s+/, '')[0]), hue);
      root.innerHTML = `
        <div class="qt-head">
          ${avatar}
          <div class="qt-who">
            <b>${esc(a.name)}</b>
            ${w?.description ? `<span class="qt-desc">${esc(w.description)}</span>` : ''}
            <span>${[a.died?.hijri && `ت ${esc(a.died.hijri)}هـ`, a.died?.gregorian && `${esc(a.died.gregorian)}م`, a.field && esc(a.field)].filter(Boolean).join(' · ')}</span>
            ${a.famousBook ? `<span>أشهر كتبه: ${esc(a.famousBook)}</span>` : ''}
          </div>
        </div>
        ${booksMarkup(w?.works, showBooks)}
        ${cur && !chosenAlam ? `
          <blockquote class="qt-text">${esc(cur.q.text)}</blockquote>
          <p class="qt-src">${cur.q.kind === 'reported' ? 'نُقل عنه في ' : 'من '}${citation(cur.q.source)}</p>
          ${cur.q.note ? `<p class="qt-note">${esc(cur.q.note)}</p>` : ''}` :
          `<p class="qt-empty">${STATUS_LABEL.unverified} — لا نعرض قولاً منسوباً حتى يُوثَّق من مصدره.</p>`}
        <p class="qt-badge" data-status="${esc(a.status)}">${STATUS_LABEL[a.status] ?? ''}</p>
        ${w?.extract ? `<p class="qt-wiki" data-size="l">${esc(w.extract)}<br><small>من <a href="${esc(w.wikipediaUrl)}" target="_blank" rel="noopener">ويكيبيديا</a> · <a href="${esc(w.wikidataUrl)}" target="_blank" rel="noopener">ويكي داتا</a> (معلومات عامة، غير موثّقة كالأقوال)</small></p>` : ''}
        ${a.bioSummary ? `<p class="qt-bio" data-size="l">${esc(a.bioSummary)}<br><small>المصدر: ${citation(a.bioSource)}</small></p>` : ''}
        <div class="qt-nav" data-size="m l">
          <button type="button" data-step="1" aria-label="السابق">→</button>
          <button type="button" data-today>قول اليوم</button>
          <button type="button" data-step="-1" aria-label="التالي">←</button>
        </div>
        <div class="qt-chips" data-size="l">${alam.map((x) => `<button type="button" data-alam="${esc(x.id)}" aria-pressed="${x.id === a.id}" ${x.quotes?.length ? '' : 'data-empty'}>${esc(x.name)}</button>`).join('')}</div>`;
      const img = root.querySelector('.qt-img');
      img?.addEventListener('error', () => { img.closest('.qt-fig').outerHTML = star(esc(a.name.replace(/^(ابن|أبو)\s+/, '')[0]), hue); });
      applySize(ctx.size);
      root.querySelector('[data-step="1"]')?.addEventListener('click', () => step(-1, list, i));
      root.querySelector('[data-step="-1"]')?.addEventListener('click', () => step(1, list, i));
    }

    function step(d, list, i) {
      if (!list.length) return;
      ctx.store.set({ pick: list[(i + d + list.length) % list.length].key });
    }

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-books]')) { showBooks = !showBooks; render(); return; }
      if (e.target.closest('[data-today]')) ctx.store.set({ pick: null });
      const chip = e.target.closest('[data-alam]');
      if (chip) {
        showBooks = false;
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
