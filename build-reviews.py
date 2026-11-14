"""Export review cells only. Do not publish the workbooks or contributor columns."""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils.cell import coordinate_to_tuple

ROOT = Path(__file__).resolve().parent
BOOKS = ('association', 'campus-a')
PREFIX = 'globalThis.CQU_DATA = '
MARKER = '[个人信息已隐去]'

# Manually verified signatures embedded in review prose, keyed by review cell.
PRIVATE_FRAGMENTS = {
    ('association', '虎溪榜', 'F56'): ('石蕊实名',),
    ('campus-a', '东林食堂', 'I6'): ('（甘肃抹茶子）',),
}
CONTACT = re.compile(
    r'(?<!\d)(?:\+?86[ -]?)?1[3-9]\d[ -]?\d{4}[ -]?\d{4}(?!\d)'
    r'|(?<![\w.])[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?!\w)'
    r'|(?i:(?:微信(?:号)?|WeChat|QQ|学号|手机号|联系方式)\s*[:：]\s*[A-Za-z0-9_-]{5,})'
)
LINK = re.compile(r'https?://[^\s，。；！？<>"）]+', re.I)
# Manually verified review prose entered in the dish column.
REVIEW_IN_DISH = {('虎溪榜', f'B{row}') for row in (7, 9, 18, 20, 22, 24, 43, 49, 69, 78, 92)}


def evaluation_columns(book, sheet, row, name_column):
    if book == 'association':
        next_listing = 10 if sheet.title == '虎溪榜' else 8
        stop = next_listing if name_column < next_listing else sheet.max_column + 1
        return range(name_column + 2, stop)
    if sheet.title == '东林食堂':
        return (8, 9)
    if sheet.title == '周边外卖小吃':
        return (9,)
    if sheet.title == '柏树林' and row == 8:
        return (7, 11, 17)  # J8 is a dish, H/I and O/P are contributor metadata.
    if sheet.title == '柏树林' and row == 9:
        return (7, 10, 17)
    return (7, 10, 13)


def safe_review(book, sheet, cell):
    if not isinstance(cell.value, str) or not cell.value.strip() or cell.value.lstrip().startswith('='):
        return None
    value = cell.value
    for fragment in PRIVATE_FRAGMENTS.get((book, sheet, cell.coordinate), ()):
        if fragment not in value:
            raise ValueError(f'Privacy rule needs review: {sheet} {cell.coordinate}')
        value = value.replace(fragment, MARKER)
    value = CONTACT.sub(MARKER, value)
    return LINK.sub('[外链已移除]', value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for book in BOOKS:
        parser.add_argument(book, type=Path)
    parser.add_argument('--out', type=Path, default=ROOT/'reviews.js')
    args = parser.parse_args()
    books = {book: load_workbook(vars(args)[book], data_only=True) for book in BOOKS}
    data = json.loads((ROOT/'data.js').read_text(encoding='utf-8').removeprefix(PREFIX).strip().removesuffix(';'))
    output, stats = {}, Counter()
    for record in data['records']:
        for ref in record['sources']:
            book, name, anchor = (ref[k] for k in ('book', 'sheet', 'cell'))
            sheet = books[book][name]
            row, name_column = coordinate_to_tuple(anchor)
            # The existing data uses the standard D coordinate even when the
            # listing name was entered in C on the delivery sheet.
            name_value = sheet[anchor].value
            if not name_value and book == 'campus-a' and name == '周边外卖小吃' and not sheet.cell(row, 2).value:
                name_value = sheet.cell(row, 3).value
            if row != ref['row'] or not name_value:
                raise ValueError(f'Inconsistent source reference: {book} {name} {anchor}')
            candidates = evaluation_columns(book, sheet, row, name_column)
            cells = [sheet.cell(row,col) for col in candidates]
            if book == 'association':
                dish = sheet.cell(row, name_column + 1)
                if (name, dish.coordinate) in REVIEW_IN_DISH:
                    cells.insert(0, dish)
            key = '|'.join((book,name,anchor))
            quotes = [[cell.coordinate,text] for cell in cells if (text:=safe_review(book,name,cell)) is not None]
            if key in output:
                raise ValueError(f'Duplicate source reference: {key}')
            output[key] = quotes
            stats['quotes'] += len(quotes)
            stats['with_reviews'] += bool(quotes)
            stats['with_redaction'] += sum(MARKER in text or '[外链已移除]' in text for _,text in quotes)
        stats['records_with_reviews'] += any(output['|'.join(s[k] for k in ('book','sheet','cell'))] for s in record['sources'])
    args.out.write_text('globalThis.CQU_REVIEWS = '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    print(f'{len(data["records"])} records, {len(output)} source rows, {dict(stats)}')


if __name__ == '__main__':
    main()
