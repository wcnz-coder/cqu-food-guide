const assert=require('node:assert/strict');
require('./data.js');
const {records,books,stats}=globalThis.CQU_DATA;
assert.equal(records.length,291);
assert.equal(new Set(records.map(r=>r.id)).size,291);
assert.deepEqual(['red','black','mixed','unknown'].map(t=>records.filter(r=>r.tier===t).length),[154,79,47,11]);
const refs=records.flatMap(r=>r.sources);
assert.equal(refs.length,stats.association+stats['campus-a']);
assert.equal(new Set(refs.map(s=>[s.book,s.sheet,s.cell].join(':'))).size,refs.length);
assert.equal(records.filter(r=>!r.sources.length).length,4);
for(const r of records){
  assert.ok(r.name&&r.zone&&r.category);
  assert.ok(r.sources.length||r.external.length);
  for(const s of r.sources){assert.ok(books[s.book]);assert.match(s.cell,/^[A-Z]+[0-9]+$/);}
  for(const s of r.external){assert.ok(s.fact);assert.equal(new URL(s.url).protocol,'https:');}
  if(r.price)assert.ok(r.price.every(Number.isFinite)&&r.price[0]>=0&&r.price[0]<=r.price[1]);
  if(!r.sources.length)assert.equal(r.tier,'unknown');
}
console.log('PASS: 291 unique records; 293 unique source references; 4 supplemental entries; every item traceable.');
