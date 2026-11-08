// قالب واجهة المؤقت: الأزرار أيقونات Material Symbols بتلميح الاسم، و[data-down]/[data-up] لكل وضع.
import { icon, tip } from '../../icons.js';
import { PRESETS } from './timer.js';

export const MODES = [...Object.entries(PRESETS).map(([id, p]) => [id, `${p.focus}/${p.short}`, p.label]), ['custom', '', 'مخصص']];
export const ROW = 34; // ارتفاع صف العجلة بالبكسل — صف واحد ظاهر، كالعدّاد أثناء التشغيل
const range = (n) => Array.from({ length: n }, (_, i) => i);
const wheel = (key, n, label) => `
  <div class="ft-wheel" data-wheel="${key}" tabindex="0" aria-label="${label}">
    <div class="ft-wheel-pad"></div>${range(n).map((i) => `<div class="ft-wheel-item">${String(i).padStart(2, '0')}</div>`).join('')}<div class="ft-wheel-pad"></div>
  </div>`;

export const TEMPLATE = `
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
      <div ${tip('جلسات بومودورو اليوم / الهدف')}>${icon('today')}<b data-ref="today"></b></div>
      <div ${tip('ساعات التركيز اليوم')}>${icon('timer')}<b data-ref="hours"></b></div>
      <div data-size="l" ${tip('آخر ٧ أيام')}>${icon('calendar_month')}<b data-ref="week"></b></div>
    </div>
    <ul class="ft-tasks" data-ref="tasks" data-up data-size="m l"></ul>
    <div class="ft-goal" data-size="l">
      <label>هدف اليوم <input type="number" min="1" max="24" inputmode="numeric" data-ref="goal" dir="ltr"> جلسات</label>
    </div>
  </div>`;
