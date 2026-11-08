// رسم قرص المؤقت (SVG): ١٠٠ شريط ملوّن بموضعه، وحلقة نقاط، وأرقام الحلقة (∞ في القمة).
import { PERCENT_LABELS, RING, zoneColor } from './timer.js';

export const pt = (r, frac) => {
  const a = frac * 2 * Math.PI;
  return [100 + r * Math.sin(a), 100 - r * Math.cos(a)];
};

export function ticksMarkup() {
  // حلقة نقاط خارج الأشرطة كالمؤقت المرجعي — نقطة أكبر كل ١٠٪
  let out = '';
  for (let i = 0; i < 100; i++) {
    const [x, y] = pt(97, i / 100);
    out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${i % 10 === 0 ? 1.3 : 0.6}" class="ft-dot"/>`;
  }
  return out;
}

// ١٠٠ شريط كالمؤقت المرجعي — لونه بحسب موضعه (أحمر ← برتقالي ← أصفر ← فيروزي)
export const SEGS = 100;
export function segmentsMarkup() {
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

export const labelsMarkup = (unit) => (unit === 'percent' ? PERCENT_LABELS : RING[unit].labels).map((n, i, arr) => {
  const [x, y] = pt(104, i / arr.length);
  // الصفر في القمة يُكتب ∞ كما في ساعة البكور (طلب المالك) — في الدقائق والساعات؛ وفي النسبة تبقى ١٠٠٪
  if (i === 0 && unit !== 'percent') return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central" class="ft-inf">∞</text>`;
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central">${unit === 'percent' ? `${n}%` : n}</text>`;
}).join('');
