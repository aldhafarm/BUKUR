// «خارطة النجوم» — عجلة السنة النجمية (تقويم المنازل النجدي ٢٨ منزلة): star-year-wheel.html كما هو.
// مستقلة الآن، وتُربط بساعة البكور لاحقاً (قرار المالك). الملف لا يُجزَّأ (CLAUDE.md لمشروع سبر البكور).
import { embedWidget } from '../embed.js';

export default embedWidget({
  id: 'star-wheel',
  name: 'خارطة النجوم',
  src: './star/index.html',
  heights: { s: 480, m: 760, l: 1100 },
  note: 'السنة النجمية — ٢٨ منزلة',
});
