// رسم قرص الساعة SVG — منقول من index.html الأصلي بنفس الهندسة والألوان، دون اسم «AL DHAFAR 3» (قرار المالك).
// كل القيم المدرجة أرقام أو ثوابت من الكود، لا مدخلات مستخدم.
import { awakeStatus, hourDegrees, isNightHour, minuteDegrees, secondDegrees } from './time.js';

const C = 200; // مركز القرص في viewBox 400×400
const pt = (r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
};
const f = (n) => Math.round(n * 100) / 100;

function bezel({ hoursAwake, bezelMode, showAwakeProgress }) {
  const outerR = 195;
  const innerR = 160;
  let out = '';
  for (let i = 0; i < 23; i++) {
    const hour = i + 1;
    const a0 = i * 15 - 255;
    const a1 = (i + 1) * 15 - 255;
    let bg = '#000';
    let fg = '#FFF';
    if (showAwakeProgress) {
      bg = hour <= Math.floor(hoursAwake) ? '#888' : '#000';
    } else if (bezelMode === 'daynight') {
      [bg, fg] = hour >= 6 && hour < 18 ? ['#FFF', '#000'] : ['#666', '#FFF'];
    }
    const [x1, y1] = pt(outerR, a0);
    const [x2, y2] = pt(outerR, a1);
    const [x3, y3] = pt(innerR, a1);
    const [x4, y4] = pt(innerR, a0);
    out += `<path d="M${f(x1)} ${f(y1)}A${outerR} ${outerR} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${innerR} ${innerR} 0 0 0 ${f(x4)} ${f(y4)}Z" fill="${bg}" stroke="#333" stroke-width="0.5"/>`;
    const la = (i + 0.5) * 15 - 255;
    const [lx, ly] = pt(177, la);
    out += `<text x="${f(lx)}" y="${f(ly)}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="${fg}" font-family="Arial" transform="rotate(${f(la + 90)},${f(lx)},${f(ly)})">${String(hour).padStart(2, '0')}</text>`;
  }
  // المثلث الأحمر: مؤشر وقت الاستيقاظ
  const red = -255 - 7.5;
  const [tx, ty] = pt(innerR, red);
  const [bx, by] = pt(outerR - 5, red);
  const perp = ((red + 90) * Math.PI) / 180;
  const lx = bx + 8 * Math.cos(perp);
  const ly = by + 8 * Math.sin(perp);
  const rx = bx - 8 * Math.cos(perp);
  const ry = by - 8 * Math.sin(perp);
  out += `<polygon points="${f(tx)},${f(ty)} ${f(lx)},${f(ly)} ${f(rx)},${f(ry)}" fill="#C41E3A"/>`;
  return out;
}

function face({ dialMode, dialNightMode, nightGradientMode }) {
  if (dialMode === 'white') return `<circle cx="200" cy="200" r="155" fill="#FAFAFA" stroke="#DDD" stroke-width="2"/>`;
  const ns = dialNightMode === '19-05' ? 19 : 18;
  const ne = dialNightMode === '19-05' ? 5 : 6;
  const [x1, y1] = pt(160, (ns - 12) * 15 - 90);
  const [x2, y2] = pt(160, (ne - 12) * 15 - 90);
  const grad = nightGradientMode === 'radial' ? 'nightRadial' : 'nightLinear';
  return `<g clip-path="url(#bk-dialClip)"><circle cx="200" cy="200" r="155" fill="#FAFAFA"/>`
    + `<path d="M200 200L${f(x1)} ${f(y1)}A160 160 0 1 1 ${f(x2)} ${f(y2)}Z" fill="url(#bk-${grad})"/></g>`
    + `<circle cx="200" cy="200" r="155" fill="none" stroke="#DDD" stroke-width="2"/>`;
}

function numerals({ dialMode, dialNightMode }) {
  return [4, 8, 12, 16, 20, 0].map((h) => {
    const [x, y] = pt(140, h * 15 - 270);
    const night = isNightHour(h === 0 ? 24 : h, dialNightMode);
    const fill = dialMode === 'daynight' && night ? '#FFF' : '#111';
    return `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="700" fill="${fill}" font-family="Arial">${String(h).padStart(2, '0')}</text>`;
  }).join('');
}

/** يعيد محتوى SVG الداخلي (بدون وسم svg) للحالة والوقت المعطيين. */
export function dialMarkup(now, s, hoursAwake) {
  const h = now.getHours();
  const m = now.getMinutes();
  const sec = now.getSeconds();
  const hourAngle = ((hourDegrees(h, m) - 90) * Math.PI) / 180;
  const gx = f(50 + 50 * Math.cos(hourAngle));
  const gy = f(50 + 50 * Math.sin(hourAngle));
  return `<defs>
    <filter id="bk-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.5"/></filter>
    <linearGradient id="bk-caseGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F0F0F0"/><stop offset="50%" stop-color="#C8C8C8"/><stop offset="100%" stop-color="#A0A0A0"/></linearGradient>
    <clipPath id="bk-dialClip"><circle cx="200" cy="200" r="155"/></clipPath>
    <radialGradient id="bk-nightRadial" cx="${gx}%" cy="${gy}%" r="100%" fx="${gx}%" fy="${gy}%"><stop offset="0%" stop-color="#000"/><stop offset="30%" stop-color="#111"/><stop offset="60%" stop-color="#333"/><stop offset="100%" stop-color="#555"/></radialGradient>
    <linearGradient id="bk-nightLinear" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#555"/><stop offset="50%" stop-color="#222"/><stop offset="100%" stop-color="#000"/></linearGradient>
  </defs>
  <circle cx="200" cy="200" r="198" fill="url(#bk-caseGrad)" filter="url(#bk-shadow)"/>
  <g transform="rotate(${f(s.bezelRotation)},200,200)">
    <circle cx="200" cy="200" r="195" fill="#666" stroke="#333" stroke-width="2"/>${bezel({ hoursAwake, bezelMode: s.bezelMode, showAwakeProgress: s.showAwakeProgress })}
  </g>
  ${face(s)}${numerals(s)}
  <rect x="187" y="268" width="26" height="18" fill="#FFF" stroke="#333" stroke-width="1.5" rx="2"/>
  <text x="200" y="281" text-anchor="middle" font-size="12" font-weight="700" fill="#111" font-family="Arial">${now.getDate()}</text>
  <g transform="rotate(${f(hourDegrees(h, m) - 180)},200,200)">
    <path d="M194,200 L197,100 L200,70 L203,100 L206,200 Z" fill="#C41E3A" stroke="#8B0000" stroke-width="0.5"/>
    <path d="M196,200 L198,230 L200,245 L202,230 L204,200 Z" fill="#C41E3A" stroke="#8B0000" stroke-width="0.5"/>
  </g>
  <g transform="rotate(${f(minuteDegrees(m, sec))},200,200)">
    <path d="M196,200 L198,160 L200,135 L202,160 L204,200 Z" fill="#C41E3A" stroke="#8B0000" stroke-width="0.5"/>
  </g>
  <g transform="rotate(${secondDegrees(sec)},200,200)">
    <line x1="200" y1="130" x2="200" y2="160" stroke="#C41E3A" stroke-width="2"/>
    <line x1="200" y1="160" x2="200" y2="225" stroke="#C41E3A" stroke-width="2"/>
    <circle cx="200" cy="225" r="5" fill="#C41E3A"/>
  </g>
  <circle cx="200" cy="200" r="10" fill="#C41E3A"/>
  <circle cx="200" cy="200" r="4" fill="#8B0000"/>`;
}

export { awakeStatus };
