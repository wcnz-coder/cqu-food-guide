(() => {
  'use strict';
  const form=document.querySelector('#feedback-form'),status=document.querySelector('#feedback-status');
  const records=globalThis.CQU_DATA.records;
  form.elements.detail.addEventListener('input',()=>form.elements.detail.setCustomValidity(''));
  for(const r of records){const o=document.createElement('option');o.value=r.id;o.textContent=r.zone+' · '+r.name;form.elements.namedItem("item").append(o);}
  const selected=new URLSearchParams(location.search).get('item');
  if(records.some(r=>r.id===selected))form.elements.namedItem("item").value=selected;
  const today=new Date();form.elements.observed.max=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  function draft(){
    form.elements.detail.setCustomValidity(form.elements.detail.value.trim().length<5?'请至少填写 5 个非空白字符。':'');
    if(!form.reportValidity())return null;
    const e=form.elements,r=records.find(r=>r.id===e.namedItem("item").value);
    return {schemaVersion:1,status:'pending-verification',itemId:r.id,name:r.name,zone:r.zone,kind:e.kind.value,observedAt:e.observed.value,detail:e.detail.value.trim(),evidence:e.evidence.value.trim()};
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();const data=draft();if(!data)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='cqu-feedback-'+data.itemId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='已生成反馈文件，可转交维护者。';
  });
  document.querySelector('#issue-draft').onclick=()=>{
    const data=draft();if(!data)return;
    const body='条目 ID：'+data.itemId+'\n校区：'+data.zone+'\n观察日期：'+data.observedAt+'\n类型：'+data.kind+'\n\n'+data.detail+'\n\n参考：'+(data.evidence||'未提供')+'\n\n状态：待处理';
    const url=new URL('https://github.com/wcnz-coder/cqu-food-guide/issues/new');url.searchParams.set('title','[信息纠错] '+data.name);url.searchParams.set('body',body);
    if(url.href.length>7500){status.textContent='反馈较长，请生成完整反馈文件，再在 GitHub Issue 中附上，避免链接截断。';return;}
    window.open(url.href,'_blank','noopener,noreferrer');status.textContent='请在 GitHub 草稿中确认并提交。';
  };
})();
