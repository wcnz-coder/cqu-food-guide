const assert=require('node:assert/strict');
require('./data.js');
require('./reviews.js');
const {records,books,stats}=globalThis.CQU_DATA;
const aggregate=require('./ratings.js');
assert.equal(records.length,291);
assert.equal(new Set(records.map(r=>r.id)).size,291);
assert.deepEqual(['red','black','mixed','unknown'].map(t=>records.filter(r=>r.tier===t).length),[154,79,47,11]);
const refs=records.flatMap(r=>r.sources);
const reviewKey=s=>[s.book,s.sheet,s.cell].join('|');
const reviews=globalThis.CQU_REVIEWS;
assert.deepEqual(Object.keys(reviews).sort(),refs.map(reviewKey).sort());
assert.ok(records.filter(r=>r.sources.some(s=>reviews[reviewKey(s)].length)).length>275);
assert.deepEqual(reviews['association|虎溪榜|A17'].map(r=>r[0]),['C17','D17','E17','F17','G17']);
for(const s of refs){
  const entries=reviews[reviewKey(s)];
  assert.equal(new Set(entries.map(e=>e[0])).size,entries.length);
  for(const [cell,quote] of entries){
    assert.equal(Number(cell.match(/^[A-Z]+([0-9]+)$/)?.[1]),s.row);
    assert.ok(quote.trim());
    assert.doesNotMatch(quote,/^\s*=|https?:\/\//i);
  }
}
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
  assert.match(r.capturedAt,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(r.reviewDate,null);
}
assert.equal(records.filter(r=>r.delivery).length,9);
assert.equal(records.filter(r=>r.features).length,9);
assert.equal(records.filter(r=>aggregate(r.ratings)).length,7);
const bbq=aggregate(records.find(r=>r.name==='阿亲家').ratings);
assert.equal(bbq.rows.length,2);
assert.equal(bbq.score.toFixed(2),'4.26');
assert.equal(aggregate([{group:'same',score:4,max:5,count:10},{group:'same',score:8,max:10,count:12}]).rows.length,1);
assert.equal(aggregate([]),null);
console.log('PASS: 291 unique records; 293 unique source references; 4 supplemental entries; every item traceable.');
