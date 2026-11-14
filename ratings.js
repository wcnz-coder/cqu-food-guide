(function (root) {
  'use strict';
  function aggregateRatings(records) {
    const chosen=new Map();
    for (const r of records || []) {
      if (!r.group || !Number.isFinite(r.score) || !Number.isFinite(r.max) || r.max<=0 || r.score<0 || r.score>r.max) continue;
      const w=r.count>0 ? Math.min(10,Math.sqrt(r.count)) : 1;
      const normalized=5*r.score/r.max;
      if (!chosen.has(r.group) || w>chosen.get(r.group).weight)
        chosen.set(r.group,{...r,weight:w,normalized});
    }
    const rows=[...chosen.values()];
    if (!rows.length) return null;
    return {rows,score:rows.reduce((s,r)=>s+r.normalized*r.weight,0)/rows.reduce((s,r)=>s+r.weight,0)};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=aggregateRatings;
  else root.aggregateRatings=aggregateRatings;
})(globalThis);
