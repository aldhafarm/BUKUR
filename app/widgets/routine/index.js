// «الروتين اليومي» (فكرة المالك، ٩ نوفمبر ٢٠٢٦): حلقة ٢٤ ساعة كدائرة «Creative Routines» —
// منتصف الليل أعلى، ٦ صباحاً يميناً، الظهر أسفل، ٦ مساءً يساراً. يبدأ من النوم (الموعد + الساعات = الاستيقاظ)،
// والنوم عادة تُتتبَّع كل صباح. ودجت مستقل؛ ربطه بالساعة والمخطط لاحقاً (قرار المالك).
import { icon, tip } from '../../icons.js';
import { arcPath } from '../habits/habits.js';
import { CATS, CAT_IDS, MASTER_TEMPLATE, allBlocks, blockAt, cycleSleep, fmtHours, fractionOf, leftIn, sleepScore, span, toMin, totals } from './routine.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW1 = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const withIds = (bs) => bs.map((b) => ({ ...b, id: uid() }));

// الحلقة: الزاوية من القمة مع عقارب الساعة (منتصف الليل أعلى)
const C = 100, R1 = 92, R0 = 64;
const pt = (m, r) => { const a = (m / 1440) * 2 * Math.PI; return [C + r * Math.sin(a), C - r * Math.cos(a)]; };
function sector(a, b) {
  const len = (b - a + 1440) % 1440 || 1440;
  const big = len > 720 ? 1 : 0;
  const [x1, y1] = pt(a, R1), [x2, y2] = pt(a + len, R1), [x3, y3] = pt(a + len, R0), [x4, y4] = pt(a, R0);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${R1} ${R1} 0 ${big} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}L${x3.toFixed(2)} ${y3.toFixed(2)}A${R0} ${R0} 0 ${big} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`;
}

function dial(blocks, now) {
  const m = now.getHours() * 60 + now.getMinutes();
  const cur = blockAt(blocks, m);
  const segs = blocks.map((b) => {
    const a = toMin(b.start), len = span(b.start, b.end);
    const [lx, ly] = pt(a + len / 2, (R0 + R1) / 2);
    // الاسم يتسع لنحو حرف لكل ١٥ دقيقة من الكتلة؛ وإلا الكلمة الأولى، وإلا لا شيء
    const fit = b.name.length * 15 <= len ? b.name : b.name.split(/\s+/)[0].length * 15 <= len ? b.name.split(/\s+/)[0] : '';
    const label = len >= 60 && fit ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="rt-lab${b.cat === 'sleep' ? ' dark' : ''}">${esc(fit)}</text>` : '';
    return `<path d="${sector(a, a + len)}" fill="${CATS[b.cat].color}" class="${b === cur ? 'on' : ''}"><title>${esc(b.name)}: ${b.start}–${b.end} (${fmtHours(len)} س)</title></path>${label}`;
  }).join('');
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21].map((h) => { const [x, y] = pt(h * 60, R0 - 9); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="rt-hr">${h}</text>`; }).join('');
  const [hx, hy] = pt(m, R1 + 5), [ix, iy] = pt(m, R0 - 16); // مؤشر على الحلقة لا يمر بنص المركز
  return `<svg viewBox="0 0 200 200" class="rt-svg" role="img" aria-label="حلقة الروتين اليومي">
      <circle cx="${C}" cy="${C}" r="${(R0 + R1) / 2}" fill="none" stroke="#efe7d8" stroke-width="${R1 - R0}"/>
      ${segs}${ticks}
      <line x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" class="rt-hand"/><circle cx="${ix.toFixed(1)}" cy="${iy.toFixed(1)}" r="2.5" class="rt-hub"/>
    </svg>
    <div class="rt-center"><b>${pad(now.getHours())}:${pad(now.getMinutes())}</b>
      ${cur ? `<span style="--c:${CATS[cur.cat].color}">${esc(cur.name)}</span><small>بقي ${fmtHours(leftIn(cur, m))}</small>` : '<span>وقت حرّ</span>'}</div>`;
}

export default {
  id: 'routine',
  name: 'الروتين اليومي',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  // القالب: روتين المالك أيام الماجستير (نوم ٢٢:٠٠ لـ ٥.٥ ساعة)
  defaults: { bed: '22:00', sleepHours: 5.5, blocks: null, sleepLog: {}, editing: false },

  mount(el, ctx) {
    const st = () => { const s = ctx.store.get(); return { ...s, blocks: s.blocks ?? withIds(MASTER_TEMPLATE) }; };
    let rendering = false, again = false;
    function render() {
      if (rendering) { again = true; return; }
      rendering = true;
      try { draw(); } finally { rendering = false; }
      if (again) { again = false; render(); }
    }
    function draw() {
      const s = st();
      const blocks = allBlocks(s);
      const sl = blocks[0];
      const t = totals(blocks);
      const today = dayKey(new Date());
      const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return { k: dayKey(d), dow: d.getDay() }; });
      const ring = (f, big) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="${big ? 'var(--orange, #e07a2e)' : '#d9ccb6'}" stroke-width="${big ? 2 : 1.2}"/>${arcPath(f) ? `<path d="${arcPath(f)}" fill="#6b7a99"/>` : ''}</svg>`;
      el.innerHTML = `<div class="rt">
        <div class="rt-dial">${dial(blocks, new Date())}</div>
        <ul class="rt-totals">${CAT_IDS.filter((c) => t.byCat[c]).map((c) => `<li style="--c:${CATS[c].color}" ${tip(CATS[c].label)}><i></i>${CATS[c].label}<b>${fmtHours(t.byCat[c])}</b></li>`).join('')}
          ${t.free ? `<li class="free" ${tip('ساعات غير مخصّصة')}><i></i>حرّ<b>${fmtHours(t.free)}</b></li>` : ''}</ul>
        ${t.overlap ? `<p class="rt-warn">${icon('warning')} تداخل ${fmtHours(t.overlap)} — كتلتان في الوقت نفسه</p>` : ''}
        <section class="rt-sleep">
          <h4>${icon('bedtime')} النوم</h4>
          <div class="rt-srow">
            <label>أنام <input type="time" data-f="bed" value="${esc(s.bed)}"></label>
            <label>ساعات <input type="number" data-f="sleepHours" min="4" max="12" step="0.5" value="${s.sleepHours}"></label>
            <span ${tip('موعد الاستيقاظ = موعد النوم + الساعات')}>أستيقظ <b>${sl.end}</b></span>
          </div>
          ${s.sleepHours < 7 ? `<p class="rt-note" ${tip('Watson et al. (2015), Sleep 38(6)')}>أقل من ٧ ساعات، وهي التوصية العامة للبالغين.</p>` : ''}
          <div class="rt-log">
            <span>نمت في موعدي؟</span>
            ${last7.map((d) => `<button type="button" class="rt-day${d.k === today ? ' today' : ''}" data-sleep="${d.k}" ${tip(`${d.k}: اضغط — كامل ← ½ ← ⅓ ← ¼ ← فارغ`)}>${ring(fractionOf(s.sleepLog?.[d.k]), d.k === today)}<s>${DOW1[d.dow]}</s></button>`).join('')}
            <em ${tip('الالتزام في آخر ٧ أيام')}>${sleepScore(s.sleepLog, today)}٪</em>
          </div>
        </section>
        <details class="rt-edit" ${s.editing ? 'open' : ''}>
          <summary>${icon('edit_calendar')} تعديل الروتين</summary>
          <ul class="rt-blocks">${s.blocks.map((b) => `<li style="--c:${CATS[b.cat]?.color ?? '#999'}">
            <input data-b="${esc(b.id)}" data-k="name" value="${esc(b.name)}" maxlength="30" aria-label="اسم الكتلة">
            <select data-b="${esc(b.id)}" data-k="cat" aria-label="الفئة">${CAT_IDS.filter((c) => c !== 'sleep' || b.cat === 'sleep').concat(b.cat === 'sleep' ? [] : ['sleep']).map((c) => `<option value="${c}" ${c === b.cat ? 'selected' : ''}>${CATS[c].label}</option>`).join('')}</select>
            <input type="time" data-b="${esc(b.id)}" data-k="start" value="${esc(b.start)}" aria-label="البداية">
            <input type="time" data-b="${esc(b.id)}" data-k="end" value="${esc(b.end)}" aria-label="النهاية">
            <button type="button" data-del="${esc(b.id)}" ${tip('احذف الكتلة')}>${icon('delete')}</button></li>`).join('')}</ul>
          <form class="rt-add">
            <input name="name" maxlength="30" placeholder="كتلة جديدة…" required aria-label="اسم الكتلة">
            <select name="cat" aria-label="الفئة">${CAT_IDS.map((c) => `<option value="${c}">${CATS[c].label}</option>`).join('')}</select>
            <input type="time" name="start" required aria-label="البداية"><input type="time" name="end" required aria-label="النهاية">
            <button type="submit" ${tip('أضف الكتلة')}>${icon('add')}</button>
          </form>
          <button type="button" class="rt-reset" data-act="template" ${tip('استبدل الكتل بروتين الماجستير (النوم لا يتغيّر)')}>${icon('restart_alt')} قالب روتين الماجستير</button>
        </details>
      </div>`;
    }

    // تحديث العقرب والمركز فقط كل ٣٠ ثانية — لا يُعاد رسم الحقول فلا يضيع ما تكتبه
    const tick = setInterval(() => { const d = el.querySelector('.rt-dial'); if (d) d.innerHTML = dial(allBlocks(st()), new Date()); }, 30000);

    el.addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      if (f === 'bed' && toMin(e.target.value) != null) ctx.store.set({ bed: e.target.value });
      if (f === 'sleepHours') ctx.store.set({ sleepHours: Math.min(12, Math.max(4, Number(e.target.value) || 7)) });
      const id = e.target.dataset.b;
      if (id) {
        const k = e.target.dataset.k;
        const v = e.target.value;
        if ((k === 'start' || k === 'end') && toMin(v) == null) return;
        ctx.store.set({ blocks: st().blocks.map((b) => (b.id === id ? { ...b, [k]: k === 'name' ? (v.trim() || b.name) : v } : b)), editing: true });
      }
    });
    el.addEventListener('click', (e) => {
      const sday = e.target.closest('[data-sleep]')?.dataset.sleep;
      if (sday) { ctx.store.set({ sleepLog: cycleSleep(ctx.store.get().sleepLog, sday) }); return; }
      const del = e.target.closest('[data-del]')?.dataset.del;
      if (del) { ctx.store.set({ blocks: st().blocks.filter((b) => b.id !== del), editing: true }); return; }
      if (e.target.closest('[data-act="template"]') && confirm('استبدال الكتل بروتين الماجستير؟')) ctx.store.set({ blocks: withIds(MASTER_TEMPLATE), editing: true });
      const sum = e.target.closest('.rt-edit > summary');
      if (sum) { e.preventDefault(); ctx.store.set({ editing: !ctx.store.get().editing }); }
    });
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (toMin(f.start) == null || toMin(f.end) == null || !CATS[f.cat]) return;
      ctx.store.set({ blocks: [...st().blocks, { id: uid(), name: f.name.trim() || 'كتلة', cat: f.cat, start: f.start, end: f.end }], editing: true });
    });

    const unsub = ctx.store.subscribe(render);
    const off = ctx.onResize(render);
    render();
    return () => { clearInterval(tick); unsub(); off(); el.innerHTML = ''; };
  },
};
