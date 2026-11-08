// ودجة مؤقت التركيز — السلوك فقط؛ المنطق في timer.js، والرسم في dial.js، والقالب في view.js، والأصوات في sound.js.
// • تنازلي (بومودورو، الوضع الأساسي): حلقة تُسحب بوقفات، وسلسلة تلقائية، وتنبيه عند كل لون.
// • تصاعدي (أداة قياس جانبية): يحسب الوقت المستغرق لمهمة، ويُحفظ في سجل المهام.
import { icon, setIconBtn } from '../../icons.js';
import { SEGS, labelsMarkup, pt, segmentsMarkup, ticksMarkup } from './dial.js';
import { chime, softCue, tick, unlockAudio } from './sound.js';
import { ROW, TEMPLATE } from './view.js';
import {
  PHASE_LABEL, advance, autoUnit, catchUp, configFor, customWith, dayStats,
  formatClock, formatMinutes, fromHMS, initial, isFinished, logFocus, logMinutes, pause, phaseMs, remaining, reset,
  nextUnit, remainingColor, ringFraction, splitHMS, start, weekStats, wrapUnit, zoneColor,
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
      if (act === 'settings') {
        const panel = ref('panel');
        panel.hidden = !panel.hidden;
        e.target.closest('[data-act]').setAttribute('aria-expanded', String(!panel.hidden));
        return;
      }
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
            log: logMinutes(s.log, new Date(now), ms / 60_000), // دقائق تركيز فقط — لا تُعدّ جلسة بومودورو
            notice: `حُفظ: «${name}» استغرقت ${formatElapsed(ms)}`,
          });
        }
        if (act === 'mute') store.set({ muted: !store.get().muted });
        return;
      }
      const t = timer();
      if (act === 'toggle') {
        unlockAudio();
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
