(() => {
  'use strict';
  const {records,books,context} = globalThis.CQU_DATA;
  const $=s=>document.querySelector(s);
  const h=(tag,attr={},children=[])=>{
    const e=document.createElement(tag);
    for(const [k,v] of Object.entries(attr)) if(v!==undefined&&v!==null)e.setAttribute(k,String(v));
    e.append(...(Array.isArray(children)?children:[children]));
    return e;
  };
  const tierNames={all:'全部',red:'红榜',black:'黑榜',mixed:'争议',unknown:'未分榜'};
  const zones=['虎溪','A 区','B 区','C 区','老校区周边'];
  const zoneLabels=['科学城 · 虎溪','沙坪坝 · A 校区','沙坪坝 · B 校区','沙坪坝 · C 校区','沙坪坝 · 老校区'];
  const isDelivery=document.body.dataset.page==='delivery';
  const sources=new Set();
  for(const r of records)for(const s of [...r.external,...r.ratings])sources.add(s.platform);
  for(const s of context)if(!s.platform.startsWith('饿了么'))sources.add(s.platform);
  $('#source-names')?.append(...[...sources].map(name=>h('li',{},name)));
  const coverage=zones.map(z=>records.filter(r=>r.zone===z).length);
  const areaKey='cqu-last-campus';
  if($('#total')){
    $('#total').textContent=records.length;
    $('#redTotal').textContent=records.filter(r=>r.tier==='red').length;
    $('#blackTotal').textContent=records.filter(r=>r.tier==='black').length;
    const areaGrid=$('#area-grid');
    const areaLinks=zones.map((z,i)=>h('a',{class:'area',href:'guide.html?zone='+encodeURIComponent(z)},
      [h('span',{},zoneLabels[i]),h('strong',{},String(coverage[i]))]));
    areaGrid.append(...areaLinks);
    const markLastArea=()=>{
      let lastArea;
      try{lastArea=sessionStorage.getItem(areaKey);}catch{}
      areaLinks.forEach((link,i)=>{
        if(zones[i]===lastArea)link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      });
    };
    markLastArea();
    window.addEventListener('pageshow',event=>{if(event.persisted)markLastArea();});
  }
  const pickGrid=$('#pick-grid');
  if(pickGrid) {
    const candidates=records.filter(r=>r.tier==='red'&&!r.historicalClosure&&(r.features||r.signals[0]));
    let previous=new Set();
    const pick=()=>{
      const fresh=candidates.filter(r=>!previous.has(r.id));
      const pool=fresh.length>=3?fresh:candidates.slice();
      const chosen=[];
      while(chosen.length<3&&pool.length) {
        const i=Math.floor(Math.random()*pool.length);
        chosen.push(pool.splice(i,1)[0]);
      }
      previous=new Set(chosen.map(r=>r.id));
      pickGrid.replaceChildren(...chosen.map(r=>h('article',{class:'pick'},[
        h('strong',{},r.name),h('p',{},r.features||r.signals[0]),
        h('a',{href:'guide.html?item='+encodeURIComponent(r.id),'aria-label':'看详情：'+r.name},'看详情 →')
      ])));
    };
    $('#repick').onclick=pick;
    pick();
  }
  const form=$('#filters');
  if(!form) return;
  const fields=form.elements, dlg=$('#detail'), grid=$('#results');
  const paramFields=['q','zone','category','budget','evidence','party'];
  const limit=18, params=new URLSearchParams(location.search);
  if(!isDelivery&&zones.includes(params.get('zone'))) {
    try{sessionStorage.setItem(areaKey,params.get('zone'));}catch{}
  }
  const norm=s=>String(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
  const tokens=s=>s.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,12);
  function oneEdit(a,b) {
    if(Math.abs(a.length-b.length)>1)return false;
    if(a.length===b.length){
      let i=0;while(i<a.length&&a[i]===b[i])i++;
      return i===a.length||a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
    }
    const [s,l]=a.length<b.length?[a,b]:[b,a];let i=0;while(i<s.length&&s[i]===l[i])i++;return s.slice(i)===l.slice(i+1);
  }
  function match(q,field){
    if(field===q)return 10;
    if(field.startsWith(q))return 8;
    if(field.includes(q))return 6;
    if(q.length<2||q.length>24)return 0;
    for(let i=field.indexOf(q[0]);i>=0;i=field.indexOf(q[0],i+1)){
      let j=i;for(let n=1;n<q.length&&j>=0;n++)j=field.indexOf(q[n],j+1);
      if(j>=0&&j-i+1-q.length<=3)return 3;
    }
    if(q.length<3)return 0;
    for(let i=0;i<=field.length-q.length+1;i++)for(let n=q.length-1;n<=q.length+1&&i+n<=field.length;n++){
      const f=field.slice(i,i+n);
      if((q[0]===f[0]||q[q.length-1]===f[f.length-1])&&oneEdit(q,f))return 2;
    }
    return 0;
  }
  const scope=records.filter(r=>!isDelivery||r.delivery);
  const idx=scope.map(r=>({r,title:[r.name,r.dish].filter(Boolean).map(norm),meta:[r.zone,r.venue,r.floor,r.location,r.category,r.features,...r.signals].map(norm)}));
  const byId=new Map(scope.map(r=>[r.id,r]));
  let selected=Object.keys(tierNames).includes(params.get('tier'))?params.get('tier'):'all', page=Math.max(1,Number.parseInt(params.get('page'),10)||1), visible=[], lastDraw=null;
  for(const z of zones)fields.zone.append(h('option',{value:z},z));
  for(const c of [...new Set(records.map(r=>r.category))])fields.category.append(h('option',{value:c},c));
  for(const name of paramFields) {
    if(params.has(name)) fields[name].value=params.get(name).slice(0,100);
    if(fields[name].tagName==='SELECT'&&fields[name].selectedIndex<0)fields[name].selectedIndex=0;
  }
  fields.q.maxLength=100;
  const family=r=>{
    if(r.historicalClosure) return [];
    const words=[r.name,r.dish,r.features].join(' ');
    const shared=/火锅|烤鱼|烧烤|烤肉|串串|江湖菜|川菜馆|炒菜馆|拼盘|分食/.test(words);
    const solo=/粉面抄手|早餐小吃|饮品甜点/.test(r.category)||/盖饭|拌饭|自选|猪脚饭|烤鸭饭|盒饭|套饭|汉堡/.test(words);
    const two=shared||/咖啡|甜品|烤肉|西餐|融合菜|居酒屋|日料/.test(words);
    const many=shared&&!r.delivery&&!r.venue.includes('食堂');
    return [solo?'one':'',two?'two':'',shared?'few':'',many?'many':''].filter(Boolean);
  };
  const traitLabels=r=>[...(r.historicalClosure?['原表提到停业 · 待核实']:[]),...r.signals];
  const money=r=>r.price ? '¥'+r.price[0]+(r.price[0]===r.price[1]?'':'–'+r.price[1]) : '';
  const pill=r=>h('span',{class:'pill '+r.tier},tierNames[r.tier]);
  const rate=r=>globalThis.aggregateRatings(r.ratings);
  const rated=x=>x.score.toFixed(2)+' / 5'+(x.rows.length>1?' · 加权':' · 单源');
  const freshness=r=>r.sources.length?'测评：原表未注明 · 采集 '+r.capturedAt:'测评：无学生记录 · 核对 '+r.capturedAt;
  const details=r=>{
    const score=rate(r);
    const block=[pill(r),h('h2',{id:'detail-title'},r.name),
      h('p',{},[r.zone,r.venue,r.floor,r.location].filter(Boolean).join(' · ')),
      h('p',{},[r.dish,r.category,money(r)].filter(Boolean).join(' · ')),h('p',{},freshness(r))];
    if(r.features)block.push(h('h3',{},'门店特点'),h('p',{},r.features));
    if(r.features||score) {
      const rating=[h('h3',{},'网络评分'),h('p',{},score?h('strong',{},rated(score)):'未查到可核实的同店公开评分')];
      if(score)rating.push(h('ul',{},score.rows.map(s=>h('li',{},s.platform+': '+s.score+' / '+s.max+' · '+(s.count==null?'评论数未知':s.count+' 条')+' · 核对 '+s.checked+' · 样例测评 '+(s.reviewDate||'网页未显示日期')))));
      block.push(h('div',{class:'platform-card'},rating));
    }
    if(traitLabels(r).length)block.push(h('div',{class:'traits'},traitLabels(r).map(t=>h('span',{},t))));
    if(r.sources.length)block.push(h('h3',{},'学生原表'),h('ul',{},r.sources.map(s=>h('li',{},books[s.book].name+' · '+s.sheet+' · '+s.cell+' · 原标记：'+tierNames[s.mark]))));
    if(r.external.length)block.push(h('h3',{},'外部参考'),h('ul',{},r.external.map(s=>h('li',{},s.platform+' — '+s.fact))));
    block.push(h('p',{},'价格和反馈为资料快照。具体菜单、营业和配送情况以门店当日为准。'));
    $('#detail-body').replaceChildren(...block);
    if(!dlg.open)dlg.showModal();
  };
  dlg.querySelector('.close').onclick=()=>dlg.close();
  dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
  const card=r=>{
    const btn=h('button',{type:'button','aria-label':'详情：'+r.name},'详情');
    const meta=[r.zone,...(r.venue||'').split(' / '),r.floor].filter(Boolean).join(' · ');
    const traits=traitLabels(r);
    const summary=traits.slice(0,3).map(t=>h('span',{},t));
    if(traits.length>3)summary.push(h('span',{'aria-label':'另有 '+(traits.length-3)+' 个特点'},'+'+(traits.length-3)));
    btn.onclick=()=>details(r);
    return h('article',{class:'card'},[h('div',{class:'card-meta'},[pill(r),meta]),
      h('h3',{},r.name),h('p',{class:'dish'},[r.dish,r.category,money(r)].filter(Boolean).join(' · ')),
      ...(summary.length?[h('div',{class:'traits'},summary)]:[]),
      h('div',{class:'card-foot'},[h('span',{},r.sources.length?'原表':'平台'),btn])]);
  };
  function saveURL(){
    const u=new URL(location.href);
    for(const name of paramFields) {
      if(fields[name].value.trim())u.searchParams.set(name,fields[name].value.trim());else u.searchParams.delete(name);
    }
    if(selected==='all')u.searchParams.delete('tier');else u.searchParams.set('tier',selected);
    if(page===1)u.searchParams.delete('page');else u.searchParams.set('page',page);
    if(u.href!==location.href)history.replaceState(null,'',u);
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let refreshMotion;
  function render(){
    const q=tokens(fields.q.value);
    const pool=idx.filter(({r})=>(!fields.zone.value||fields.zone.value===r.zone)&&(!fields.category.value||fields.category.value===r.category)&&(!fields.budget.value||(r.price&&r.price[1]<=Number(fields.budget.value)))&&(!fields.party.value||family(r).includes(fields.party.value))&&(!fields.evidence.value||(fields.evidence.value==='cross'?!!r.features:r.sources.some(s=>s.book===fields.evidence.value))))
      .map(({r,title,meta})=>{
        const scores=q.map(t=>Math.max(0,...title.map(s=>match(t,s)*3),...meta.map(s=>s.includes(t)?12:0)));
        return {r,score:scores.every(Boolean)?scores.reduce((a,b)=>a+b,0):-1};
      }).filter(x=>x.score>=0);
    const counts=Object.fromEntries(Object.keys(tierNames).map(t=>[t,0]));counts.all=pool.length;for(const {r} of pool)counts[r.tier]++;
    const tierBox=$('#tiers'), active=document.activeElement?.dataset?.tier;
    tierBox.replaceChildren(...Object.entries(tierNames).map(([id,name])=>{
      const b=h('button',{type:'button','aria-pressed':selected===id,'data-tier':id},[name,h('small',{},String(counts[id]))]);
      b.onclick=()=>{selected=id;page=1;render();};return b;
    }));
    if(active)tierBox.querySelector('[data-tier="'+active+'"]')?.focus({preventScroll:true});
    visible=pool.filter(x=>selected==='all'||x.r.tier===selected).sort((a,b)=>b.score-a.score|| Number(Boolean(b.r.external.length))-Number(Boolean(a.r.external.length))).map(x=>x.r);
    const pages=Math.max(1,Math.ceil(visible.length/limit));page=Math.min(page,pages);
    const begin=(page-1)*limit;
    const showing=visible.slice(begin,begin+limit);
    $('#result-count').textContent=visible.length?'找到 '+visible.length+' 条 · 显示 '+(begin+1)+'–'+(begin+showing.length)+(fields.budget.value?'（隐藏未知价格）':''):'暂无匹配结果';
    grid.replaceChildren(...(showing.length?showing.map(card):[h('p',{class:'empty'},'这组条件没有匹配。可尝试更短的菜名，或放宽校区、预算和榜单类型。')]));
    const paginator=$('#pagination');
    const buttons=new Set([1,pages,page-2,page-1,page,page+1,page+2].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b));
    let previous=0;const nav=[];
    if(pages>1)for(const n of buttons){
      if(n-previous>1)nav.push(h('span',{'aria-hidden':'true'},'…'));
      const p=h('button',{class:'pager',type:'button','aria-current':page===n?'page':null,'aria-label':'第 '+n+' 页'},String(n));
      p.onclick=()=>{page=n;render();$('#result-count').scrollIntoView({block:'center'});$('#pagination [aria-current=page]')?.focus({preventScroll:true});};nav.push(p);previous=n;
    }
    paginator.replaceChildren(...nav);
    $('#surprise').disabled=!visible.some(r=>r.tier==='red'&&!r.historicalClosure);
    $('#reset').hidden=!(paramFields.some(name=>fields[name].value)||selected!=='all');
    refreshMotion?.cancel();
    if(!reducedMotion.matches&&grid.animate&&grid.dataset.ready) {
      refreshMotion=grid.animate([{opacity:.35},{opacity:1}],{duration:180,easing:'ease-out'});
    }
    grid.dataset.ready='true';
    saveURL();
  }
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',()=>{page=1;render();});
  $('#reset').onclick=()=>{form.reset();selected='all';page=1;render();fields.q.focus({preventScroll:true});};
  $('#surprise').onclick=()=>{
    let eligible=visible.filter(r=>r.tier==='red'&&!r.historicalClosure);
    if(eligible.length>1)eligible=eligible.filter(r=>r.id!==lastDraw);
    if(eligible.length){const choice=eligible[Math.floor(Math.random()*eligible.length)];lastDraw=choice.id;details(choice);}
  };
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!dlg.open&&!e.target.matches('input,select,textarea,[contenteditable=true]')){e.preventDefault();fields.q.focus();}});
  render();
  if(params.has('item')&&byId.has(params.get('item')))details(byId.get(params.get('item')));
})();
