"""Read user-supplied XLSX exports, not the online editor. Raw files are not published."""
import argparse
import collections
import csv
import hashlib
import json
import re
import unicodedata as ud
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent
SOURCE = {
    'association': ('重大饭协红黑榜', 'https://www.kdocs.cn/l/chyey0G2RNBR'),
    'campus-a': ('重庆大学A区食堂红黑榜', 'https://www.kdocs.cn/l/cdGbIddi9s0b'),
}
RED = {'FF0000','E74025','DE3C36','C00000'}
BLACK = {'000000','0D0D0D','181717','404040'}
MIXED = {'FFFF00','FFC000','FEFB54','F4C243','ED7D31'}
CATES = [('火锅烤鱼','火锅|烤鱼|串串|酸汤鱼|汤锅'),('烧烤炸物','烧烤|烤肉|炸鸡|汉堡|烤串|炸串'),('粉面抄手','面|米线|米粉|螺蛳|螺丝粉|抄手|云吞|肠粉|饺'),('饮品甜点','咖啡|绵绵冰|水吧|奶绿|饮品|板栗饼|甜品|豆浆|蛋糕'),('小炒盖饭','饭|炒菜|称重|自选|盖浇|家常菜|川菜|小炒|黄焖鸡|餐馆|烤鸭|盒饭'),('早餐小吃','小吃|包子|生煎|早|煎饼|肉饼|凉面|红薯|卤味')]
SIGNALS = [('分量足','量大|分量[足大]|量很足|肉多|分量很足'),('分量偏小','量[小少]|分量[少小]|菜少|肉少|份量[少小]'),('价格实惠','实惠|便宜|性价比[高好]|物美价廉'),('价格偏高','有点贵|太贵|偏贵|很贵|不便宜|又贵|价高'),('偏油','油腻|太油|油多|全是油|比较油'),('辣度偏低','不太辣|不是很辣|没什么辣|辣度有点淡'),('等餐可能较久','等了|等挺久|上菜.{0,4}慢|排队容易'),('可续主食','无限续|免费续|面可续|米饭免费|可以续'),('回购意愿低','不想回购|不[会再想]点|不推荐'),('口味反馈偏正面','好吃|不错|好喝|推荐|夯|入味'),('口味反馈偏负面','难吃|不好吃|没味道|不咋地|吃不下去')]
def text(x):
    if x is None: return ''
    return re.sub(r'\s+', ' ', ud.normalize('NFKC', str(x))).strip()
def key(x):
    return re.sub(r'[^\w\u3400-\u9fff]+','',text(x).lower())
def price(x):
    v=text(x)
    if not v: return None
    m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*(?:R|元|块)?\s*±\s*(\d+(?:\.\d+)?)(?:R|元|块)?(?:的样子|左右)?',v,re.I)
    if m:
        a,b=map(float,m.groups())
        return [max(0,a-b),a+b]
    m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*(?:[-~至/]\s*(\d+(?:\.\d+)?))?\s*(?:R|元|块)?\s*(?:左右|大概是|\(超大杯\))?',v,re.I)
    if m:
        a,b=m.groups()
        return sorted([float(a),float(b or a)])
    return None
def flair(cell, fallback):
    v=text(cell.value)
    if v in {'避雷','黑榜'}: return 'black'
    if v=='推荐': return 'red'
    if v=='争议': return 'mixed'
    c=cell.fill.fgColor
    rgb=c.rgb[-6:] if cell.fill.patternType=='solid' and c.type=='rgb' else None
    return 'red' if rgb in RED else 'black' if rgb in BLACK else 'mixed' if rgb in MIXED else fallback
def label(d):
    return '虎溪' if d=='虎溪榜' else 'A 区' if d=='A' else '老校区'
def bounded(x,n=52):
    return x if len(x)<=n else x[:n-1]+'…'
SKIP = {'','店名','红榜','.', '几乎整个二楼','哈尔滨车站的老盒饭','时代天街寿司郎','时代天街老北京自助涮羊肉'}
ALIASES = {
    'A 区一食堂猪脚饭': ('一食堂','2F','猪脚饭','猪脚饭'),
    'A 区一食堂羊肉米粉': ('一食堂','2F','羊肉米粉','羊肉米粉'),
    'A 区一食堂杨国福麻辣烫': ('一食堂','2F','杨国福','麻辣烫'),
    'A 区一食堂二楼自助称重': ('一食堂','2F','称重自助餐','各种菜'),
    'A 区民主湖三楼滑蛋饭': ('民主湖','3F','韩式滑蛋饭','番茄肥牛卷'),
}
# Only merge manually matched stock listings; similar names elsewhere stay separate.
ALIASES = {key(k):v for k,v in ALIASES.items() if '滑蛋' not in k}
def clean_name(name):
    name=re.sub(r'\s*\((?:有?争议|争议[，,].*?)\)\s*$','',name)
    name=re.sub(r'\s*汉堡群在群精华.*$','',name)
    return name.rstrip(' ,，、')
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('association',type=Path); ap.add_argument('campus_a',type=Path)
    ap.add_argument('--out',type=Path,default=ROOT/'data.js')
    ap.add_argument('--snapshot',default='2026-11-14')
    args=ap.parse_args()
    items={}
    stats=collections.Counter()
    raw=[]
    def add(book,sheet,row,offset,name,dish,comments,rank,zone,venue,floor='',cost=None,location='',delivery=False,raw_price=''):
        raw_name,raw_dish=text(name),text(dish)
        name=clean_name(text(name)); dish=text(dish)
        if name in SKIP or re.match(r'^\dF\s*XXX$',name,re.I) or '黑榜(仅代表' in name:
            stats['excluded']+=bool(name)
            return
        content=' '.join(text(c) for c in comments if c)
        # No reviewer names, hometowns, long verbatim comments, or unverified hygiene accusations.
        if len(dish)>34 or re.search(r'好吃|难吃|便宜|推荐|味道|便宜|最爱|未知|所有|不辣|辣度',dish):
            content=dish+' '+content; dish=''
        if dish in {'全部','都有','无','别试','同上'}: dish=''
        if re.search(r'\b(20\d\d|\d\d年)\b.{0,4}(?:倒闭|停业)|已于.{0,6}倒闭|现在关门了',content):
            closed=True
        else: closed=False
        positive_text=re.sub(r'不好吃|不太好吃|不算好吃|不好喝|不推荐|不太推荐|没有.{0,6}好吃','',content)
        notes=[title for title,p in SIGNALS if re.search(p,positive_text if title=='口味反馈偏正面' else content)]
        category=next((t for t,p in CATES if re.search(p,name+' '+dish)),'其他')
        source={'book':book,'sheet':sheet,'row':row,'cell':offset+str(row),'mark':rank,'reviewDate':None}
        raw.append([SOURCE[book][0],sheet,source['cell'],raw_name,raw_dish,raw_price,rank,'外卖' if delivery else '', '',args.snapshot,SOURCE[book][1]])
        k='|'.join(map(key,(zone,venue,floor,name,dish)))
        special=key(name)
        if zone=='虎溪' and special in {key('西门干辣椒抄手'),key('雾漫里'),key('熙街 雾漫里自助烤肉')}:
            k=zone+'|'+('西门干辣椒抄手' if '抄手' in name else '雾漫里')
        if k not in items:
            items[k]={'id':hashlib.sha256(k.encode()).hexdigest()[:13],'name':name,'dish':bounded(dish),'zone':zone,'venue':venue,'floor':floor,'price':cost,'category':category,'signals':notes,'sources':[],'historicalClosure':closed,'location':bounded(location,50),'external':[]}
        else:
            stats['merged']+=1
            rec=items[k]
            rec['signals']=list(dict.fromkeys(rec['signals']+notes))
            rec['historicalClosure']=rec['historicalClosure'] or closed
            rec['price']=rec['price'] or cost
        items[k]['sources'].append(source)
        items[k]['delivery']=items[k].get('delivery',False) or delivery
        stats[book]+=1
    for book, file in [('association',args.association),('campus-a',args.campus_a)]:
        wb=load_workbook(file,data_only=True)
        for s in wb:
            if s.sheet_state!='visible' or s.title in {'Sheet3','WpsReserved_CellImgList'}: continue
            for row in range(2 if book=='association' else 4,s.max_row+1):
                def v(col): return text(s.cell(row,col).value)
                if book=='association':
                    other=10 if s.title=='虎溪榜' else 8
                    for col,end,default in [(1,other,'red'),(other,min(s.max_column+1,24),'black')]:
                        name=v(col)
                        if not name: continue
                        group=label(s.title)
                        zone=group if group=='虎溪' else ('A 区' if re.search(r'A区|民主湖|柏树林|东林|莘莘',name,re.I) else 'B 区' if re.search(r'B区',name,re.I) else 'C 区' if re.search(r'C区',name,re.I) else '老校区周边')
                        venue='校外 / 未定位'; floor=''
                        if re.search(r'食堂|餐厅|莘莘|民主湖|柏树林',name): venue='校内食堂'
                        if re.search(r'外卖',name): venue='外卖'
                        dish=v(col+1)
                        rank='mixed' if '争议' in name and '黑榜(' not in name else flair(s.cell(row,col),default)
                        alias=ALIASES.get(key(name)) if zone=='A 区' else None
                        if alias: venue,floor,name,dish=alias
                        comments=[v(j) for j in range(col+2,end)]
                        if not dish and not any(comments): rank='unknown'
                        add(book,s.title,row,s.cell(row,col).column_letter,name,dish,comments,rank,zone,venue,floor,delivery='外卖' in name or dish=='外卖')
                else:
                    off=2 if s.title=='周边外卖小吃' else 1 if s.title=='东林食堂' else 0
                    name=v(2+off); dish=v(3+off)
                    if not name and s.title=='周边外卖小吃' and v(3) and not v(2):
                        name=v(3)
                    if not name: continue
                    floor=v(2) if off==1 else ''
                    m=re.match(r'^(?:民主湖\s*)?(\d)\s*F\s*',name,re.I)
                    if m: floor=m[1]+'F'; name=name[m.end():]
                    if name.startswith('称重自助餐'): name='称重自助餐'
                    if dish=='拌饭拌面 推荐菜无脑吃': dish='拌饭拌面'
                    if dish=='螺丝粉': dish='螺蛳粉'
                    reviews=[v(7+off)]
                    if off==1: reviews.append(v(9))
                    elif off==0 and s.title=='柏树林':
                        if row==8: reviews.extend([v(11),v(17)])
                        elif row in (9,10): reviews.append(v(10))
                    elif off==0: reviews.append(v(10))
                    rank=flair(s.cell(row,1),'unknown') if any(reviews) else 'unknown'
                    add(book,s.title,row,s.cell(row,2+off).column_letter,name,dish,reviews,rank,'A 区',s.title,floor,price(v(4+off)),v(3) if off==2 and v(2) else '',off==2 and '外卖' in v(2),v(4+off))
    platform=json.loads((ROOT/'platforms.json').read_text(encoding='utf-8'))
    for obj in items.values():
        marks={s['mark'] for s in obj['sources']} - {'unknown'}
        obj['tier']='mixed' if 'mixed' in marks or len(marks)>1 else next(iter(marks),'unknown')
        for p in platform['matched']:
            if obj['zone']==p['zone'] and p['match'] in obj['name']:
                obj['external'].append({k:v for k,v in p.items() if k not in {'match','zone'}})
    # Publish only classified entries, including their retained source rows.
    recs=[r for r in items.values() if r['tier']!='unknown']
    published_sources={(s['book'],s['sheet'],s['cell']) for r in recs for s in r['sources']}
    labels_to_books={value[0]:book for book,value in SOURCE.items()}
    raw=[row for row in raw if (labels_to_books[row[0]],row[1],row[2]) in published_sources]
    for book in SOURCE:
        stats[book]=sum(b==book for b,_,_ in published_sources)
    ratings=json.loads((ROOT/'ratings.json').read_text(encoding='utf-8'))
    for r in recs:
        r.setdefault('delivery',False)
        r['reviewDate']=None
        r['capturedAt']=args.snapshot
        evidence=next((item for item in ratings['entries'] if r['zone']==item['zone'] and item['name'] in r['name']),None)
        r['features']=evidence['features'] if evidence else (r['external'][0]['fact'] if r['external'] else '')
        r['ratings']=[dict(obs,checked=ratings['checked']) for obs in evidence['ratings']] if evidence else []
        if r['external'] or evidence: r['platformCheckedAt']=ratings['checked']
    out={'records':recs,'stats':dict(stats),'books':{k:{'name':v[0],'url':v[1]} for k,v in SOURCE.items()},'context':platform['context']}
    args.out.write_text('globalThis.CQU_DATA = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    dest=args.out.parent/'downloads'
    dest.mkdir(exist_ok=True)
    def safe(s):
        return "'"+s if isinstance(s,str) and re.match(r'^[=+@-]',s) else s
    with (dest/'source-rows.csv').open('w',encoding='utf-8-sig',newline='') as handle:
        writer=csv.writer(handle)
        writer.writerow(['原表','工作表','单元格','原表名称','原表菜品或类型','原价文字','标记','外卖','测评日期','采集日期','出处'])
        for line in raw:
            title,dish=line[3:5]
            if len(dish)>34 or re.search(r'好吃|难吃|推荐|味道|最爱|辣度',dish): dish=''
            line[3:5]=title,dish
            writer.writerow([safe(field) for field in line])
    print(len(recs),dict(stats),dict(collections.Counter(r['tier'] for r in recs)),dict(collections.Counter(r['zone'] for r in recs)))
if __name__=='__main__': main()
