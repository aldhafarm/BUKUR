// ودجة ساعة البكور — أول ودجة في الحاضنة. تتبع عقد الودجة في docs/design.md §٤.
import { dialMarkup } from './dial.js';
import {
  angleDelta, awakeStatus, bezelForTime, formatDuration, formatHM, hoursAwake, rotate, wakeHourFromBezel,
} from './time.js';

const DEFAULTS = {
  bezelRotation: 0,
  bezelMode: 'awake',
  dialMode: 'daynight',
  dialNightMode: '18-06',
  nightGradientMode: 'radial',
  showAwakeProgress: false,
  dailyWakeHour: 5,
  dailyWakeMinute: 0,
};

// الساعة الأصلية كانت تحفظ في مفتاح «aldhafar3». يُستورد مرة واحدة إن وُجد على نفس النطاق.
// (التخزين المحلي مرتبط بالنطاق: من استعمل الساعة على رابط آخر لن تنتقل إعداداته تلقائياً.)
export function migrateLegacy() {
  try {
    const raw = localStorage.getItem('aldhafar3');
    if (!raw) return null;
    const s = JSON.parse(raw);
    const keep = ['bezelRotation', 'dialMode', 'dialNightMode', 'nightGradientMode', 'dailyWakeHour', 'dailyWakeMinute'];
    return Object.fromEntries(keep.filter((k) => s[k] !== undefined).map((k) => [k, s[k]]));
  } catch {
    return null;
  }
}

const pad = (n) => String(n).padStart(2, '0');
const clampInt = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || 0));

const TEMPLATE = `
  <div class="bk-clock">
    <div class="bk-digital"><span data-ref="hm"></span><small data-ref="sec"></small></div>
    <div class="bk-chips" data-size="m l">
      <div class="bk-chip"><span>الاستيقاظ</span><b data-ref="wake"></b></div>
      <div class="bk-chip"><span>اليقظة</span><b data-ref="awake"></b></div>
      <div class="bk-chip"><span>الحالة</span><b data-ref="status"></b></div>
    </div>
    <div class="bk-bar" data-size="m l"><div data-ref="bar"></div></div>
    <svg class="bk-dial" viewBox="0 0 400 400" role="img" aria-label="قرص البكور — اسحب الإطار لتحديد وقت الاستيقاظ" data-ref="dial"></svg>
    <div class="bk-actions" data-size="m l">
      <button type="button" class="bk-btn bk-primary" data-act="now">☀️ استيقظت الآن</button>
      <button type="button" class="bk-btn" data-act="reset">تصفير</button>
      <button type="button" class="bk-btn" data-act="settings" aria-expanded="false" aria-label="الإعدادات">⚙️</button>
    </div>
    <div class="bk-daily" data-size="l">
      <span>وقت الاستيقاظ اليومي</span>
      <input type="number" min="0" max="23" inputmode="numeric" data-ref="wh" aria-label="الساعة" dir="ltr">
      <span>:</span>
      <input type="number" min="0" max="59" step="5" inputmode="numeric" data-ref="wm" aria-label="الدقيقة" dir="ltr">
      <button type="button" class="bk-btn bk-accent" data-act="daily">اضبط</button>
    </div>
    <div class="bk-settings" data-ref="settings" hidden>
      <div class="bk-row"><span>القرص</span><span class="bk-seg" data-key="dialMode">
        <button type="button" data-val="white">أبيض</button><button type="button" data-val="daynight">ليل/نهار</button></span></div>
      <div class="bk-row" data-when="daynight"><span>الليل</span><span class="bk-seg" data-key="dialNightMode">
        <button type="button" data-val="18-06" dir="ltr">18–06</button><button type="button" data-val="19-05" dir="ltr">19–05</button></span></div>
      <div class="bk-row" data-when="daynight"><span>تدرّج الليل</span><span class="bk-seg" data-key="nightGradientMode">
        <button type="button" data-val="linear">ثابت</button><button type="button" data-val="radial">يتبع الساعة</button></span></div>
      <div class="bk-row"><span>الإطار</span><span class="bk-seg" data-key="bezelMode">
        <button type="button" data-val="awake">يقظة</button><button type="button" data-val="daynight">ليل/نهار</button></span></div>
      <div class="bk-row"><span>تقدّم اليقظة على الإطار</span><span class="bk-seg" data-key="showAwakeProgress">
        <button type="button" data-val="false">إيقاف</button><button type="button" data-val="true">تشغيل</button></span></div>
    </div>
    <p class="bk-hint" data-size="m l">اسحب الإطار · اضغط ☀️ عند الاستيقاظ</p>
  </div>`;

export default {
  id: 'bukur-clock',
  name: 'ساعة البكور',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaults: DEFAULTS,
  migrate: migrateLegacy,

  mount(el, ctx) {
    el.innerHTML = TEMPLATE;
    const ref = (name) => el.querySelector(`[data-ref="${name}"]`);
    const dial = ref('dial');
    const store = ctx.store;
    let now = new Date();

    function render() {
      const s = store.get();
      const h = now.getHours();
      const m = now.getMinutes();
      const awake = hoursAwake(h, m, s.bezelRotation);
      const status = awakeStatus(awake);
      ref('hm').textContent = `${pad(h)}:${pad(m)}`;
      ref('sec').textContent = `:${pad(now.getSeconds())}`;
      ref('wake').textContent = formatHM(wakeHourFromBezel(s.bezelRotation));
      ref('awake').textContent = formatDuration(awake);
      ref('status').textContent = `${status.emoji} ${status.label}`;
      el.querySelector('.bk-clock').dataset.level = status.level;
      ref('bar').style.width = `${Math.min((awake / 24) * 100, 100)}%`;
      dial.innerHTML = dialMarkup(now, s, awake);
      // الإعدادات: الزر المختار + إظهار صفوف وضع الليل/النهار فقط عند الحاجة
      for (const seg of el.querySelectorAll('.bk-seg')) {
        const value = String(s[seg.dataset.key]);
        for (const b of seg.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.val === value));
      }
      for (const row of el.querySelectorAll('[data-when="daynight"]')) row.hidden = s.dialMode !== 'daynight';
      const wh = ref('wh');
      const wm = ref('wm');
      if (document.activeElement !== wh) wh.value = s.dailyWakeHour;
      if (document.activeElement !== wm) wm.value = pad(s.dailyWakeMinute);
    }

    function applySize(size) {
      for (const node of el.querySelectorAll('[data-size]')) node.hidden = !node.dataset.size.split(' ').includes(size);
    }

    // سحب الإطار — Pointer Events تغطي الفأرة واللمس معاً
    let dragging = false;
    let lastAngle = 0;
    const angleAt = (e) => {
      const r = dial.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    dial.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      lastAngle = angleAt(e);
      dial.setPointerCapture(e.pointerId);
      dial.classList.add('bk-grabbing');
    });
    dial.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const a = angleAt(e);
      store.set({ bezelRotation: rotate(store.get().bezelRotation, angleDelta(lastAngle, a)) });
      lastAngle = a;
    });
    const stop = () => { dragging = false; dial.classList.remove('bk-grabbing'); };
    dial.addEventListener('pointerup', stop);
    dial.addEventListener('pointercancel', stop);

    el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      const seg = e.target.closest('.bk-seg button');
      if (seg) {
        const key = seg.parentElement.dataset.key;
        const raw = seg.dataset.val;
        store.set({ [key]: raw === 'true' ? true : raw === 'false' ? false : raw });
        return;
      }
      if (act === 'now') store.set({ bezelRotation: bezelForTime(now.getHours(), now.getMinutes()) });
      if (act === 'reset') store.set({ bezelRotation: 0 });
      if (act === 'daily') {
        const s = store.get();
        store.set({ bezelRotation: bezelForTime(s.dailyWakeHour, s.dailyWakeMinute) });
      }
      if (act === 'settings') {
        const panel = ref('settings');
        panel.hidden = !panel.hidden;
        e.target.closest('button').setAttribute('aria-expanded', String(!panel.hidden));
      }
    });
    ref('wh').addEventListener('change', (e) => store.set({ dailyWakeHour: clampInt(e.target.value, 0, 23) }));
    ref('wm').addEventListener('change', (e) => store.set({ dailyWakeMinute: clampInt(e.target.value, 0, 59) }));

    const unsubscribe = store.subscribe(render);
    const offResize = ctx.onResize(applySize);
    applySize(ctx.size);
    render();
    const timer = setInterval(() => { now = new Date(); render(); }, 1000);

    return () => {
      clearInterval(timer);
      unsubscribe();
      offResize();
      el.innerHTML = '';
    };
  },
};
