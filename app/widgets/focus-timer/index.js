// ودجة مؤقت التركيز (بومودورو) — منفصلة الآن، وتُربط بالبكور في مرحلة ثانية.
// • القرص: قطاع يتناقص (برتقالي للتركيز، أخضر للراحة) — يُسحب بالفأرة أو اللمس لتحديد المدة.
// • زر الوحدة: الحلقة = ٦٠ دقيقة أو ١٢ ساعة. • داخل الحلقة: عجلات ساعات/دقائق/ثوانٍ كمؤقت أبل.
// • «سلسلة»: الراحة ثم التركيز تتواليان تلقائياً، مع تنبيه عند كل انتقال.
import { icon, setIconBtn, tip } from '../../icons.js';
import {
  PHASE_LABEL, PRESETS, RING, advance, autoUnit, catchUp, configFor, customWith, dayStats,
  formatClock, formatMinutes, fromHMS, initial, isFinished, logFocus, pause, phaseMs, remaining, reset,
  PERCENT_LABELS, nextUnit, remainingColor, ringFraction, splitHMS, start, weekStats, wrapUnit, zoneColor,
  dragMs, stepDetent, PALETTE, quarterCrossed, upStep, formatElapsed, logTask, swElapsed, swInitial, swToggle,
} from './timer.js';

const DEFAULTS = {
  mode: 'classic',
  custom: { focusSec: 1500, breakSec: 300 },
  unit: null,         // 'minutes' | 'hours' | null = حسب المدة
  chain: false,       // السلسلة التلقائية
  muted: false,       // بلا نغمة تنبيه
  goal: 8,            // «بومودورو: ___/8» من مستند الأدوات
  timer: null,
  kind: 'down',       // 'down' تنازلي (بومودورو) · 'up' تصاعدي: يحسب الوقت المستغرق لمهمة
  sw: null,           // حالة التصاعدي
  task: '',           // اسم المهمة الجارية في التصاعدي
  tasks: [],          // سجل المهام المحسوبة: {name, ms, at}
  log: {},
  notice: null,
};

const MODES = [...Object.entries(PRESETS).map(([id, p]) => [id, `${p.focus}/${p.short}`, p.label]), ['custom', '', 'مخصص']];
const ROW = 34; // ارتفاع صف العجلة بالبكسل — صف واحد ظاهر، كالعدّاد أثناء التشغيل
const range = (n) => Array.from({ length: n }, (_, i) => i);
const wheel = (key, n, label) => `
  <div class="ft-wheel" data-wheel="${key}" tabindex="0" aria-label="${label}">
    <div class="ft-wheel-pad"></div>${range(n).map((i) => `<div class="ft-wheel-item">${String(i).padStart(2, '0')}</div>`).join('')}<div class="ft-wheel-pad"></div>
  </div>`;

const TEMPLATE = `
  <div class="ft">
    <div class="ft-modes" role="group" aria-label="النموذج">
      <button type="button" class="ft-kind" data-act="kind"></button>
      <input class="ft-task" data-ref="task" data-up maxlength="40" placeholder="المهمة…" aria-label="اسم المهمة">
      ${MODES.map(([id, short, name]) => `<button type="button" data-mode="${id}" data-down data-size="m l" ${tip(name)}>${short || icon('tune')}</button>`).join('')}
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
      <button type="button" class="ft-chip" data-act="unit" data-down></button>
      <button type="button" class="ft-chip" data-down data-act="chain" ${tip('سلسلة تلقائية: الراحة ثم الجلسة التالية مع تنبيه')}>${icon('sync')}</button>
      <button type="button" class="ft-chip" data-act="mute"></button>
    </div>
    <p class="ft-notice" data-ref="notice" role="status" hidden></p>
    <p class="ft-toast" data-ref="toast" role="status" aria-live="polite" hidden></p>
    <div class="ft-actions">
      <button type="button" class="ft-btn ft-primary" data-act="toggle"></button>
      <button type="button" class="ft-btn" data-act="skip" data-down ${tip('تخطَّ إلى المرحلة التالية')}>${icon('skip_next')}</button>
      <button type="button" class="ft-btn" data-act="reset" data-down ${tip('أعد المرحلة لبدايتها')}>${icon('restart_alt')}</button>
      <button type="button" class="ft-btn" data-act="sw-done" data-up ${tip('أنهِ واحفظ الوقت المستغرق')}>${icon('check')}</button>
      <button type="button" class="ft-btn" data-act="sw-reset" data-up ${tip('صفّر دون حفظ')}>${icon('restart_alt')}</button>
    </div>
    <div class="ft-stats" data-size="m l">
      <div ${tip('جلسات اليوم / الهدف')}>${icon('today')}<b data-ref="today"></b></div>
      <div ${tip('ساعات التركيز اليوم')}>${icon('timer')}<b data-ref="hours"></b></div>
      <div data-size="l" ${tip('آخر ٧ أيام')}>${icon('calendar_month')}<b data-ref="week"></b></div>
    </div>
    <ul class="ft-tasks" data-ref="tasks" data-up data-size="m l"></ul>
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

/** «تكّة» قصيرة عند كل وقفة أثناء الضبط (طلب المالك: صوت متقطع كالتكويك) — ضجيج قصير جداً مُرشَّح. */
let lastTick = 0;
function tick() {
  const now = performance.now();
  if (now - lastTick < 28) return; // لا أكثر من ~٣٥ تكّة/ث عند السحب السريع
  lastTick = now;
  try {
    audio ??= new AudioContext();
    audio.resume?.();
    const t = audio.currentTime;
    const len = Math.floor(audio.sampleRate * 0.012);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    const src = audio.createBufferSource();
    src.buffer = buf;
    const bp = audio.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.2;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.35, t);
    src.connect(bp).connect(gain).connect(audio.destination);
    src.start(t);
  } catch { /* بلا صوت */ }
  try { navigator.vibrate?.(4); } catch { /* بلا اهتزاز */ }
}
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

/** نغمة خفيفة واحدة لتنبيه المراحل — أهدأ من نغمة الانتهاء. */
function softCue() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  } catch { /* بلا صوت */ }
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
      if (ms !== t.remainingMs && !store.get().muted) tick(); // تكّة عند كل وقفة جديدة
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
      // عجلة الفأرة: رقم واحد لكل حركة (الصف الظاهر واحد)
      w.addEventListener('wheel', (e) => {
        e.preventDefault();
        w.scrollTop += Math.sign(e.deltaY) * ROW;
      }, { passive: false });
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
      let ms = dragMs(deg, unit);
      if (unit === 'hours' && autoHours) ms = Math.max(ms, 60 * 60_000); // بعد العبور: لا تقل عن ساعة
      setDuration(ms);
    }
    disk.addEventListener('pointerdown', (e) => {
      const { deg, dist } = angleAt(e);
      if (isUp() || dist < 0.55 || !editable(timer()) || unitFor(timer()) === 'percent') return; // المركز للعجلات؛ والجارية لا تُعدَّل؛ والنسبة تُضبط بالعجلات
      e.preventDefault();
      dragging = true;
      autoHours = false;
      lastDeg = deg;
      disk.setPointerCapture(e.pointerId);
      disk.classList.add('ft-dragging');
      setDuration(dragMs(deg, unitFor(timer())));
    });
    disk.addEventListener('pointermove', (e) => { if (dragging) dragTo(angleAt(e).deg); });
    const stop = () => { dragging = false; disk.classList.remove('ft-dragging'); };
    disk.addEventListener('pointerup', stop);
    disk.addEventListener('pointercancel', stop);
    disk.addEventListener('keydown', (e) => {
      if (isUp() || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || !editable(timer()) || unitFor(timer()) === 'percent') return;
      e.preventDefault();
      const t = timer();
      setDuration(stepDetent(t.remainingMs, ['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1));
    });

    // ── تنبيه المراحل: كلما انتقلت الحلقة إلى لون جديد (ربع المرحلة، أو كل ١٥ دقيقة في التصاعدي)
    let prevFrac = null;
    let prevStep = null;
    let toastTimer;
    function stageAlert(text, color) {
      const face = el.querySelector('.ft-face');
      face.style.setProperty('--pulse', color);
      face.classList.remove('ft-pulse');
      void face.offsetWidth; // لإعادة تشغيل الحركة
      face.classList.add('ft-pulse');
      const toast = ref('toast');
      toast.textContent = text;
      toast.style.setProperty('--pulse', color);
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
      if (!store.get().muted) softCue();
      try { navigator.vibrate?.(30); } catch { /* بلا اهتزاز */ }
    }

    const sw = () => store.get().sw ?? swInitial();
    const isUp = () => store.get().kind === 'up';

    /** رسم وضع التصاعدي: الحلقة تمتلئ مع كل ساعة، والعدّاد يتزايد. */
    function renderUp(now, s) {
      const w = sw();
      const ms = swElapsed(w, now);
      const root = el.querySelector('.ft');
      root.dataset.phase = 'up';
      root.dataset.status = w.status;
      const frac = (ms % (60 * 60_000)) / (60 * 60_000);
      root.style.setProperty('--ph', PALETTE.cyan); // لون ثابت للتصاعدي: لا «مهلة» تقترب
      ref('time').textContent = formatElapsed(ms);
      ref('time').hidden = false;
      ref('picker').hidden = true;
      ref('phase').textContent = s.task ? s.task : 'الوقت المستغرق';
      const lit = Math.floor(frac * SEGS);
      const key = `up${lit}`;
      if (litPhase !== key) {
        segEls.forEach((seg, i) => seg.setAttribute('fill', i < lit ? seg.dataset.zone : 'var(--ft-off)'));
        litPhase = key; litCount = -1;
      }
      ref('knob').style.display = 'none';
      if (ref('labels').dataset.unit !== 'minutes') { ref('labels').innerHTML = labelsMarkup('minutes'); ref('labels').dataset.unit = 'minutes'; }
      disk.setAttribute('aria-valuetext', formatElapsed(ms));
      const step = upStep(ms);
      if (w.status === 'running' && prevStep != null && step > prevStep) {
        stageAlert(`مضت ${formatMinutes(step * 15)}`, zoneColor(Math.min(0.9999, ((step * 15) % 60) / 60 + 0.01)));
      }
      prevStep = step;
      const hrs = Math.floor(ms / (60 * 60_000));
      const dk = `h${hrs}`;
      if (ref('dots').dataset.k !== dk) { ref('dots').dataset.k = dk; ref('dots').innerHTML = icon('circle', 'fill').repeat(Math.min(hrs, 8)); }
      const tg = el.querySelector('[data-act="toggle"]');
      if (w.status === 'running') setIconBtn(tg, 'pause', 'إيقاف مؤقت');
      else setIconBtn(tg, 'play_arrow', w.status === 'paused' ? 'استئناف' : 'ابدأ العدّ');
      const taskIn = ref('task');
      if (document.activeElement !== taskIn) taskIn.value = s.task ?? '';
      const list = s.tasks ?? [];
      const tk = `${list.length}|${list[0]?.at ?? ''}`;
      if (ref('tasks').dataset.k !== tk) {
        ref('tasks').dataset.k = tk;
        ref('tasks').innerHTML = list.slice(0, 5).map((x) => `<li><span></span><b dir="ltr">${formatElapsed(x.ms)}</b></li>`).join('');
        [...ref('tasks').children].forEach((li, i) => { li.firstChild.textContent = list[i].name; li.title = new Date(list[i].at).toLocaleString('ar'); });
      }
    }

    function render() {
      const now = Date.now();
      const s = store.get();
      const up = s.kind === 'up';
      const rootEl = el.querySelector('.ft');
      rootEl.dataset.kind = up ? 'up' : 'down';
      setIconBtn(el.querySelector('[data-act="kind"]'), up ? 'timer' : 'hourglass_bottom',
        up ? 'تصاعدي: يحسب الوقت المستغرق — اضغط للتنازلي' : 'تنازلي (بومودورو) — اضغط للتصاعدي');
      const notice = ref('notice');
      notice.hidden = !s.notice;
      notice.textContent = s.notice ?? '';
      if (up) { renderUp(now, s); renderStats(now, s); return; }
      const t = timer();
      const c = cfg();
      const unit = unitFor(t);
      const left = remaining(t, now);
      const frac = ringFraction(left, unit, phaseMs(t.phase, c));
      const rf = left / phaseMs(t.phase, c);
      if (t.status === 'running') {
        const crossed = t.phase === 'focus' ? quarterCrossed(prevFrac, rf) : null;
        if (crossed) stageAlert(`مضى ${crossed}٪ — بقي ${formatClock(left)}`, remainingColor(t.phase, rf));
        prevFrac = rf;
      } else prevFrac = t.status === 'paused' ? rf : null;
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
      if (showPicker) {
        syncWheels(t.remainingMs);
        ref('picker').dataset.hours = String(t.remainingMs >= 60 * 60_000 || unit === 'hours');
      }
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
      renderStats(now, s);
    }

    function renderStats(now, s) {
      const today = dayStats(s.log, new Date(now));
      const week = weekStats(s.log, new Date(now));
      ref('today').textContent = `${today.sessions}/${s.goal}`;
      ref('hours').textContent = formatMinutes(Math.round(today.minutes));
      ref('week').textContent = `${week.sessions} · ${formatMinutes(Math.round(week.minutes))}`;
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
      if (act === 'kind') {
        if ((timer().status === 'running' || sw().status === 'running') && !confirm('التبديل يوقف العدّ الجاري مؤقتاً. متابعة؟')) return;
        store.set({ kind: isUp() ? 'down' : 'up', timer: timer().status === 'running' ? pause(timer(), now) : timer(),
          sw: sw().status === 'running' ? swToggle(sw(), now) : sw(), notice: null });
        return;
      }
      if (isUp()) {
        const w = sw();
        if (act === 'toggle') store.set({ sw: swToggle(w, now), notice: null });
        if (act === 'sw-reset' && (swElapsed(w, now) < 60_000 || confirm('تصفير العدّ دون حفظه؟'))) store.set({ sw: swInitial(), notice: null });
        if (act === 'sw-done') {
          const ms = swElapsed(w, now);
          if (ms < 1000) return;
          const s = store.get();
          const name = s.task || 'مهمة';
          store.set({
            sw: swInitial(),
            tasks: logTask(s.tasks, name, ms, new Date(now)),
            log: ms >= 60_000 ? logFocus(s.log, new Date(now), Math.round(ms / 60_000)) : s.log,
            notice: `حُفظ: «${name}» استغرقت ${formatElapsed(ms)}`,
          });
        }
        if (act === 'mute') store.set({ muted: !store.get().muted });
        return;
      }
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
    ref('task').addEventListener('input', (e) => store.set({ task: e.target.value }));
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
      if (isUp()) { if (sw().status === 'running') render(); return; }
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
