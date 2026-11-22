/* 观数知微 | 三套固定7+8+9排码与真实记录回测 | v1 */
(function(){
'use strict';
var ROOT='strategy789',KEY='gszw-strategy789-picks-v1';
var SETS=[
 {id:'7',name:'固定7码',digits:['0123489','1246789','0123678','0245679']},
 {id:'8',name:'固定8码',digits:['01256789','01345678','03456789','01345678']},
 {id:'9',name:'固定9码',digits:['123456789','012345789','012345689','012345789']}
];
var P=['05','16','27','38','49'], ALL=10000, STAKE=.1,PRIZE=932;
var get=function(id){return document.getElementById(id)},historyRows=[],metadata=null,info=[],recentRecords=[],nowPools=null,nowBase=null,nowBaseKey='',ready=false,busy=false;
var nfmt=function(n){return Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2})};
var money=function(n){return (n>=0?'+':'-')+'¥'+Math.abs(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})};
var strmoney=function(n){return '¥'+n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})};
function escapeHTML(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pad(n){return String(n).padStart(4,'0')}
function bits(s){var a=0;P.forEach(function(v,j){if(s.indexOf(v[0])!==-1&&s.indexOf(v[1])!==-1)a|=1<<j});return a}
function initNumbers(){
 if(info.length)return;
 for(var i=0;i<ALL;i++){
  var s=pad(i),a=s.split('').map(Number),h=a.reduce(function(x,y){return x+y},0);
  if(h<10||h>30)continue;
  var freq={};a.forEach(function(k){freq[k]=(freq[k]||0)+1});
  var f=Object.values(freq).sort(function(x,y){return y-x}).join(',');
  if(f==='3,1'||f==='4'||f==='2,2')continue;
  if(a[0]>=5&&a[1]<5&&a[2]<5&&a[3]>=5)continue;
  if(a.every(function(k){return k%2===1}))continue;
  if((a[1]===a[0]+1&&a[2]===a[1]+1)||(a[2]===a[1]+1&&a[3]===a[2]+1))continue;
  if((a[1]===a[0]-1&&a[2]===a[1]-1)||(a[2]===a[1]-1&&a[3]===a[2]-1))continue;
  var tier=0;
  SETS.forEach(function(set,j){if(a.every(function(k,p){return set.digits[p].indexOf(String(k))!==-1}))tier|=1<<j});
  if(tier)info[i]={n:i,s:s,d:a,pairMask:bits(s),tierMask:tier};
 }
}
function baseFor(prior){
 var blocked=new Set(prior.slice(-750)),ten=prior.slice(-10).map(function(s){return s.split('')});
 var base=[];
 for(var i=0;i<ALL;i++){
  var e=info[i];if(!e||blocked.has(e.s))continue;
  var clash=ten.some(function(a){var matched=0;for(var j=0;j<4;j++){if(a[j]===e.s[j])matched++}return matched>=3});
  if(!clash)base.push(e);
 }
 return base;
}
function applyPairs(base,pairA,pairB){
 var mask=(1<<P.indexOf(pairA))|(1<<P.indexOf(pairB));
 var out=[[],[],[]];
 base.forEach(function(e){if(e.pairMask&mask)return;for(var j=0;j<3;j++)if(e.tierMask&(1<<j))out[j].push(e.n)});
 return out;
}
function baseCurrent(){
 var key=historyRows.length+'|'+historyRows.slice(-10).join(',');
 if(key!==nowBaseKey){nowBase=baseFor(historyRows);nowBaseKey=key;}
 return nowBase;
}
function currentIssue(){
 var last=metadata&&metadata.draws&&metadata.draws.length?metadata.draws[metadata.draws.length-1]:null;
 if(last&&last.front4===historyRows[historyRows.length-1]&&/^\d{7}$/.test(last.issue||'')){
  var year=last.issue.slice(0,4),seq=Number(last.issue.slice(4));
  if(seq>=1&&seq<365)return year+String(seq+1).padStart(3,'0');
 }
 return '历史第'+(historyRows.length+1)+'条（期号待核实）';
}
function recordKey(){return String(historyRows.length)}
function setStatus(msg,type){
 var e=get('s789Status');if(!e)return;
 e.textContent=msg;e.className='s789-status'+(type?' '+type:'');
}
function saved(){
 try{var a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(function(x){return x&&Number.isInteger(x.asOfIndex)&&x.asOfIndex>=0&&x.asOfIndex<=1000000&&Array.isArray(x.counts)&&x.counts.length===3&&Array.isArray(x.poolBits)&&x.poolBits.length===3&&P.indexOf(x.pairA)!==-1&&P.indexOf(x.pairB)!==-1&&x.pairA!==x.pairB}):[]}catch(_){return []}
}
function store(array){localStorage.setItem(KEY,JSON.stringify(array))}
function codeBits(arr){
 var b=new Uint8Array(1250);arr.forEach(function(n){b[n>>3]|=1<<(n&7)});
 var raw='';for(var i=0;i<b.length;i++)raw+=String.fromCharCode(b[i]);
 return btoa(raw);
}
function hasCode(encoded,n){try{var raw=atob(encoded);return !!(raw.charCodeAt(n>>3)&(1<<(n&7)))}catch(_){return false}}
function recordForIndex(index){return recentRecords.find(function(r){return r.asOfIndex===index})}
function issueOrIndex(index){var r=recordForIndex(index);return r&&r.issue?r.issue:'历史第'+(index+1)+'条'}
function actualHits(record,code){var n=Number(code);return record.poolBits.map(function(b){return hasCode(b,n)?1:0})}
function verifyRecord(record){
 if(record.asOfIndex>=historyRows.length)return null;
 var act=historyRows[record.asOfIndex];
 var a=actualHits(record,act),hits=a.reduce(function(x,y){return x+y},0);
 return {actual:act,tiers:a,hits:hits,cost:record.counts.reduce(function(x,y){return x+y},0)*STAKE,prize:hits*PRIZE};
}
function updateInputs(){
 var locked=recordForIndex(historyRows.length);
 var el1=get('s789PairA'),el2=get('s789PairB');
 if(locked){el1.value=locked.pairA;el2.value=locked.pairB;el1.disabled=true;el2.disabled=true;}
 else{el1.disabled=false;el2.disabled=false;el1.value='';el2.value='';}
 get('s789Issue').textContent=currentIssue();
 get('s789HistoryInfo').textContent='排最近750期 · 当前已载入'+nfmt(historyRows.length)+'期开奖 · 最新前四位'+(historyRows[historyRows.length-1]||'----');
 get('s789Save').disabled=!!locked;
 if(locked){setStatus('本期对数已在这台设备保存并锁定：'+locked.pairA+'＋'+locked.pairB+'。开奖后将按保存的号码快照核对。','ok');preview()}
 else {setStatus('请选择两组不同对数，计算号码池后再保存本期。未保存的预览不会进入真实记录回测。');resetMetrics()}
}
function metric(id,text){var e=get(id);if(e)e.textContent=text}
function resetMetrics(){
 nowPools=null;
 for(var j=0;j<3;j++)metric('s789Count'+j,'—');
 metric('s789Total','—');metric('s789Unique','—');metric('s789Cost','—');
 get('s789Download').disabled=true;get('s789Copy').disabled=true;
}
function validPairs(){
 var a=get('s789PairA').value,b=get('s789PairB').value;
 if(P.indexOf(a)<0||P.indexOf(b)<0||a===b)throw Error('请选择两组不同的对数。');
 return [a,b];
}
function preview(){
 try{
  if(!historyRows.length)throw Error('历史数据尚未加载。');
  var pair=validPairs();nowPools=applyPairs(baseCurrent(),pair[0],pair[1]);
  var total=0,union=new Set();
  nowPools.forEach(function(p,j){metric('s789Count'+j,nfmt(p.length));total+=p.length;p.forEach(function(x){union.add(x)})});
  metric('s789Total',nfmt(total)+' 注');metric('s789Unique',nfmt(union.size)+' 组');metric('s789Cost',strmoney(total*STAKE));
  get('s789Download').disabled=false;get('s789Copy').disabled=false;
  var r=recordForIndex(historyRows.length);
  setStatus((r?'已保存并锁定本期方案。':'预览已完成，尚未保存。')+' 对数 '+pair.join('＋')+'；三套不去重 '+nfmt(total)+' 注。',r?'ok':'');
 }catch(e){resetMetrics();setStatus(e.message,'error')}
}
function savePick(){
 try{
  var p=validPairs();
  if(recordForIndex(historyRows.length))throw Error('本期已保存，不能覆盖原始记录。');
  if(!nowPools)preview();
  if(!nowPools)throw Error('请先计算号码池。');
  var r={version:1,asOfIndex:historyRows.length,issue:currentIssue(),baseLast:historyRows[historyRows.length-1],pairA:p[0],pairB:p[1],counts:nowPools.map(function(x){return x.length}),poolBits:nowPools.map(codeBits),createdAt:new Date().toISOString(),origin:'local',rule:'fixed789-750-v1',stake:STAKE,prize:PRIZE};
  var all=saved();all.push(r);store(all);recentRecords=all;
  updateInputs();renderRecords();
  setStatus('已保存本期 '+r.issue+'，对数 '+p.join('＋')+'；每套号码快照已记录在本机。','ok');
 }catch(e){setStatus('保存失败：'+e.message,'error')}
}
function buildTicketText(){
 if(!nowPools)throw Error('请先计算号码池。');
 var pair=validPairs(),lines=['观数知微 · 固定7＋8＋9 三套不去重号码','待开奖：'+currentIssue(),'开奖前历史尾号：'+historyRows[historyRows.length-1],'规则：排最近750期、和值10—30、大小小大、三重四重双对子、单单单单、三顺子三倒顺、最近10期三位同位','本期对数：排'+pair.join('、'),'不去重总注数：'+nowPools.reduce(function(n,a){return n+a.length},0),'每注0.1元、中奖每注按932元模拟',''];
 nowPools.forEach(function(pool,j){lines.push('====== '+SETS[j].name+' '+pool.length+'注 ======');pool.forEach(function(n){lines.push(pad(n))});lines.push('')});
 return lines.join('\n');
}
function makeDownload(name,contents,type){
 var blob=new Blob([contents],{type:type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);
}
function copyText(txt){return navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(txt):new Promise(function(resolve,reject){var t=document.createElement('textarea');t.value=txt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{if(!document.execCommand('copy'))throw Error('不可复制');t.remove();resolve()}catch(e){t.remove();reject(e)}})}
function renderRecords(){
 recentRecords=saved();
 var el=get('s789RecordRows');if(!el)return;
 if(!recentRecords.length){el.innerHTML='<div class="s789-note">尚无记录。输入并保存本期两组对数后，开奖更新时才会自动核对；历史缺失期不补造记录。</div>';return}
 el.innerHTML=recentRecords.slice().sort(function(a,b){return b.asOfIndex-a.asOfIndex}).slice(0,18).map(function(r){
  var v=verifyRecord(r),valid=r.origin==='local',state=v?(v.hits?'命中'+v.hits+'套':'未中'):'待开奖',cls=v?(v.hits?'s789-pos':'s789-neg'):'';
  return '<div class="s789-record"><div><strong>'+escapeHTML(r.issue||'历史第'+(r.asOfIndex+1)+'条')+' · '+escapeHTML(r.pairA)+'＋'+escapeHTML(r.pairB)+'</strong><small>'+(v?'开奖 '+escapeHTML(v.actual)+' · '+r.counts.join('/')+'注':'待开奖 · '+r.counts.join('/')+'注')+' · '+(valid?'本机保存':'外部导入')+'</small></div><div class="s789-record-right '+cls+'">'+state+(v?'<small>'+money(v.prize-v.cost)+'</small>':'')+'</div></div>';
 }).join('');
}
function backtestRecorded(n){
 var start=Math.max(0,historyRows.length-n),rows=saved().filter(function(r){return r.asOfIndex>=start&&r.asOfIndex<historyRows.length&&r.origin==='local'}).sort(function(a,b){return a.asOfIndex-b.asOfIndex});
 var hitPeriods=0,tickets=0,cost=0,prize=0,maxMiss=0,maxHit=0,miss=0,hit=0,lastIndex=-100,distribution=[0,0,0,0],data=[];
 rows.forEach(function(r){
  var v=verifyRecord(r);if(!v)return;
  if(r.asOfIndex!==lastIndex+1){miss=0;hit=0}
  if(v.hits){hit++;miss=0;hitPeriods++}else{miss++;hit=0}
  maxMiss=Math.max(maxMiss,miss);maxHit=Math.max(maxHit,hit);lastIndex=r.asOfIndex;
  distribution[v.hits]++;tickets+=v.hits;cost+=v.cost;prize+=v.prize;
  data.push({index:r.asOfIndex,record:r,verify:v});
 });
 showResults('已保存记录回测 · 最近'+n+'期',[
  ['有效记录',rows.length+' / '+n+'期'],['命中期数',hitPeriods+'期'],['中奖注数',tickets+'注'],['累计投入',strmoney(cost)],['模拟净收益',money(prize-cost)],['最长连错',maxMiss+'期']
 ],'记录范围内最长连续命中 '+maxHit+'期；0/1/2/3套命中分别 '+distribution.join(' / ')+' 期。未存档期不计入连中连错，连续期中间有空档会重置。'+(rows.length<n?' 未记录的'+(n-rows.length)+'期不能冒充真实回测。':''),
 data.slice(-40).reverse().map(function(x){return [escapeHTML(x.record.issue),escapeHTML(x.verify.actual),x.verify.tiers.join('/'),x.verify.hits+'注',money(x.verify.prize-x.verify.cost)]}),['期号','开奖','7/8/9','共中','净收益']);
}
function sumCountsForBase(base,selectedMask){
 var sizes=[0,0,0];
 base.forEach(function(e){if(e.pairMask&selectedMask)return;for(var j=0;j<3;j++){if(e.tierMask&(1<<j))sizes[j]++}});
 return sizes;
}
function comboMasks(){
 var out=[];for(var i=0;i<5;i++)for(var j=i+1;j<5;j++)out.push({a:P[i],b:P[j],mask:(1<<i)|(1<<j)});
 return out;
}
async function backtestSimulation(n){
 var combos=comboMasks(),totalCost=0,expectedHitPeriods=0,expectedHits=0,averageSizes=[0,0,0],rows=[],end=historyRows.length,start=Math.max(0,end-n);
 for(var i=start;i<end;i++){
  var b=baseFor(historyRows.slice(0,i)),code=historyRows[i],e=info[Number(code)];
  var eligible=!!e&&b.some(function(x){return x.n===Number(code)}),c=0,hitN=0,hitPeriod=0,counts=[0,0,0];
  combos.forEach(function(p){
   var sizes=sumCountsForBase(b,p.mask),cost=sizes.reduce(function(a,x){return a+x},0)*STAKE;
   c+=cost;
   for(var k=0;k<3;k++)counts[k]+=sizes[k];
   var wins=eligible&&!(e.pairMask&p.mask)?((e.tierMask&1)?1:0)+((e.tierMask&2)?1:0)+((e.tierMask&4)?1:0):0;
   hitN+=wins;if(wins)hitPeriod++;
  });
  totalCost+=c/10;expectedHits+=hitN/10;expectedHitPeriods+=hitPeriod/10;for(var t=0;t<3;t++)averageSizes[t]+=counts[t]/10;
  if(i>=end-30)rows.push([String(i+1),escapeHTML(code),(hitPeriod/10*100).toFixed(0)+'%',(hitN/10).toFixed(2)+'注',strmoney(c/10)]);
  if((i-start)%5===0){get('s789BackStatus').textContent='正在按10组对数等概率回测：'+(i-start+1)+'/'+(end-start)+'期';await new Promise(function(done){setTimeout(done,0)})}
 }
 var period=end-start;
 showResults('历史模拟 · 最近'+period+'期',[
  ['预期覆盖',expectedHitPeriods.toFixed(1)+'期'],['预期中奖注数',expectedHits.toFixed(1)+'注'],['累计投入期望',strmoney(totalCost)],['中奖奖金期望',strmoney(expectedHits*PRIZE)],['模拟净收益期望',money(expectedHits*PRIZE-totalCost)],['平均每期注数',nfmt(averageSizes.reduce(function(a,b){return a+b},0)/period)]
 ],'7/8/9各套平均注数：'+averageSizes.map(function(c){return nfmt(c/period)}).join(' / ')+'。这里对每期10种对数组合计算等概率数学期望，不会生成实际的整数命中期数，不能据此统计真实连中、连错。',rows.reverse(),['历史序号','开奖','随机覆盖概率','预期中奖','平均成本']);
}
function showResults(title,metrics,foot,rows,headers){
 get('s789BackTitle').textContent=title;
 get('s789BackMetrics').innerHTML=metrics.map(function(x){return '<div class="s789-metric"><small>'+escapeHTML(x[0])+'</small><strong>'+escapeHTML(x[1])+'</strong></div>'}).join('');
 get('s789BackNote').textContent=foot;
 get('s789BackTable').innerHTML='<thead><tr>'+headers.map(function(h){return '<th>'+escapeHTML(h)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(v){return '<td class="s789-tabular">'+v+'</td>'}).join('')+'</tr>'}).join('')+'</tbody>';
}
async function runBacktest(){
 if(busy)return;
 busy=true;get('s789RunBack').disabled=true;
 var n=Number(get('s789BackN').value),mode=get('s789BackMode').value;
 try{
  get('s789BackStatus').textContent='开始回测…';
  if(mode==='recorded'){backtestRecorded(n)}else{await backtestSimulation(n)}
  get('s789BackStatus').textContent='回测完成。';
 }catch(e){get('s789BackStatus').textContent='回测失败：'+e.message}
 finally{busy=false;get('s789RunBack').disabled=false}
}
function exportRecords(){
 var rows=saved(),payload={app:'观数知微',strategy:'7+8+9-750',exportedAt:new Date().toISOString(),records:rows};
 makeDownload('观数知微_7加8加9_历史对数存档.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');
 setStatus('已导出'+rows.length+'条本机记录，可在其他手机导入，但导入记录无法独立证明提交时间。','ok');
}
function importRecords(file){
 var fr=new FileReader();fr.onload=function(){
  try{
   var p=JSON.parse(String(fr.result)),incoming=p.records;
   if(!Array.isArray(incoming))throw Error('不是有效的选号备份。');
   var items=saved(),num=0;
   incoming.forEach(function(r){
    if(!r||!Number.isInteger(r.asOfIndex)||!Array.isArray(r.poolBits)||r.poolBits.length!==3||r.poolBits.some(function(t){return typeof t!=='string'||t.length>6000})||!Array.isArray(r.counts)||r.counts.length!==3||P.indexOf(r.pairA)<0||P.indexOf(r.pairB)<0||r.pairA===r.pairB||items.some(function(t){return t.asOfIndex===r.asOfIndex}))return;
    items.push({version:1,asOfIndex:r.asOfIndex,issue:String(r.issue||'历史第'+(r.asOfIndex+1)+'条'),baseLast:String(r.baseLast||''),pairA:r.pairA,pairB:r.pairB,counts:r.counts,poolBits:r.poolBits,createdAt:r.createdAt,origin:'imported',rule:r.rule||'fixed789-750-v1',stake:STAKE,prize:PRIZE});num++;
   });
   store(items);recentRecords=items;updateInputs();renderRecords();setStatus('成功导入'+num+'条记录。外部导入的历史期次仅用于核对，不列为本机原始记录。','ok');
  }catch(e){setStatus('导入失败：'+e.message,'error')}
 };fr.readAsText(file);
}
function onHistoryChange(hist,meta){
 if(!Array.isArray(hist)||hist.length<20)return;
 var key=hist.length+'|'+hist.slice(-10).join('/');
 if(ready&&key===nowBaseKey.replace(/\|/g,'|')&&meta===metadata)return;
 historyRows=hist.slice();metadata=meta||null;nowBaseKey='';ready=true;recentRecords=saved();
 updateInputs();renderRecords();
}
function init(){
 if(!get(ROOT))return;
 initNumbers();
 get('s789Preview').onclick=preview;
 get('s789Save').onclick=savePick;
 get('s789Download').onclick=function(){try{makeDownload('观数知微_固定789_'+currentIssue()+'_不去重.txt',buildTicketText(),'text/plain;charset=utf-8');setStatus('号码TXT已经生成。','ok')}catch(e){setStatus(e.message,'error')}};
 get('s789Copy').onclick=function(){try{copyText(buildTicketText()).then(function(){setStatus('三套号码已复制到剪贴板。','ok')}).catch(function(){setStatus('复制受浏览器限制，请使用下载TXT。','error')})}catch(e){setStatus(e.message,'error')}};
 get('s789PairA').onchange=function(){if(!recordForIndex(historyRows.length))resetMetrics()};
 get('s789PairB').onchange=function(){if(!recordForIndex(historyRows.length))resetMetrics()};
 get('s789RunBack').onclick=runBacktest;
 get('s789Export').onclick=exportRecords;
 get('s789Import').onclick=function(){get('s789ImportFile').click()};
 get('s789ImportFile').onchange=function(){if(this.files&&this.files[0])importRecords(this.files[0]);this.value=''};
 window.Strategy789={onHistoryChange:onHistoryChange};
 try{if(typeof history!=='undefined'&&Array.isArray(history))onHistoryChange(history,typeof autoMeta!=='undefined'?autoMeta:null)}catch(e){setStatus('等待网站历史数据：'+e.message,'error')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();