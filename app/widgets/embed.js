// ودجة «تضمين»: تعرض صفحة مستقلة داخل إطار معزول (iframe) من نفس النطاق.
// لماذا: الساعة الاحترافية (React + Tailwind) وعجلة السنة النجمية صفحتان كاملتان بأنماطهما؛
// الإطار يمنع تسرّب أنماطهما إلى الحاضنة، ويبقي كل منهما كما بُنيت. الربط بينها لاحقاً عبر postMessage.

import { icon } from '../icons.js';

export function embedWidget({ id, name, src, heights, note, defaultWidth = 1 }) {
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
          <iframe class="em-frame" loading="lazy" title=""></iframe>
        </div>`;
      const url = new URL(src, location.href).href;
      el.querySelector('.em-open').href = url;
      if (note) el.querySelector('.em-note').textContent = note;
      const frame = el.querySelector('.em-frame');
      frame.title = name;
      frame.src = url;
      const applySize = (size) => { frame.style.height = `${heights[size] ?? heights.m}px`; };
      const off = ctx.onResize(applySize);
      applySize(ctx.size);
      return () => { off(); el.innerHTML = ''; };
    },
  };
}
