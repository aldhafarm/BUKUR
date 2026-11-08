// ودجة مؤقت التركيز (بومودورو) — منفصلة الآن، وتُربط بالبكور في مرحلة ثانية.
// • القرص: قطاع يتناقص (برتقالي للتركيز، أخضر للراحة) — يُسحب بالفأرة أو اللمس لتحديد المدة.
// • زر الوحدة: الحلقة = ٦٠ دقيقة أو ١٢ ساعة. • داخل الحلقة: عجلات ساعات/دقائق/ثوانٍ كمؤقت أبل.
// • «سلسلة»: الراحة ثم التركيز تتواليان تلقائياً، مع تنبيه عند كل انتقال.
import { icon, setIconBtn, tip } from '../../icons.js';
import {
  PHASE_LABEL, PRESETS, RING, advance, angleToMs, autoUnit, catchUp, configFor, customWith, dayStats,
  formatClock, formatMinutes, fromHMS, initial, isFinished, logFocus, pause, phaseMs, remaining, reset,
  PERCENT_LABELS, nextUnit, remainingColor, ringFraction, splitHMS, start, weekStats, wrapUnit, zoneColor,
} from './timer.js';

const DEFAULTS = {
  mode: 'classic',
  custom: { focusSec: 1500, breakSec: 300 },
  unit: null,         // 'minutes' | 'hours' | null = حسب المدة
  chain: false,       // السلسلة التلقائية
  muted: false,       // بلا نغمة تنبيه
  goal: 8,            // «بومودورو: ___/8» من مستند الأدوات
  timer: null,
  log: {},
  notice: null,
};

const MODES = [...Object.entries(PRESETS).map(([id, p]) => [id, `${p.focus}/${p.short}`, p.label]), ['custom', '', 'مخصص']];
const ROW = 26; // ارتفاع صف العجلة بالبكسل
const range = (n) => Array.from({ length: n }, (_, i) => i);
const wheel = (key, n, label) => `
  <div class="ft-wheel" data-wheel="${key}" tabindex="0" aria-label="${label}">
    <div class="ft-wheel-pad"></div>${range(n).map((i) => `<div class="ft-wheel-item">${String(i).padStart(2, '0')}</div>`).join('')}<div class="ft-wheel-pad"></div>
  </div>`;

const TEMPLATE = `
  <div class="ft">
    <div class="ft-modes" data-size="m l" role="group" aria-label="النموذج">
      ${MODES.map(([id, short, name]) => `<button type="button" data-mode="${id}" ${tip(name)}>${short || icon('tune')}</button>`).join('')}
    </div>
    <div class="ft-face">
      <svg viewBox="-14 -14 228 228" class="ft-disk" data-ref="disk" role="slider" tabindex="0"
           aria-label="اسحب على الحلقة لتحديد المدة">
        <circle cx="100" cy="100" r="112" class="ft-plate"/>
        <g data-ref="segs" class="ft-segs"></g>
        <g data-ref="ticks"></g>
        <g data-ref="labels" class="ft-labels"></g>
        <circle data-ref="knob" r="6" class="ft-knob"/>
        <circle cx="100" cy="100" r="58" class="ft-hub"/>
      </svg>
      <div class="ft-center">
        <span class="ft-phase" data-ref="phase"></span>
        <b class="ft-time" data-ref="time" dir="ltr"></b>
        <div class="ft-picker" data-ref="picker" dir="ltr">
          ${wheel('h', 13, 'ساعات')}<span>:</span>${wheel('m', 60, 'دقائق')}<span>:</span>${wheel('s', 60, 'ثوانٍ')}
        </div>
        <span class="ft-dots" data-ref="dots" aria-label="جلسات الدورة"></span>
      </div>
    </div>
    <div class="ft-tools">
      <button type="button" class="ft-chip" data-act="unit"></button>
      <button type="button" class="ft-chip" data-act="chain" ${tip('سلسلة تلقائية: الراحة ثم الجلسة التالية مع تنبيه')}>${icon('sync')}</button>
      <button type="button" class="ft-chip" data-act="mute"></button>
    </div>
    <p class="ft-notice" data-ref="notice" role="status" hidden></p>
    <div class="ft-actions">
      <button type="button" class="ft-btn ft-primary" data-act="toggle"></button>
      <button type="button" class="ft-btn" data-act="skip" ${tip('تخطَّ إلى المرحلة التالية')}>${icon('skip_next')}</button>
      <button type="button" class="ft-btn" data-act="reset" ${tip('أعد المرحلة لبدايتها')}>${icon('restart_alt')}</button>
    </div>
    <div class="ft-stats" data-size="m l">
      <div ${tip('جلسات اليوم / الهدف')}>${icon('today')}<b data-ref="today"></b></div>
      <div ${tip('ساعات التركيز اليوم')}>${icon('timer')}<b data-ref="hours"></b></div>
      <div data-size="l" ${tip('آخر ٧ أيام')}>${icon('calendar_month')}<b data-ref="week"></b></div>
    </div>
    <div class="ft-goal" data-size="l">
      <label>هدف اليوم <input type="number" min="1" max="24" inputmode="numeric" data-ref="goal" dir="ltr"> جلسات</label>
    </div>
  </div>`;

const pt = (r, frac) => {
  const a = frac * 2 * Math.PI;
  return [100 + r * Math.sin(a), 100 - r * Math.cos(a)];
};

function ticksMarkup() {
  // حلقة نقاط خارج الأشرطة كالمؤقت المرجعي — نقطة أكبر كل ١٠٪
  let out = '';
  for (let i = 0; i < 100; i++) {
    const [x, y] = pt(97, i / 100);
    out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${i % 10 === 0 ? 1.3 : 0.6}" class="ft-dot"/>`;
  }
  return out;
}

// ١٠٠ شريط كالمؤقت المرجعي — لونه بحسب موضعه (أحمر ← برتقالي ← أصفر ← فيروزي)
const SEGS = 100;
function segmentsMarkup() {
  let out = '';
  for (let i = 0; i < SEGS; i++) {
    const a0 = i / SEGS + 0.0016;
    const a1 = (i + 1) / SEGS - 0.0016;
    const [x1, y1] = pt(92, a0); const [x2, y2] = pt(92, a1);
    const [x3, y3] = pt(66, a1); const [x4, y4] = pt(66, a0);
    out += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}A92 92 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}L${x3.toFixed(2)} ${y3.toFixed(2)}A66 66 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z" data-zone="${zoneColor((i + 0.5) / SEGS)}"/>`;
  }
  return out;
}

const labelsMarkup = (unit) => (unit === 'percent' ? PERCENT_LABELS : RING[unit].labels).map((n, i, arr) => {
  const [x, y] = pt(104, i / arr.length);
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central">${unit === 'percent' ? `${n}%` : n}</text>`;
}).join('');

// نغمة بلا ملفات. المتصفح يسمح بالصوت بعد لمسة، و«ابدأ» لمسة.
let audio = null;
function chime(kind) {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const notes = kind === 'focus' ? [660, 880, 990] : [880, 660, 520]; // صاعدة: عُد للتركيز · هابطة: استرح
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.28 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.28 + 0.25);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + i * 0.28);
      osc.stop(t + i * 0.28 + 0.26);
    });
  } catch { /* لا صوت متاح — تكفي الرسالة */ }
}

export default {
  id: 'focus-timer',
  name: 'مؤقت التركيز',
  sizes: ['s', 'm', 'l'],
  defaultSize: 'm',
  defaults: DEFAULTS,

  mount(el, ctx) {
    el.innerHTML = TEMPLATE;
    const ref = (n) => el.querySelector(`[data-ref="${n}"]`);
    const store = ctx.store;
    ref('ticks').innerHTML = ticksMarkup();
    ref('segs').innerHTML = segmentsMarkup();
    const segEls = [...ref('segs').children];
    let litCount = -1, litPhase = '';
    const disk = ref('disk');

    const cfg = () => { const s = store.get(); return configFor(s.mode, s.custom); };
    const timer = () => store.get().timer ?? initial(cfg());
    const unitFor = (t) => store.get().unit ?? autoUnit(phaseMs(t.phase, cfg()));
    const editable = (t) => t.status !== 'running';

    // ضبط مدة المرحلة الحالية (من الحلقة أو العجلات) ← يصير النموذج «مخصص»
    function setDuration(ms) {
      const t = timer();
      const custom = customWith(cfg(), t.phase, ms);
      const c = configFor('custom', custom);
      store.set({ mode: 'custom', custom, timer: { ...t, status: 'idle', endsAt: null, remainingMs: phaseMs(t.phase, c) }, notice: null });
    }

    // انتهاء مرحلة أو أكثر: سجّل كل تركيز، وتابع السلسلة أو انتظر
    function settle(now, audible) {
      const s = store.get();
      const { state, ended } = catchUp(timer(), cfg(), now, s.chain);
      if (!ended.length) return false;
      let log = s.log;
      for (const e of ended) if (e.phase === 'focus') log = logFocus(log, new Date(e.endsAt), cfg().focus);
      const last = ended[ended.length - 1];
      const notice = last.phase === 'focus'
        ? (s.chain ? 'انتهت جلسة التركيز — بدأت الراحة تلقائياً' : 'انتهت جلسة التركيز — وقت الراحة')
        : (s.chain ? 'انتهت الراحة — عُد للتركيز، بدأت الجلسة التالية' : 'انتهت الراحة — جاهز لجلسة تركيز');
      store.set({ timer: state, log, notice });
      if (audible && !s.muted) chime(state.phase);
      return true;
    }

    // ── العجلات (scroll-snap): تُضبط من الحالة، وتضبط الحالة عند التوقف
    const wheels = [...el.querySelectorAll('[data-wheel]')];
    let syncing = false;
    function syncWheels(ms) {
      const hms = splitHMS(ms);
      syncing = true;
      for (const w of wheels) {
        const target = hms[w.dataset.wheel] * ROW;
        if (Math.abs(w.scrollTop - target) > 1) w.scrollTop = target;
      }
      requestAnimationFrame(() => { syncing = false; });
    }
    for (const w of wheels) {
      let idle;
      w.addEventListener('scroll', () => {
        if (syncing) return;
        clearTimeout(idle);
        idle = setTimeout(() => {
          const hms = Object.fromEntries(wheels.map((x) => [x.dataset.wheel, Math.round(x.scrollTop / ROW)]));
          const ms = fromHMS(hms);
          if (ms >= 10_000 && editable(timer())) setDuration(ms);
        }, 140);
      });
      w.addEventListener('keydown', (e) => {
        if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        w.scrollTop += (e.key === 'ArrowDown' ? 1 : -1) * ROW;
      });
    }

    // ── سحب الحلقة — متصل: عبور القمة بعد ٦٠ دقيقة يحوّل للساعات (وتحتها لا تقل المدة عن ساعة)
    let dragging = false;
    let lastDeg = 0;
    const angleAt = (e) => {
      const r = disk.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      return { deg, dist: Math.hypot(dx, dy) / (r.width / 2) };
    };
    let autoHours = false; // تحوّلت للساعات بعبور القمة في هذا السحب
    function dragTo(deg) {
      const before = unitFor(timer());
      const unit = wrapUnit(before, lastDeg, deg);
      lastDeg = deg;
      if (unit !== before) { autoHours = unit === 'hours'; store.set({ unit }); }
      let ms = angleToMs(deg, unit);
      if (unit === 'hours' && autoHours) ms = Math.max(ms, 60 * 60_000); // بعد العبور: لا تقل عن ساعة
      setDuration(ms);
    }
    disk.addEventListener('pointerdown', (e) => {
      const { deg, dist } = angleAt(e);
      if (dist < 0.55 || !editable(timer()) || unitFor(timer()) === 'percent') return; // المركز للعجلات؛ والجارية لا تُعدَّل؛ والنسبة تُضبط بالعجلات
      e.preventDefault();
      dragging = true;
      autoHours = false;
      lastDeg = deg;
      disk.setPointerCapture(e.pointerId);
      disk.classList.add('ft-dragging');
      setDuration(angleToMs(deg, unitFor(timer())));
    });
    disk.addEventListener('pointermove', (e) => { if (dragging) dragTo(angleAt(e).deg); });
    const stop = () => { dragging = false; disk.classList.remove('ft-dragging'); };
    disk.addEventListener('pointerup', stop);
    disk.addEventListener('pointercancel', stop);
    disk.addEventListener('keydown', (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || !editable(timer()) || unitFor(timer()) === 'percent') return;
      e.preventDefault();
      const t = timer();
      const step = RING[unitFor(t)].snapMs * (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1);
      setDuration(Math.max(RING[unitFor(t)].snapMs, t.remainingMs + step));
    });

    function render() {
      const now = Date.now();
      const s = store.get();
      const t = timer();
      const c = cfg();
      const unit = unitFor(t);
      const left = remaining(t, now);
      const frac = ringFraction(left, unit, phaseMs(t.phase, c));
      const root = el.querySelector('.ft');
      root.dataset.phase = t.phase;
      root.dataset.status = t.status;
      root.style.setProperty('--ph', remainingColor(t.phase, left / phaseMs(t.phase, c)));
      ref('time').textContent = formatClock(left);
      ref('phase').textContent = unit === 'percent' ? `${PHASE_LABEL[t.phase]} · \u2066${Math.round(frac * 100)}%\u2069` : PHASE_LABEL[t.phase];
      const lit = Math.ceil(frac * SEGS - 1e-9);
      if (lit !== litCount || litPhase !== t.phase) {
        segEls.forEach((seg, i) => {
          seg.setAttribute('fill', i < lit ? (t.phase === 'focus' ? seg.dataset.zone : '#3b82c4') : 'var(--ft-off)');
        });
        litCount = lit; litPhase = t.phase;
      }
      const [kx, ky] = pt(92, Math.min(frac, 0.9999));
      ref('knob').setAttribute('cx', kx.toFixed(2));
      ref('knob').setAttribute('cy', ky.toFixed(2));
      ref('knob').style.display = editable(t) && unit !== 'percent' ? '' : 'none';
      if (ref('labels').dataset.unit !== unit) { ref('labels').innerHTML = labelsMarkup(unit); ref('labels').dataset.unit = unit; }
      disk.setAttribute('aria-valuetext', formatClock(left));
      // العجلات عند التوقف (وليس في الحجم الصغير)، والعدّاد أثناء الجلسة
      const showPicker = editable(t) && ctx.size !== 's';
      ref('picker').hidden = !showPicker;
      ref('time').hidden = showPicker;
      if (showPicker) syncWheels(t.remainingMs);
      const per = c.every || 4;
      const dk = c.every ? `${t.done % per}/${per}` : '';
      if (ref('dots').dataset.k !== dk) { ref('dots').dataset.k = dk; ref('dots').innerHTML = c.every ? icon('circle', 'fill').repeat(t.done % per) + icon('circle').repeat(per - (t.done % per)) : ''; }
      const tg = el.querySelector('[data-act="toggle"]');
      if (t.status === 'running') setIconBtn(tg, 'pause', 'إيقاف مؤقت');
      else setIconBtn(tg, 'play_arrow', t.status === 'paused' ? 'استئناف' : 'ابدأ');
      setIconBtn(el.querySelector('[data-act="unit"]'), { minutes: 'schedule', hours: 'schedule', percent: 'percent' }[unit],
        { minutes: 'الحلقة: دقائق — اضغط للتبديل', hours: 'الحلقة: ساعات — اضغط للتبديل', percent: 'الحلقة: نسبة ٪ — اضغط للتبديل' }[unit],
        { minutes: 'د', hours: 'س', percent: '' }[unit]);
      setIconBtn(el.querySelector('[data-act="mute"]'), s.muted ? 'notifications_off' : 'notifications', s.muted ? 'صامت — اضغط لتشغيل التنبيه' : 'التنبيه يعمل — اضغط للكتم');
      el.querySelector('[data-act="mute"]').setAttribute('aria-pressed', String(Boolean(s.muted)));
      el.querySelector('[data-act="chain"]').setAttribute('aria-pressed', String(Boolean(s.chain)));
      for (const b of el.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode));
      const today = dayStats(s.log, new Date(now));
      const week = weekStats(s.log, new Date(now));
      ref('today').textContent = `${today.sessions}/${s.goal}`;
      ref('hours').textContent = formatMinutes(Math.round(today.minutes));
      ref('week').textContent = `${week.sessions} · ${formatMinutes(Math.round(week.minutes))}`;
      const notice = ref('notice');
      notice.hidden = !s.notice;
      notice.textContent = s.notice ?? '';
      if (document.activeElement !== ref('goal')) ref('goal').value = s.goal;
    }

    el.addEventListener('click', (e) => {
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        if (timer().status === 'running' && !confirm('تغيير النموذج يوقف الجلسة الحالية. متابعة؟')) return;
        const mode = modeBtn.dataset.mode;
        store.set({ mode, timer: initial(configFor(mode, store.get().custom)), notice: null });
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const now = Date.now();
      const t = timer();
      if (act === 'toggle') {
        try { audio ??= new AudioContext(); audio.resume?.(); } catch { /* بلا صوت */ }
        store.set({ timer: t.status === 'running' ? pause(t, now) : start(t, now), notice: null });
      }
      if (act === 'skip') store.set({ timer: advance(t, cfg()), notice: null }); // التخطي لا يُسجَّل جلسةً
      if (act === 'reset') store.set({ timer: reset(t, cfg()), notice: null });
      if (act === 'unit') store.set({ unit: nextUnit(unitFor(t)) });
      if (act === 'mute') store.set({ muted: !store.get().muted });
      if (act === 'chain') store.set({ chain: !store.get().chain });
    });
    ref('goal').addEventListener('change', (e) => store.set({ goal: Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 8)) }));

    function applySize(size) {
      for (const node of el.querySelectorAll('[data-size]')) node.hidden = !node.dataset.size.split(' ').includes(size);
      render();
    }

    // ما انتهى والصفحة مغلقة: يُسجَّل الآن بصمت (والسلسلة تكمل من لحظة الانتهاء)
    settle(Date.now(), false);

    const unsubscribe = store.subscribe(render);
    const offResize = ctx.onResize(applySize);
    applySize(ctx.size);
    // الحاضنة تركّب الودجة قبل إلحاق بطاقتها بالصفحة، والعجلات لا تُمرَّر قبل أن يكون لها ارتفاع:
    // نعيد الرسم فور الإلحاق لتظهر المدة الحالية على العجلات.
    queueMicrotask(render);
    const interval = setInterval(() => {
      if (isFinished(timer(), Date.now())) settle(Date.now(), true);
      else if (timer().status === 'running') render();
    }, 250);

    return () => {
      clearInterval(interval);
      unsubscribe();
      offResize();
      el.innerHTML = '';
    };
  },
};
