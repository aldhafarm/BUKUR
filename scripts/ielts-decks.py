#!/usr/bin/env python3
"""يحوّل ملف المالك IELTS_Master_Collection_13Sheets.xlsx إلى قوائم تدريب لودجة «كلمات إنجليزية».

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
MAP = [
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
]

def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    assert len(wb.worksheets) == len(MAP), f'عدد الأوراق {len(wb.worksheets)} لا يطابق {len(MAP)}'
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for n, (ws, fn) in enumerate(zip(wb.worksheets, MAP), 1):
        did = f'ielts-{n:02d}'
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
        deck = {'id': did, 'name': f'IELTS · {ws.title}', 'cards': cards, 'en': en, 'ar': ar}
        (OUT / f'{did}.js').write_text('window.__DECK=' + json.dumps(deck, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
        index.append({'id': did, 'name': deck['name'], 'n': len(cards)})
        print(did, len(cards), 'بطاقة', f'(دُمج {dup} مكرر)' if dup else '', ws.title)
    lst = [{'id': 'ees525', 'name': 'EES 525 · Exam 2 Terms', 'n': 73}] + index
    (OUT / 'index.js').write_text(
        '// قوائم التدريب لودجة «كلمات إنجليزية» — يولّدها scripts/ielts-decks.py (لا تُحرَّر يدوياً)\n'
        'window.__DECKS=' + json.dumps(lst, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')

if __name__ == '__main__':
    main(sys.argv[1])
