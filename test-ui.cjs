const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.resolve(process.argv[2]||__dirname);
function load(file,query=''){
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'https://wcnz-coder.github.io/cqu-food-guide/'+file+query,runScripts:'outside-only'});
 const w=dom.window;
 w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const script of w.document.querySelectorAll('script[src]'))w.eval(fs.readFileSync(path.join(root,script.getAttribute('src').split('?')[0]),'utf8'));
 return w;
}
const w=load('guide.html','?q=煎饼'),d=w.document;
assert.equal(d.querySelectorAll('.card').length,2);
const pancake=[...d.querySelectorAll('.card')].find(x=>x.textContent.includes('二食堂山东煎饼'));
console.log('SEARCH 煎饼: '+d.querySelectorAll('.card').length);
console.log('LABELS: '+pancake.querySelector('.traits').textContent);
console.log('DINE-IN: '+d.querySelector('[value="dine-in"]').textContent);
pancake.querySelector('button').click();
console.log('DETAIL correction link: '+!!d.querySelector('#detail-body a[href^="feedback.html"]'));
assert.equal(d.querySelector('#detail-body a[href*="amap.com"]'),null);
assert.doesNotMatch(d.querySelector('#detail-body').textContent,/不代表现况|以门店当日为准|不等于投票人数/);
assert.ok(d.querySelector('#detail-body .practical').textContent.includes('原表价格'));
const home=load('index.html'),hd=home.document,quick=hd.querySelector('#quick-search');
console.log('HOME quick search: '+!!quick);
console.log('HOME mixed total: '+(hd.querySelector('#mixedTotal')?.textContent||'absent'));
if(quick){
 assert.ok(pancake.textContent.includes('价格评价分歧')&&pancake.textContent.includes('口味评价不一'));
 quick.elements.zone.value='A 区';quick.dispatchEvent(new home.Event('change',{bubbles:true}));
 assert.ok([...hd.querySelectorAll('.pick-kicker')].every(n=>n.textContent.includes('A 区')));
 quick.elements.budget.value='15';quick.dispatchEvent(new home.Event('change',{bubbles:true}));
 const ids=[...hd.querySelectorAll('.pick a')].map(a=>new URL(a.href).searchParams.get('item'));
 for(const id of ids){const r=home.CQU_DATA.records.find(x=>x.id===id);assert.equal(r.zone,'A 区');assert.ok(r.price&&r.price[1]<=15&&!r.historicalClosure);}
 console.log('HOME constrained picks: PASS ('+ids.length+' candidates shown)');
 const empty=load('guide.html','?q=zzzznonexistent');assert.equal(empty.document.querySelectorAll('.card').length,0);assert.ok(empty.document.querySelector('#surprise').disabled);
 const budget=load('guide.html','?zone=A%20%E5%8C%BA&budget=15');assert.ok(budget.document.querySelector('#result-count').textContent.includes('隐藏未知价格')||!budget.document.querySelectorAll('.card').length);
 const fb=load('feedback.html','?item=3a891c2aac2ea'),form=fb.document.querySelector('form');
 assert.equal(form.elements.namedItem("item").value,'3a891c2aac2ea');assert.equal(form.checkValidity(),false);
 form.elements.observed.value='2026-11-14';form.elements.detail.value='店铺位置需要核实，这是测试草稿。';assert.ok(form.checkValidity());
 let opened='';fb.open=url=>{opened=url};fb.document.querySelector('#issue-draft').click();
 assert.ok(opened.startsWith('https://github.com/wcnz-coder/cqu-food-guide/issues/new?'));assert.ok(new URL(opened).searchParams.get('body').includes('3a891c2aac2ea'));
 let blob=false;fb.URL.createObjectURL=()=>{blob=true;return 'blob:test'};fb.URL.revokeObjectURL=()=>{};fb.HTMLAnchorElement.prototype.click=function(){};
 form.dispatchEvent(new fb.Event('submit',{bubbles:true,cancelable:true}));assert.ok(blob);assert.ok(fb.document.querySelector('[role=status]').textContent.includes('已生成反馈文件'));
 console.log('FILTER empty state, feedback validation, GitHub draft, JSON export: PASS');
 fb.close();budget.close();empty.close();
}
w.close();home.close();
