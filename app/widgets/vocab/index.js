// «كلمات إنجليزية» — بطاقات المصطلحات مع التهجئة والنطق والكتابة (طلب المالك، ٨ نوفمبر).
// الصفحة منسوخة كما هي من أداة المالك (EES 525 Exam 2 Flashcards) إلى app/vocab/index.html،
// وتُعرض في إطار معزول. حفظ التقدّم في localStorage بمفاتيح ees525-* (لا تتعارض مع bukur:*).
// لاحقاً: قوائم كلمات يختارها المستخدم بدل قائمة المقرر الواحدة.
import { embedWidget } from '../embed.js';

export default embedWidget({
  id: 'vocab',
  name: 'كلمات إنجليزية',
  src: './vocab/index.html',
  heights: { s: 560, m: 900, l: 1400 },
  note: 'بطاقات · نطق · كتابة',
});
