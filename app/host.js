// الحاضنة: ترسم الودجات بترتيب المستخدم، وتدير السحب والطي والحجم والإخفاء و«أدواتي» والتوسيع.
import { createStore } from './store.js';
import { WIDGETS } from './widgets/index.js';
import { moveBefore, moveBy, nextSize, reconcileOrder, toggle } from './layout.js';

const byId = new Map(WIDGETS.map((w) => [w.id, w]));
const layout = createStore('layout', { defaults: { order: [], hidden: [], collapsed: [], sizes: {} } });
layout.set({ order: reconcileOrder(layout.get().order, WIDGETS.map((w) => w.id)) });

const board = document.getElementById('board');
const mounted = new Map(); // id → { card, unmount, setSize }
const SIZE_LABEL = { s: 'صغير', m: 'متوسط', l: 'كبير' };

function sizeOf(w) {
  const saved = layout.get().sizes[w.id];
  return w.sizes.includes(saved) ? saved : w.defaultSize;
}

function buildCard(w) {
  const card = document.createElement('section');
  card.className = 'card';
  card.dataset.id = w.id;
  card.setAttribute('aria-label', w.name);
  card.innerHTML = `
    <header class="card-head">
      <button type="button" class="handle" data-act="drag" title="اسحب لإعادة الترتيب (أو الأسهم ↑↓)" aria-label="نقل"><span aria-hidden="true">⋮⋮</span></button>
      <h2></h2>
      <button type="button" class="icon" data-act="size" title="الحجم"></button>
      <button type="button" class="icon" data-act="collapse" title="طي / فتح" aria-label="طي أو فتح"><span aria-hidden="true">▾</span></button>
      <button type="button" class="icon" data-act="hide" title="إخفاء (يعود من «أدواتي»)" aria-label="إخفاء"><span aria-hidden="true">✕</span></button>
    </header>
    <div class="card-body"></div>`;
  card.querySelector('h2').textContent = w.name;
  const body = card.querySelector('.card-body');

  const sizeListeners = new Set();
  let size = sizeOf(w);
  const ctx = {
    store: createStore(`w:${w.id}`, { defaults: w.defaults, migrate: w.migrate }),
    get size() { return size; },
    onResize(fn) { sizeListeners.add(fn); return () => sizeListeners.delete(fn); },
    bridge: null, // قدرات المتصفح عبر الغلاف — لاحقاً
  };
  const setSize = (next) => {
    size = next;
    card.dataset.size = next;
    card.querySelector('[data-act="size"]').textContent = SIZE_LABEL[next] ?? next;
    for (const fn of sizeListeners) fn(next);
  };
  setSize(size);
  const unmount = w.mount(body, ctx);
  return { card, unmount, setSize };
}

function render() {
  const { order, hidden, collapsed } = layout.get();
  for (const id of order) {
    const w = byId.get(id);
    if (hidden.includes(id)) {
      const m = mounted.get(id);
      if (m) { m.unmount?.(); m.card.remove(); mounted.delete(id); }
      continue;
    }
    if (!mounted.has(id)) mounted.set(id, buildCard(w));
    const { card } = mounted.get(id);
    card.classList.toggle('collapsed', collapsed.includes(id));
    card.querySelector('[data-act="collapse"]').setAttribute('aria-expanded', String(!collapsed.includes(id)));
    board.append(card); // append ينقل العنصر الموجود دون إعادة تركيبه
  }
  document.getElementById('empty').hidden = order.some((id) => !hidden.includes(id));
  renderMenu();
}

// ── أزرار البطاقات
board.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  const card = e.target.closest('.card');
  if (!btn || !card) return;
  const id = card.dataset.id;
  const s = layout.get();
  if (btn.dataset.act === 'collapse') layout.set({ collapsed: toggle(s.collapsed, id) });
  if (btn.dataset.act === 'hide') layout.set({ hidden: toggle(s.hidden, id) });
  if (btn.dataset.act === 'size') {
    const next = nextSize(byId.get(id).sizes, sizeOf(byId.get(id)));
    layout.set({ sizes: { ...s.sizes, [id]: next } });
    mounted.get(id).setSize(next);
  }
});
board.addEventListener('keydown', (e) => {
  const handle = e.target.closest('.handle');
  if (!handle || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const id = handle.closest('.card').dataset.id;
  layout.set({ order: moveBy(layout.get().order, id, e.key === 'ArrowUp' ? -1 : 1) });
  handle.focus();
});

// ── السحب لإعادة الترتيب (HTML5 drag & drop من المقبض فقط، حتى لا يتعارض مع سحب إطار الساعة)
let dragId = null;
board.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.handle');
  if (handle) handle.closest('.card').draggable = true;
});
board.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.card');
  if (!card?.draggable) return e.preventDefault();
  dragId = card.dataset.id;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});
board.addEventListener('dragover', (e) => {
  if (!dragId) return;
  e.preventDefault();
  const over = e.target.closest('.card');
  for (const c of board.querySelectorAll('.drop-before')) c.classList.remove('drop-before');
  if (over && over.dataset.id !== dragId) over.classList.add('drop-before');
});
board.addEventListener('drop', (e) => {
  if (!dragId) return;
  e.preventDefault();
  const over = e.target.closest('.card');
  layout.set({ order: moveBefore(layout.get().order, dragId, over?.dataset.id ?? null) });
});
board.addEventListener('dragend', () => {
  for (const c of board.querySelectorAll('.card')) { c.draggable = false; c.classList.remove('dragging', 'drop-before'); }
  dragId = null;
});

// ── «أدواتي»: إظهار/إخفاء + تصدير/استيراد
const menu = document.getElementById('menu');
function renderMenu() {
  const { hidden } = layout.get();
  const list = menu.querySelector('ul');
  list.innerHTML = '';
  for (const w of WIDGETS) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !hidden.includes(w.id);
    box.addEventListener('change', () => layout.set({ hidden: toggle(layout.get().hidden, w.id) }));
    label.append(box, ` ${w.name}`);
    li.append(label);
    list.append(li);
  }
}
document.getElementById('tools').addEventListener('click', () => {
  menu.hidden = !menu.hidden;
  document.getElementById('tools').setAttribute('aria-expanded', String(!menu.hidden));
});

document.getElementById('export').addEventListener('click', () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('bukur:')) data[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify({ app: 'bukur', version: 1, data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bukur-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed?.app !== 'bukur' || typeof parsed.data !== 'object') throw new Error('bad');
    for (const [k, v] of Object.entries(parsed.data)) {
      if (k.startsWith('bukur:') && typeof v === 'string') localStorage.setItem(k, v);
    }
    location.reload();
  } catch {
    alert('الملف ليس نسخة احتياطية صالحة من البكور');
  }
});

// ── التوسيع: نفس الصفحة في تبويب كامل (في القائمة الجانبية عرضها محدود)
document.getElementById('expand').addEventListener('click', () => window.open(location.href, '_blank', 'noopener'));

layout.subscribe(render);
render();
