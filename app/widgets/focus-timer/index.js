// ودجة مؤقت التركيز (بومودورو) — منفصلة الآن، وتُربط بالبكور في مرحلة ثانية.
// القرص: قطاع ملوّن يتناقص كمؤقتات الدراسة المرئية — برتقالي للتركيز، أخضر للراحة.
import {
  PHASE_LABEL, PRESETS, advance, configFor, dayStats, formatClock, formatMinutes, fraction, initial, isFinished,
  logFocus, pause, remaining, reset, start, weekStats,
} from './timer.js';

const DEFAULTS = {
  mode: 'classic',
  custom: { focus: 25, short: 5 },
  goal: 8,            // «بومودورو: ___/8» من مستند الأدوات
  timer: null,        // حالة المؤقت (انظر timer.js) — null = لم يبدأ بعد
  log: {},            // { 'YYYY-MM-DD': { sessions, minutes } }
  notice: null,       // رسالة «انتهت الجلسة» حين ينتهي العدّ والصفحة مغلقة
};

const MODES = [...Object.entries(PRESETS).map(([id, p]) => [id, `${p.label} ${p.focus}/${p.short}`]), ['custom', 'مخصص']];

const TEMPLATE = `
  <div class="ft">
    <div class="ft-modes" data-size="m l" role="group" aria-label="النموذج">
      ${MODES.map(([id, label]) => `<button type="button" data-mode="${id}">${label}</button>`).join('')}
    </div>
    <div class="ft-custom" data-size="m l" data-ref="custom" hidden>
      <label>تركيز <input type="number" min="1" max="180" inputmode="numeric" data-ref="cf" dir="ltr"> د</label>
      <label>راحة <input type="number" min="1" max="180" inputmode="numeric" data-ref="cs" dir="ltr"> د</label>
    </div>
    <div class="ft-face">
      <svg viewBox="0 0 200 200" class="ft-disk" aria-hidden="true">
        <circle cx="100" cy="100" r="92" class="ft-plate"/>
        <g data-ref="ticks"></g>
        <path data-ref="sector" class="ft-sector"/>
        <circle cx="100" cy="100" r="58" class="ft-hub"/>
      </svg>
      <div class="ft-center">
        <span class="ft-phase" data-ref="phase"></span>
        <b class="ft-time" data-ref="time" dir="ltr"></b>
        <span class="ft-dots" data-ref="dots" aria-label="جلسات الدورة"></span>
      </div>
    </div>
    <p class="ft-notice" data-ref="notice" role="status" hidden></p>
    <div class="ft-actions">
      <button type="button" class="ft-btn ft-primary" data-act="toggle"></button>
      <button type="button" class="ft-btn" data-act="skip" title="انتقل للمرحلة التالية">تخطٍّ ⏭</button>
      <button type="button" class="ft-btn" data-act="reset" title="أعد المرحلة الحالية لبدايتها">إعادة ↺</button>
    </div>
    <div class="ft-stats" data-size="m l">
      <div><span>اليوم</span><b data-ref="today"></b></div>
      <div><span>ساعات التركيز</span><b data-ref="hours"></b></div>
      <div data-size="l"><span>آخر ٧ أيام</span><b data-ref="week"></b></div>
    </div>
    <div class="ft-goal" data-size="l">
      <label>هدف اليوم <input type="number" min="1" max="24" inputmode="numeric" data-ref="goal" dir="ltr"> جلسات</label>
    </div>
  </div>`;

// قطاع من الزاوية صفر (أعلى) باتجاه عقارب الساعة، بنسبة frac من الدائرة
function sectorPath(frac) {
  if (frac <= 0) return '';
  if (frac >= 0.9999) return 'M100 8 A92 92 0 1 1 99.99 8 Z';
  const a = frac * 2 * Math.PI;
  const x = 100 + 92 * Math.sin(a);
  const y = 100 - 92 * Math.cos(a);
  return `M100 100 L100 8 A92 92 0 ${frac > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
}

function ticks() {
  let out = '';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * 2 * Math.PI;
    const long = i % 5 === 0;
    const r1 = long ? 80 : 86;
    out += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(2)}" y1="${(100 - r1 * Math.cos(a)).toFixed(2)}" x2="${(100 + 90 * Math.sin(a)).toFixed(2)}" y2="${(100 - 90 * Math.cos(a)).toFixed(2)}" class="${long ? 'ft-tick-l' : 'ft-tick'}"/>`;
  }
  return out;
}

// نغمة قصيرة بلا ملفات صوتية. المتصفح يسمح بالصوت بعد لمسة المستخدم، و«ابدأ» لمسة.
let audio = null;
function chime() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [i, freq] of [[0, 880], [1, 660], [2, 880]]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.28 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.28 + 0.25);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + i * 0.28);
      osc.stop(t + i * 0.28 + 0.26);
    }
  } catch { /* لا صوت متاح — نكتفي بالرسالة */ }
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
    ref('ticks').innerHTML = ticks();

    const cfg = () => { const s = store.get(); return configFor(s.mode, s.custom); };
    const timer = () => store.get().timer ?? initial(cfg());

    // انتهت المرحلة: سجّل التركيز (إن كانت تركيزاً) وانتقل للتالية دون بدء
    function finish(now, { audible }) {
      const s = timer();
      const c = cfg();
      const patch = { timer: advance(s, c) };
      if (s.phase === 'focus') {
        patch.log = logFocus(store.get().log, new Date(s.endsAt ?? now), c.focus);
        patch.notice = 'انتهت جلسة التركيز — وقت الراحة ☕';
      } else {
        patch.notice = 'انتهت الراحة — جاهز لجلسة تركيز 🍅';
      }
      store.set(patch);
      if (audible) chime();
    }

    function render() {
      const now = Date.now();
      const s = store.get();
      const t = timer();
      const c = cfg();
      const root = el.querySelector('.ft');
      root.dataset.phase = t.phase;
      root.dataset.status = t.status;
      ref('time').textContent = formatClock(remaining(t, now));
      ref('phase').textContent = PHASE_LABEL[t.phase];
      ref('sector').setAttribute('d', sectorPath(fraction(t, now, c)));
      const per = c.every || 4;
      ref('dots').textContent = c.every ? '🍅'.repeat(t.done % per) + '○'.repeat(per - (t.done % per)) : '';
      const toggle = el.querySelector('[data-act="toggle"]');
      toggle.textContent = t.status === 'running' ? 'إيقاف مؤقت ⏸' : t.status === 'paused' ? 'استئناف ▶' : 'ابدأ ▶';
      for (const b of el.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode));
      ref('custom').hidden = s.mode !== 'custom' || ctx.size === 's'; // حقول المخصص: عند اختياره فقط، وليس في الحجم الصغير
      const today = dayStats(s.log, new Date(now));
      const week = weekStats(s.log, new Date(now));
      ref('today').textContent = `${today.sessions}/${s.goal}`;
      ref('hours').textContent = formatMinutes(today.minutes);
      ref('week').textContent = `${week.sessions} · ${formatMinutes(week.minutes)}`;
      const notice = ref('notice');
      notice.hidden = !s.notice;
      notice.textContent = s.notice ?? '';
      for (const [r, v] of [['cf', s.custom.focus], ['cs', s.custom.short], ['goal', s.goal]]) {
        if (document.activeElement !== ref(r)) ref(r).value = v;
      }
    }

    function tick() {
      if (isFinished(timer(), Date.now())) finish(Date.now(), { audible: true });
      else render();
    }

    el.addEventListener('click', (e) => {
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        const t = timer();
        if (t.status === 'running' && !confirm('تغيير النموذج يوقف الجلسة الحالية. متابعة؟')) return;
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
    });

    const onNumber = (refName, apply) => ref(refName).addEventListener('change', (e) => apply(e.target.value));
    onNumber('cf', (v) => {
      const custom = { ...store.get().custom, focus: configFor('custom', { focus: v }).focus };
      store.set({ custom, ...(timer().status === 'idle' ? { timer: initial(configFor('custom', custom)) } : {}) });
    });
    onNumber('cs', (v) => {
      const custom = { ...store.get().custom, short: configFor('custom', { short: v }).short };
      store.set({ custom });
    });
    onNumber('goal', (v) => store.set({ goal: Math.min(24, Math.max(1, parseInt(v, 10) || 8)) }));

    function applySize(size) {
      for (const node of el.querySelectorAll('[data-size]')) node.hidden = !node.dataset.size.split(' ').includes(size);
      render();
    }

    // إن انتهى العدّ والصفحة مغلقة: نسجّله الآن بصمت ونُظهر رسالة
    if (isFinished(timer(), Date.now())) finish(Date.now(), { audible: false });

    const unsubscribe = store.subscribe(render);
    const offResize = ctx.onResize(applySize);
    applySize(ctx.size);
    const interval = setInterval(tick, 250);

    return () => {
      clearInterval(interval);
      unsubscribe();
      offResize();
      el.innerHTML = '';
    };
  },
};
