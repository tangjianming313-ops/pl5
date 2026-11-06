import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ALL,DEFAULT_RULES,EMPTY_RULES,clone,generate,parseHistory,structure,subset,backtest,validateRules} from '../dist/engine.mjs';
const unrestricted=()=>clone(EMPTY_RULES);
const seed=JSON.parse(fs.readFileSync(new URL('../dist/history.json',import.meta.url),'utf8')).draws;

test('10,000 ordered four-digit strings retain leading zeroes',()=>{
  const result=generate(unrestricted(),[]);
  assert.equal(result.candidates.length,10000);assert.equal(result.candidates[0],'0000');assert.equal(result.candidates.at(-1),'9999');
  assert.equal(new Set(result.candidates).size,10000);
});
test('combinatorial counts of all five repetition structures',()=>{
  const counts={distinct:5040,pair:4320,doublePair:270,triple:360,quad:10};
  for(const [name,count] of Object.entries(counts)){
    const r=unrestricted();r.structures=[name];const out=generate(r,[]);assert.equal(out.candidates.length,count,name);assert.ok(out.candidates.every(s=>structure(s)===name));
  }
});
test('four independent position exclusions keep exactly 9^4',()=>{
  const r=unrestricted();r.excluded=[[4],[4],[8],[1]];assert.equal(generate(r,[]).candidates.length,6561);
});
test('inclusive sum boundaries and modulo-3 routes',()=>{
  const r=unrestricted();r.sumEnabled=true;r.sumMin=0;r.sumMax=0;assert.deepEqual(generate(r,[]).candidates,['0000']);
  r.sumMin=36;r.sumMax=36;assert.deepEqual(generate(r,[]).candidates,['9999']);
  r.sumEnabled=false;r.routeEnabled=true;assert.equal(generate(r,[]).candidates.length,10000-(4**4+3**4+3**4));
});
test('history window is sliced BEFORE deduplication',()=>{
  const r=unrestricted();r.historyEnabled=true;r.historyWindow=2;
  const out=generate(r,['1234','5678','5678']);assert.ok(out.candidates.includes('1234'));assert.ok(!out.candidates.includes('5678'));assert.equal(out.candidates.length,9999);assert.equal(out.recentUnique,1);
});
test('position comparisons do not accumulate matches across draws',()=>{
  const r=unrestricted();r.recent2Enabled=true;r.recent2Window=2;r.recent2Threshold=2;
  const out=generate(r,['1567','8290']);assert.ok(out.candidates.includes('1234'));
  const one=generate({...r,recent2Window:1},['1234']);assert.equal(one.candidates.length,10000-523);
  r.recent2Threshold=3;assert.equal(generate({...r,recent2Window:1},['1234']).candidates.length,10000-37);
});
test('hefen uses previous draw and exact modulo formulas',()=>{
  const r=unrestricted();r.hefen1=true;
  const one=generate(r,['4157']);assert.equal(one.candidates.length,9000);assert.ok(!one.candidates.includes('0126'));assert.ok(one.candidates.includes('0125'));
  r.hefen1=false;r.hefen4=true;const four=generate(r,['4157']);assert.equal(four.candidates.length,9000);assert.ok(!four.candidates.includes('0119'));
  assert.equal(generate(r,[]).candidates.length,10000);assert.ok(generate(r,[]).warnings.length);
});
test('frequency filters use all prior history, independent from recent exclusion',()=>{
  const r=unrestricted();r.frequency='once';assert.deepEqual(generate(r,['1234','5678','1234']).candidates,['5678']);
  r.frequency='never';assert.equal(generate(r,['1234','5678','1234']).candidates.length,9998);
  r.frequency='atMostOnce';assert.equal(generate(r,['1234','5678','1234']).candidates.length,9999);
});
test('parity and size exclusion preserve positional order',()=>{
  const r=unrestricted();r.parityExcluded=['单双双单'];const out=generate(r,[]);assert.equal(out.candidates.length,9375);assert.ok(!out.candidates.includes('1001'));assert.ok(out.candidates.includes('1010'));
  r.parityExcluded=[];r.sizeExcluded=['大小小大'];const size=generate(r,[]);assert.equal(size.candidates.length,9375);assert.ok(!size.candidates.includes('5005'));assert.ok(size.candidates.includes('0505'));
});
test('parser supports numbered records, spaced digits, full P5, reverse order and rejects bad rows',()=>{
  assert.deepEqual(parseHistory('1\t0012\n2,41579').draws,['0012','4157']);
  assert.deepEqual(parseHistory('0 1 2 3 4\n2026021 4 1 5 7 9').draws,['0123','4157']);
  assert.deepEqual(parseHistory('0012\n4157',true).draws,['4157','0012']);
  assert.equal(parseHistory('1234\nbad row\n6789').errors[0].line,2);
  assert.deepEqual(parseHistory('序号,号码\n1,1234\n2,1234').draws,['1234','1234']);
});
test('invalid rules fail instead of creating misleading candidates',()=>{
  assert.throws(()=>validateRules({...unrestricted(),sumMin:30,sumMax:9}));
  assert.throws(()=>validateRules({...unrestricted(),historyWindow:0}));
  assert.throws(()=>validateRules({...unrestricted(),recent2Threshold:NaN}));
  assert.throws(()=>generate(unrestricted(),[12]));
});
test('seed is complete and has corrected late history',()=>{
  assert.equal(seed.length,7763);assert.deepEqual(seed.slice(-2),['1544','4157']);assert.ok(seed.includes('0000'));
  assert.deepEqual(seed.slice(7750,7756),['9065','2785','5838','4718','8640','9838']);
});
test('default pool matches an independently written direct filter for all 10,000 numbers',()=>{
  const previous=seed.at(-1),historical=new Set(seed.slice(-1500));
  const expected=[];
  for(let i=0;i<10000;i++){
    const s=String(i).padStart(4,'0'),d=[...s].map(Number);
    if(historical.has(s)||d[0]===4||d[1]===4||d[2]===8||d[3]===1)continue;
    const total=d[0]+d[1]+d[2]+d[3];if(total<9||total>30)continue;
    if(new Set(d).size<3)continue;
    if(d.every(v=>v%3===d[0]%3))continue;
    const match=old=>[0,1,2,3].filter(p=>old[p]===s[p]).length;
    if(seed.slice(-2).some(old=>match(old)>=2)||seed.slice(-10).some(old=>match(old)>=3))continue;
    if((d[1]+d[2]+d[3])%10===(Number(previous[0])+Number(previous[2]))%10)continue;
    if((d[1]+d[2])%10===(Number(previous[2])+Number(previous[3]))%10)continue;
    expected.push(s);
  }
  const actual=generate(clone(DEFAULT_RULES),seed);assert.deepEqual(actual.candidates,expected);
  assert.equal(actual.steps.reduce((a,s)=>a+s.excluded,0)+actual.candidates.length,10000);
  const single=subset(actual.candidates,'pair'),distinct=subset(actual.candidates,'distinct');assert.equal(single.length+distinct.length,actual.candidates.length);
  for(const s of subset(actual.candidates,'shrink')){assert.ok(single.includes(s));assert.ok('23579'.includes(s[0]));const total=[...s].reduce((a,v)=>a+Number(v),0);assert.ok(total>=9&&total<=25);}
  console.log(JSON.stringify({defaultCount:actual.candidates.length,distinct:distinct.length,pair:single.length,shrink:subset(actual.candidates,'shrink').length}));
});
test('walk-forward backtest never includes the draw under test',async()=>{
  const r=unrestricted();r.historyEnabled=true;r.historyWindow=1;
  const out=await backtest(r,['1234','5678','1234','1234','5678'],4);
  assert.deepEqual(out.rows.map(x=>x.hit),[true,true,false,true]);assert.equal(out.hits,3);assert.equal(out.maxMiss,1);assert.ok(out.rows.every(x=>x.count===9999));
});
test('backtest enforces full warmup and supports cancellation',async()=>{
  const r=unrestricted();r.historyEnabled=true;r.historyWindow=3;
  await assert.rejects(()=>backtest(r,['1234','5678'],10),/至少需要/);
  const out=await backtest(r,['1234','5678','9012','1234','5678'],10);assert.equal(out.rows.length,2);assert.equal(out.rows[0].index,4);
  const abort=new AbortController();abort.abort();await assert.rejects(()=>backtest(r,seed,10,()=>{},abort.signal),/取消/);
});
