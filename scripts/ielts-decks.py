#!/usr/bin/env python3
"""يحوّل ملف المالك IELTS_Master_Collection.xlsx إلى قوائم تدريب لودجة «كلمات إنجليزية».

المصدر الواحد: Google Drive ← مجلد «تعلم اللغة الإنجليزية» ← IELTS_Master_Collection.xlsx
(المعرّف 1-6caepDMr0p_Z_R3PIV7Nes6YywmELU8 — إصدار ١٦ ورقة). يُحدَّث الملف في درايف برفع «نسخة جديدة» عليه
(Manage versions) فيبقى المعرّف والرابط، ثم يُعاد تشغيل هذا السكربت على النسخة الجديدة.

الأوراق تُعرَّف بعنوانها لا بترتيبها: كل ورقة كلمات معروفة لها معرّف ثابت (ielts-NN) فيبقى تقدّم
المستخدم محفوظاً وإن تغيّر ترتيب الأوراق. أوراق «الخطط» (عنوانها يبدأ بـ«خطة») جداول للقراءة
تُكتب في decks/plans.js. ورقة جديدة غير معروفة تُرفض برسالة حتى يُضاف لها تحويل هنا.

كل ورقة ← قائمة مستقلة في app/vocab/decks/ielts-NN.js بصيغة الصفحة نفسها:
  cards: [المصطلح، المعنى العربي، الوسم، 0] · en: {المصطلح: مثال سياقي} · ar: {المصطلح: شرح إضافي بالعربية}
الاستعمال: python3 scripts/ielts-decks.py path/to/file.xlsx   (يحتاج openpyxl)
"""
import json, re, sys, pathlib
import openpyxl

OUT = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'vocab' / 'decks'

def s(v):
    return re.sub(r'\s+', ' ', str(v)).strip() if v is not None else ''

def en_ar(cell):
    """«Reservation (حجز)» ← ('Reservation', 'حجز')."""
    m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', s(cell))
    return (m.group(1).strip(), m.group(2).strip()) if m else (s(cell), '')

# لكل ورقة (بترتيبها): دالة صف ← (مصطلح، معنى، وسم، مثال، شرح عربي إضافي)
def row_simple(r):          # # | Word | POS | Meaning | Example
    return r[1], r[3], r[2], r[4], ''
MAP = [  # بترتيب الملف الأول (١٣ ورقة) — المعرّف ielts-NN = الموضع هنا، والعنوان في TITLES
    row_simple,
    row_simple,
    lambda r: (r[3], r[5], f"{re.sub(r'\s*\(.*', '', s(r[1]))} · {s(r[4])}", r[6], ''),
    lambda r: (r[3], r[5], r[4], r[6], f'A1: {s(r[1])} ← B1: {s(r[2])} ← C1: {s(r[3])}'),
    lambda r: (en_ar(r[4])[0], en_ar(r[4])[1], r[1], r[5], f'B1: {s(r[2])} ← B2: {s(r[3])} ← C1: {s(r[4])}'),
    lambda r: (r[1], r[2], r[3], r[4], ''),
    lambda r: (r[1], r[2], r[4], r[5], f'المترادفات: {s(r[3])}'),
    lambda r: (r[3], r[4], r[1], r[5], f'الوظيفة: {s(r[2])}'),
    lambda r: (r[3], r[4], f'{s(r[1])} + {s(r[2])}', r[5], ''),
    lambda r: (r[1], r[2], r[3], r[4], ''),
    lambda r: (r[2], r[3], f'بديل: {s(r[1])}', r[5], f'بديل أكاديمي لـ {s(r[1])}'),
    lambda r: (r[1], r[5], r[2], r[6], f'{s(r[3])} · أمثلة: {s(r[4])}'),
    lambda r: (r[3], r[4], f'{s(r[1])} = {s(r[2])}', r[5], f'البادئة {s(r[1])}: {s(r[2])}'),
    # ١٤ — أُضيفت في إصدار ١٦ ورقة؛ أعمدتها كورقة «حسب الأقسام»: # | القسم | رقم | الكلمة | النوع | المعنى | مثال
    lambda r: (r[3], r[5], f"{re.sub(r'\s*\(.*', '', s(r[1]))} · {s(r[4])}", r[6], ''),
]

TITLES = [
    'أهم 500 كلمة أكاديمية', 'أهم 50 كلمة للدرجة 7.0', 'أهم 400 كلمة حسب الأقسام', 'بدائل درجات 7.0 (A1-B1-C1)',
    'ترقية الدرجات (B1-B2-C1)', 'أهم 100 مصطلح (Idioms)', 'أهم 100 مترادف (Synonyms)', 'كلمات الربط للدرجة 8.0',
    'الأفعال المركبة (5 في 1)', 'الأفعال المركبة المصورة', '100 مترادف أكاديمي (16 أصل)', 'أهم 29 اختصار إملائي',
    'مضاعفة الحصيلة (أكواد البداية)', 'أهم 350 كلمة للاحتراف',
]

PLAN_TITLES = ['خطة المدة للاحتراف (من الصفر)', 'خطة الوصول لـ C1 بالذكاء الاصطناعي']

def deck_from(ws, fn, did):
    cards, en, ar, dup = [], {}, {}, 0
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not any(r):
            continue
        term, mean, tag, ex, extra = (s(x) for x in fn(r))
        if not term:
            continue
        if term in en:  # مصطلح مكرر في الورقة: يُدمج المعنى بدل بطاقة ثانية بالاسم نفسه
            dup += 1
            c = next(c for c in cards if c[0] == term)
            if mean and mean not in c[1]:
                c[1] += ' / ' + mean
            continue
        cards.append([term, mean, tag, 0])
        en[term] = ex
        ar[term] = extra or mean
    return {'id': did, 'name': f'IELTS · {ws.title}', 'cards': cards, 'en': en, 'ar': ar}, dup

def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    OUT.mkdir(parents=True, exist_ok=True)
    index, plans, unknown = [], [], []
    for ws in wb.worksheets:
        title = s(ws.title)
        if title in TITLES:
            n = TITLES.index(title) + 1
            deck, dup = deck_from(ws, MAP[n - 1], f'ielts-{n:02d}')
            (OUT / f"{deck['id']}.js").write_text('window.__DECK=' + json.dumps(deck, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
            index.append({'id': deck['id'], 'name': deck['name'], 'n': len(deck['cards'])})
            print(deck['id'], len(deck['cards']), 'بطاقة', f'(دُمج {dup} مكرر)' if dup else '', title)
        elif title.startswith('خطة'):
            rows = [[s(x) for x in r] for r in ws.iter_rows(values_only=True) if any(r)]
            # Excel يقصّ عناوين الأوراق إلى ٣١ حرفاً: نعيد العنوان الكامل المعروف
            full = next((t for t in PLAN_TITLES if t.startswith(title)), title)
            plans.append({'title': full, 'head': rows[0], 'rows': rows[1:]})
            print('خطة', len(rows) - 1, 'صفوف', title)
        else:
            unknown.append(title)
    if unknown:
        sys.exit('أوراق غير معروفة (أضف لها تحويلاً في MAP/TITLES): ' + ' · '.join(unknown))
    index.sort(key=lambda d: d['id'])
    lst = [{'id': 'ees525', 'name': 'EES 525 · Exam 2 Terms', 'n': 73}] + index
    (OUT / 'index.js').write_text(
        '// قوائم التدريب لودجة «كلمات إنجليزية» — يولّدها scripts/ielts-decks.py (لا تُحرَّر يدوياً)\n'
        'window.__DECKS=' + json.dumps(lst, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    (OUT / 'plans.js').write_text(
        '// خطط التعلّم من ملف IELTS (أوراق «خطة…») — جداول للقراءة، يولّدها scripts/ielts-decks.py\n'
        'window.__PLANS=' + json.dumps(plans, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')

if __name__ == '__main__':
    main(sys.argv[1])
