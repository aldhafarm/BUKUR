// «كلمات إنجليزية» — بطاقات المصطلحات مع التهجئة والنطق والكتابة (طلب المالك، ٨ نوفمبر).
// الصفحة من أداة المالك (EES 525 Exam 2 Flashcards) في app/vocab/index.html، في إطار معزول، مع إضافة واحدة:
// «قائمة التدريب» — قائمة المقرر الأصلية + ١٣ قائمة IELTS (كل ورقة من ملف المالك قائمة، app/vocab/decks/،
// يولّدها scripts/ielts-decks.py). لكل قائمة تقدّمها المستقل؛ التقدّم في localStorage (لا يتعارض مع bukur:*).
import { embedWidget } from '../embed.js';

export default embedWidget({
  id: 'vocab',
  name: 'كلمات إنجليزية',
  src: './vocab/index.html',
  minWidth: 400, // يُصغَّر في القائمة الجانبية بدل أن يُقصّ
  heights: { s: 560, m: 900, l: 1400 },
  note: '١٤ قائمة · بطاقات · نطق · كتابة',
  defaultWidth: 3, // كامل العرض في التبويب الكامل: صفحتها عمودان (التدريب + البطاقة)
});
