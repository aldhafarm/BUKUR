// ودجة «تضمين»: تعرض صفحة مستقلة داخل إطار معزول (iframe) من نفس النطاق.
// لماذا: الساعة الاحترافية (React + Tailwind) وعجلة السنة النجمية صفحتان كاملتان بأنماطهما؛
// الإطار يمنع تسرّب أنماطهما إلى الحاضنة، ويبقي كل منهما كما بُنيت. الربط بينها لاحقاً عبر postMessage.

import { icon } from '../icons.js';

/**
 * minWidth: أقل عرض تُصمَّم له الصفحة المضمّنة. إن ضاقت البطاقة عنه (القائمة الجانبية) تُعرض الصفحة
 * بعرضها التصميمي ثم تُصغَّر كلها لتلائم البطاقة — بدل أن تُقصّ أو تتمدد نصوصها.
 */
export function embedWidget({ id, name, src, heights, note, defaultWidth = 1, minWidth = 400 }) {
  return {
    id,
    name,
    sizes: ['s', 'm', 'l'],
    defaultSize: 'm',
    defaultWidth,
    defaults: {},
    mount(el, ctx) {
      el.innerHTML = `
        <div class="em">
          <div class="em-bar">
            ${note ? `<span class="em-note"></span>` : '<span></span>'}
            <a class="em-open" target="_blank" rel="noopener" data-tip="افتحها وحدها في تبويب" aria-label="افتحها وحدها في تبويب">${icon('open_in_new')}</a>
          </div>
          <div class="em-box"><iframe class="em-frame" loading="lazy" title=""></iframe></div>
        </div>`;
      const url = new URL(src, location.href).href;
      el.querySelector('.em-open').href = url;
      if (note) el.querySelector('.em-note').textContent = note;
      const frame = el.querySelector('.em-frame');
      frame.title = name;
      frame.src = url;
      const box = el.querySelector('.em-box');
      let size = ctx.size;
      // التصغير للملاءمة: الإطار بعرضه التصميمي، ثم scale بنسبة عرض البطاقة إليه
      function fit() {
        const h = heights[size] ?? heights.m;
        const avail = box.clientWidth;
        const scale = avail > 0 && avail < minWidth ? avail / minWidth : 1;
        frame.style.width = scale < 1 ? `${minWidth}px` : '100%';
        frame.style.height = `${scale < 1 ? Math.round(h / scale) : h}px`;
        frame.style.transform = scale < 1 ? `scale(${scale})` : '';
        box.style.height = `${h}px`;
      }
      const ro = new ResizeObserver(fit);
      ro.observe(box);
      const off = ctx.onResize((next) => { size = next; fit(); });
      fit();
      return () => { ro.disconnect(); off(); el.innerHTML = ''; };
    },
  };
}
