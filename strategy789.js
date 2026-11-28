/* 观数知微 | 三套固定7+8+9排码与真实记录回测 | 和值8-28 */
(function(){
'use strict';
var ROOT='strategy789',KEY='gszw-strategy789-picks-v1';
var SETS=[
 {id:'7',name:'新方案7码',digits:['0124589','0156789','0134569','0245678']},
 {id:'8',name:'新方案8码',digits:['01245678','01356789','01234569','02345678']},
 {id:'9',name:'新方案9码',digits:['012345689','012456789','012346789','012456789']}
];
var P=['05','16','27','38','49'], ALL=10000, STAKE=.1,PRIZE=932;
var get=function(id){return document.getElementById(id)},historyRows=[],metadata=null,info=[],recentRecords=[],nowPools=null,nowBase=null,nowBaseKey='',lastHistoryKey='',ready=false,busy=false,batchIndex=0;
var nfmt=function(n){return Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2})};
var money=function(n){return (n>=0?'+':'-')+'¥'+Math.abs(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})};
var strmoney=function(n){return '¥'+n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})};
function escapeHTML(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pad(n){return String(n).padStart(4,'0')}
function bits(s){var a=0;P.forEach(function(v,j){if(s.indexOf(v[0])!==-1&&s.indexOf(v[1])!==-1)a|=1<<j});return a}
var PAIR_MODE_KEY='gszw-s789-pair-modes-v1',DEFAULT_PAIR_MODES=['full','full','full'];
var FILTER_KEY='gszw-s789-variable-filters-v1',DEFAULT_FILTERS={sumMin:8,sumMax:28,odd:['1111'],big:['1001']};
function readFilterSettings(){
 var min=Number(get('s789SumMin')&&get('s789SumMin').value),max=Number(get('s789SumMax')&&get('s789SumMax').value);
 if(!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>36||min>max)throw Error('和值范围须为0–36，且最小值不能大于最大值。');
 return {sumMin:min,sumMax:max,odd:Array.from(document.querySelectorAll('#s789OddPatterns input:checked')).map(function(x){return x.value}),big:Array.from(document.querySelectorAll('#s789BigPatterns input:checked')).map(function(x){return x.value})};
}
function currentFilterSettings(){
 try{return readFilterSettings()}catch(_){return DEFAULT_FILTERS}
}
function readPairModes(){
 var modes=[];
 for(var i=0;i<3;i++){
  var el=get('s789PairMode'+i),v=el?el.value:'full';
  modes.push(['full','pair','none'].indexOf(v)>=0?v:'full');
 }
 return modes;
}
function savePairModes(){
 var modes=readPairModes();
 try{localStorage.setItem(PAIR_MODE_KEY,JSON.stringify(modes))}catch(_){}
 nowBaseKey='';
 if(historyRows.length&&get('s789PairA').value&&get('s789PairB').value&&get('s789PairA').value!==get('s789PairB').value)preview();
 else resetMetrics();
 setStatus('三套对子类型已分别保存并应用。','ok');
}
function pairAllowed(e,setIndex,modes){
 var mode=(modes||readPairModes())[setIndex]||'full';
 if(mode==='full')return true;
 if(mode==='pair')return e.pairKind==='pair';
 return e.pairKind==='none';
}
function initPairModes(){
 var modes=DEFAULT_PAIR_MODES.slice();
 try{var savedModes=JSON.parse(localStorage.getItem(PAIR_MODE_KEY)||'null');if(Array.isArray(savedModes)&&savedModes.length===3)modes=savedModes.map(function(v){return ['full','pair','none'].indexOf(v)>=0?v:'full'})}catch(_){}
 for(var i=0;i<3;i++){var el=get('s789PairMode'+i);if(el)el.value=modes[i]}
}
function filterEntry(e,cfg){
 var a=e.d,sum=a.reduce(function(x,y){return x+y},0);
 if(sum<cfg.sumMin||sum>cfg.sumMax)return false;
 var odd=a.map(function(v){return v%2?'1':'0'}).join('');
 var big=a.map(function(v){return v>=5?'1':'0'}).join('');
 return cfg.odd.indexOf(odd)<0&&cfg.big.indexOf(big)<0;
}
function buildPatternControls(){
 var oddRoot=get('s789OddPatterns'),bigRoot=get('s789BigPatterns');
 if(!oddRoot||!bigRoot)return;
 var names=function(pattern,kind){return pattern.split('').map(function(bit){return kind==='odd'?(bit==='1'?'单':'双'):(bit==='1'?'大':'小')}).join(' ')};
 for(var i=0;i<16;i++){
  var pattern=i.toString(2).padStart(4,'0');
  oddRoot.insertAdjacentHTML('beforeend','<label class="s789-pattern-option"><input type="checkbox" value="'+pattern+'" id="s789Odd'+i+'"><span>'+names(pattern,'odd')+'</span></label>');
  bigRoot.insertAdjacentHTML('beforeend','<label class="s789-pattern-option"><input type="checkbox" value="'+pattern+'" id="s789Big'+i+'"><span>'+names(pattern,'big')+'</span></label>');
 }
 var savedCfg=null;try{savedCfg=JSON.parse(localStorage.getItem(FILTER_KEY)||'null')}catch(_){}
 var cfg=savedCfg&&Number.isInteger(savedCfg.sumMin)&&Number.isInteger(savedCfg.sumMax)?savedCfg:DEFAULT_FILTERS;
 get('s789SumMin').value=cfg.sumMin;get('s789SumMax').value=cfg.sumMax;
 for(var j=0;j<16;j++){
  var p=j.toString(2).padStart(4,'0');
  get('s789Odd'+j).checked=(cfg.odd||[]).indexOf(p)>=0;
  get('s789Big'+j).checked=(cfg.big||[]).indexOf(p)>=0;
 }
 updateRuleSummary();
}
function updateRuleSummary(){
 var cfg=currentFilterSettings(),format=function(list,kind){return list.length?list.map(function(p){return p.split('').map(function(b){return kind==='odd'?(b==='1'?'单':'双'):(b==='1'?'大':'小')}).join('')}).join('、'):'无'};
 if(get('s789RuleSum'))get('s789RuleSum').textContent='和值'+cfg.sumMin+'–'+cfg.sumMax;
 if(get('s789RuleOdd'))get('s789RuleOdd').textContent='单双排除：'+format(cfg.odd,'odd');
 if(get('s789RuleBig'))get('s789RuleBig').textContent='大小排除：'+format(cfg.big,'big');
}
function saveFilterSettings(){
 try{
  var cfg=readFilterSettings();localStorage.setItem(FILTER_KEY,JSON.stringify(cfg));nowBaseKey='';
  updateRuleSummary();
  if(historyRows.length&&get('s789PairA').value&&get('s789PairB').value&&get('s789PairA').value!==get('s789PairB').value)preview();
  else resetMetrics();
  setStatus('筛选参数已保存并应用于三套号码。','ok');
 }catch(e){setStatus(e.message,'error')}
}
function resetFilterSettings(){
 get('s789SumMin').value=DEFAULT_FILTERS.sumMin;get('s789SumMax').value=DEFAULT_FILTERS.sumMax;
 document.querySelectorAll('#s789OddPatterns input,#s789BigPatterns input').forEach(function(x){x.checked=false});
 get('s789Odd15').checked=true;get('s789Big9').checked=true;
 saveFilterSettings();
}
function initNumbers(){
 if(info.length)return;
 for(var i=0;i<ALL;i++){
  var s=pad(i),a=s.split('').map(Number),freq={};a.forEach(function(k){freq[k]=(freq[k]||0)+1});
  var f=Object.values(freq).sort(function(x,y){return y-x}).join(',');
  if(f==='3,1'||f==='4'||f==='2,2')continue;
  if((a[1]===a[0]+1&&a[2]===a[1]+1)||(a[2]===a[1]+1&&a[3]===a[2]+1))continue;
  if((a[1]===a[0]-1&&a[2]===a[1]-1)||(a[2]===a[1]-1&&a[3]===a[2]-1))continue;
  var tier=0;
  SETS.forEach(function(set,j){if(a.every(function(k,p){return set.digits[p].indexOf(String(k))!==-1}))tier|=1<<j});
  if(tier)info[i]={n:i,s:s,d:a,pairMask:bits(s),tierMask:tier,pairKind:f==='2,1,1'?'pair':'none'};
 }
}
function baseFor(prior){
 var blocked=new Set(prior.slice(-750)),ten=prior.slice(-10).map(function(s){return s.split('')}),cfg=currentFilterSettings();
 var base=[];
 for(var i=0;i<ALL;i++){
  var e=info[i];if(!e||blocked.has(e.s)||!filterEntry(e,cfg))continue;
  var clash=ten.some(function(a){var matched=0;for(var j=0;j<4;j++){if(a[j]===e.s[j])matched++}return matched>=3});
  if(!clash)base.push(e);
 }
 return base;
}
function applyPairs(base,pairA,pairB){
 var mask=(1<<P.indexOf(pairA))|(1<<P.indexOf(pairB)),modes=readPairModes();
 var out=[[],[],[]];
 base.forEach(function(e){if(e.pairMask&mask)return;for(var j=0;j<3;j++)if((e.tierMask&(1<<j))&&pairAllowed(e,j,modes))out[j].push(e.n)});
 return out;
}
function baseCurrent(){
 var key=historyRows.length+'|'+historyRows.slice(-10).join(',')+'|'+JSON.stringify(currentFilterSettings())+'|'+JSON.stringify(readPairModes());
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
function missReasons(record,code){
 var a=code.split('').map(Number),issues=[],past=historyRows.slice(0,record.asOfIndex),sum=a.reduce(function(x,y){return x+y},0);
 var uncovered=SETS.filter(function(set){return !a.every(function(v,i){return set.digits[i].indexOf(String(v))>=0})}).map(function(set){return set.id+'码位置缺码'});
 if(uncovered.length===3)issues.push('三套位置均未覆盖');
 else if(uncovered.length)issues.push(uncovered.join('、'));
 if(new Set(past.slice(-750)).has(code))issues.push('最近750期历史重复');
 var cfg=record.filters||currentFilterSettings();if(sum<cfg.sumMin||sum>cfg.sumMax)issues.push('和值'+sum+'超出'+cfg.sumMin+'–'+cfg.sumMax);
 var odd=a.map(function(v){return v%2?'1':'0'}).join(''),big=a.map(function(v){return v>=5?'1':'0'}).join('');
 if((cfg.odd||[]).indexOf(odd)>=0)issues.push('单双组合'+odd+'被排除');
 if((cfg.big||[]).indexOf(big)>=0)issues.push('大小组合'+big+'被排除');
 var f={};a.forEach(function(v){f[v]=(f[v]||0)+1});
 var pat=Object.values(f).sort(function(x,y){return y-x}).join(',');
 if(pat==='3,1')issues.push('三重');if(pat==='4')issues.push('四重');if(pat==='2,2')issues.push('双对子');
 if(a[0]>=5&&a[1]<5&&a[2]<5&&a[3]>=5)issues.push('大小小大');
 if(a.every(function(v){return v%2===1}))issues.push('单单单单');
 if((a[1]===a[0]+1&&a[2]===a[1]+1)||(a[2]===a[1]+1&&a[3]===a[2]+1))issues.push('三顺子');
 if((a[1]===a[0]-1&&a[2]===a[1]-1)||(a[2]===a[1]-1&&a[3]===a[2]-1))issues.push('三倒顺');
 if(past.slice(-10).some(function(t){var n=0;for(var i=0;i<4;i++)if(t[i]===code[i])n++;return n>=3}))issues.push('最近10期三位同位');
 [record.pairA,record.pairB].forEach(function(pair){if(code.indexOf(pair[0])>=0&&code.indexOf(pair[1])>=0)issues.push('排除对数'+pair)});
 return issues.length?issues.join('；'):'未覆盖（请核对快照）';
}
function verifyRecord(record){
 if(record.asOfIndex>=historyRows.length||historyRows[record.asOfIndex-1]!==record.baseLast)return null;
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
 get('s789Download').disabled=true;get('s789Copy').disabled=true;for(var k=0;k<3;k++){var exportBtn=get('s789Download'+k);if(exportBtn)exportBtn.disabled=true;}updateBudget();refreshBatches();
}
function updateBudget(){
 var el=get('s789Budget'),v=el?Number(el.value):0,exposure=get('s789BudgetShare'),note=get('s789BudgetNote');if(!exposure||!note)return;
 if(!nowPools){exposure.textContent='待计算';note.textContent='先选择两组对数，生成本期注数后核算投入占比。';return}
 var cost=nowPools.reduce(function(n,p){return n+p.length},0)*STAKE;
 if(!(v>0)){exposure.textContent='请填写预算';note.textContent='金额必须大于0；这是支出提醒，不会自动购买或下注。';return}
 var pct=cost/v*100;exposure.textContent=pct.toFixed(1)+'%';exposure.className=pct>10?'negative':'';
 note.textContent='本期模拟投入'+strmoney(cost)+'，占预算'+pct.toFixed(1)+'%。'+(pct>10?'单期占比偏高；请控制资金风险，不要为了追回损失追加投入。':'仅供评估资金占用；本功能不会实际下单。');
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
  metric('s789Total',nfmt(total)+' 注');metric('s789Unique',nfmt(union.size)+' 组');metric('s789Cost',strmoney(total*STAKE));updateBudget();batchIndex=0;refreshBatches();
  get('s789Download').disabled=false;get('s789Copy').disabled=false;for(var k=0;k<3;k++){var exportBtn=get('s789Download'+k);if(exportBtn)exportBtn.disabled=false;}
  var r=recordForIndex(historyRows.length);
  setStatus((r?'已保存并锁定本期方案。':'预览已完成，尚未保存。')+' 对数 '+pair.join('＋')+'；三套不去重 '+nfmt(total)+' 注。',r?'ok':'');
 }catch(e){resetMetrics();setStatus(e.message,'error')}
}
/* 七段复制：先完整列出7码，再8码、9码；只分段，不跨套去重。 */
function batchTickets(){
 if(!nowPools)return [];
 return nowPools[0].concat(nowPools[1],nowPools[2]);
}
function batchSlice(index){
 var all=batchTickets(),lo=Math.floor(all.length*index/7),hi=Math.floor(all.length*(index+1)/7);
 return {items:all.slice(lo,hi),from:lo,to:hi,total:all.length};
}
function refreshBatches(){
 var info=get('s789BatchInfo'),area=get('s789BatchText'),copy=get('s789BatchCopy');
 if(!info||!area||!copy)return;
 var all=nowPools?batchTickets():[];
 for(var i=0;i<7;i++){
  var btn=get('s789Batch'+i);if(!btn)continue;
  var start=Math.floor(all.length*i/7),end=Math.floor(all.length*(i+1)/7),count=end-start;
  btn.disabled=!nowPools;btn.classList.toggle('active',!!nowPools&&i===batchIndex);
  btn.textContent='第'+(i+1)+'段 · '+nfmt(count)+'注';
 }
 if(!nowPools){
  info.textContent='请先选择两组对数，点击“计算本期号码”。';
  area.value='';copy.disabled=true;return;
 }
 var seg=batchSlice(batchIndex);
 area.value=seg.items.map(pad).join('\n');
 copy.disabled=seg.items.length===0;
 info.textContent='第'+(batchIndex+1)+'/7段 · '+nfmt(seg.items.length)+'注 · 全部编号'+(seg.total?seg.from+1:0)+'—'+seg.to+' / '+nfmt(seg.total)+'注 · 保留三套重复号码';
}
function savePick(){
 try{
  var p=validPairs();
  if(recordForIndex(historyRows.length))throw Error('本期已保存，不能覆盖原始记录。');
  if(!nowPools)preview();
  if(!nowPools)throw Error('请先计算号码池。');
  var r={version:1,asOfIndex:historyRows.length,issue:currentIssue(),baseLast:historyRows[historyRows.length-1],pairA:p[0],pairB:p[1],pairModes:readPairModes(),filters:currentFilterSettings(),counts:nowPools.map(function(x){return x.length}),poolBits:nowPools.map(codeBits),createdAt:new Date().toISOString(),origin:'local',rule:'fixed789-750-v1',stake:STAKE,prize:PRIZE};
  var all=saved();all.push(r);store(all);recentRecords=all;
  updateInputs();renderRecords();
  setStatus('已保存本期 '+r.issue+'，对数 '+p.join('＋')+'；每套号码快照已记录在本机。','ok');
 }catch(e){setStatus('保存失败：'+e.message,'error')}
}
function buildTicketText(){
 if(!nowPools)throw Error('请先计算号码池。');
 var pair=validPairs(),lines=['观数知微 · 固定7＋8＋9 三套不去重号码','待开奖：'+currentIssue(),'开奖前历史尾号：'+historyRows[historyRows.length-1],'规则：排最近750期、和值'+currentFilterSettings().sumMin+'—'+currentFilterSettings().sumMax+'、单双排除'+(currentFilterSettings().odd.join('、')||'无')+'、大小排除'+(currentFilterSettings().big.join('、')||'无')+'、三重四重双对子、三顺子三倒顺、最近10期三位同位','本期对数：排'+pair.join('、'),'对子类型：'+readPairModes().map(function(v,j){return SETS[j].id+'码='+({full:'完整码',pair:'有对子',none:'无对子'}[v])}).join('；'),'不去重总注数：'+nowPools.reduce(function(n,a){return n+a.length},0),'每注0.1元、中奖每注按932元模拟',''];
 nowPools.forEach(function(pool,j){lines.push('====== '+SETS[j].name+' '+pool.length+'注 ======');pool.forEach(function(n){lines.push(pad(n))});lines.push('')});
 return lines.join('\n');
}
function buildSingleSetText(index){
 if(!nowPools)throw Error('请先计算号码池。');
 if(index<0||index>2||!nowPools[index])throw Error('找不到对应的号码套。');
 var pair=validPairs(),pool=nowPools[index],lines=['观数知微 · '+SETS[index].name+' 独立号码文件','待开奖：'+currentIssue(),'开奖前历史尾号：'+historyRows[historyRows.length-1],'本期对数：排'+pair.join('、'),'对子类型：'+({full:'完整码',pair:'有对子',none:'无对子'}[readPairModes()[index]]),'本套注数：'+pool.length,'规则：沿用网站当前7+8+9方案，不改变排码条件',''];
 pool.forEach(function(n){lines.push(pad(n))});
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
 data.slice(-40).reverse().map(function(x){return [escapeHTML(x.record.issue),escapeHTML(x.verify.actual),x.verify.tiers.join('/'),x.verify.hits+'注',money(x.verify.prize-x.verify.cost),x.verify.hits?'—':escapeHTML(missReasons(x.record,x.verify.actual))]}),['期号','开奖','7/8/9','共中','净收益','未中原因']);
}
function sumCountsForBase(base,selectedMask){
 var sizes=[0,0,0],modes=readPairModes();
 base.forEach(function(e){if(e.pairMask&selectedMask)return;for(var j=0;j<3;j++){if((e.tierMask&(1<<j))&&pairAllowed(e,j,modes))sizes[j]++}});
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
function historyIssueAt(index){
 var rows=metadata&&metadata.draws,latest=rows&&rows.length?rows[rows.length-1]:null;
 var offset=historyRows.length-index-1;
 if(latest&&historyRows[historyRows.length-1]===latest.front4&&/^\d{7}$/.test(latest.issue||'')){
  var n=Number(latest.issue.slice(4))-offset;
  if(n>0&&n<=365)return latest.issue.slice(0,4)+String(n).padStart(3,'0');
 }
 return '历史第'+(index+1)+'条';
}
/* 事后条件随机：每期先看实际开奖号，随机选两组均未完整出现的对数。
   此计算使用当期未来信息，仅作理想化条件模拟；绝不可计入实盘回测。 */
function safeRandom(seed){
 var state=(Number(seed)>>>0)||1;
 return function(){
  state=(state+0x6D2B79F5)>>>0;
  var t=state;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 }
}
async function backtestSafeRandom(n){
 var seed=Number(get('s789RandomSeed').value);
 if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295)throw Error('随机种子须在1—4294967295之间。');
 var random=safeRandom(seed),combos=comboMasks(),end=historyRows.length,start=Math.max(0,end-n);
 var totalCost=0,totalPrize=0,totalHits=0,totalHitPeriods=0,totalGroups=0,byTier=[0,0,0],byTierGroups=[0,0,0],distribution=[0,0,0,0],missStreak=0,hitStreak=0,maxMiss=0,maxHit=0,maxMissStart=-1,maxMissEnd=-1,maxHitStart=-1,maxHitEnd=-1;
 var outcomeStats=Array.from({length:4},function(){return {periods:0,tickets:0,cost:0,prize:0}}),tierStats=Array.from({length:3},function(){return {periods:0,tickets:0,cost:0,prize:0}}),combinationStats=Array.from({length:8},function(){return {periods:0,cost:0,prize:0}});
 var records=[];
 for(var i=start;i<end;i++){
  var actual=historyRows[i],candidate=info[Number(actual)],actualPairMask=bits(actual);
  var safe=combos.filter(function(p){return !(p.mask&actualPairMask)});
  if(!safe.length)throw Error('历史第'+(i+1)+'期找不到两组排不中的对数。');
  var chosen=safe[Math.floor(random()*safe.length)];
  var base=baseFor(historyRows.slice(0,i)),sizes=sumCountsForBase(base,chosen.mask);
  var nGroups=sizes[0]+sizes[1]+sizes[2],cost=nGroups*STAKE;
  var eligible=!!candidate&&base.some(function(e){return e.n===Number(actual)});
  var tiers=[0,0,0];
  if(eligible){for(var j=0;j<3;j++)tiers[j]=(candidate.tierMask&(1<<j))?1:0;}
  var hits=tiers[0]+tiers[1]+tiers[2],prize=hits*PRIZE,profit=prize-cost;
  distribution[hits]++;totalHits+=hits;totalGroups+=nGroups;totalCost+=cost;totalPrize+=prize;
  var group=outcomeStats[hits];group.periods++;group.tickets+=hits;group.cost+=cost;group.prize+=prize;
  var comboIndex=(tiers[0]?1:0)|(tiers[1]?2:0)|(tiers[2]?4:0),combo=combinationStats[comboIndex];combo.periods++;combo.cost+=cost;combo.prize+=prize;
  for(var k=0;k<3;k++){byTier[k]+=tiers[k];byTierGroups[k]+=sizes[k];tierStats[k].periods+=tiers[k];tierStats[k].tickets+=tiers[k];tierStats[k].cost+=sizes[k]*STAKE;tierStats[k].prize+=tiers[k]*PRIZE}
  if(hits){
   totalHitPeriods++;hitStreak++;missStreak=0;
   if(hitStreak>maxHit){maxHit=hitStreak;maxHitEnd=i;maxHitStart=i-hitStreak+1}
  }else{
   missStreak++;hitStreak=0;
   if(missStreak>maxMiss){maxMiss=missStreak;maxMissEnd=i;maxMissStart=i-missStreak+1}
  }
  records.push({index:i,actual:actual,pairA:chosen.a,pairB:chosen.b,tiers:tiers,hits:hits,groups:nGroups,cost:cost,profit:profit,miss:hits?null:missReasons({asOfIndex:i,pairA:chosen.a,pairB:chosen.b},actual)});
  if((i-start)%5===0){
   get('s789BackStatus').textContent='事后安全随机回测 '+(i-start+1)+'/'+(end-start)+'期…';
   await new Promise(function(resolve){setTimeout(resolve,0)});
  }
 }
 var count=end-start,moneyStr=money(totalPrize-totalCost);
 var indexName=function(j){return j<0?'—':historyIssueAt(j)};
 showResults('两组都排不中 · 事后安全随机 · 最近'+count+'期',[
  ['命中期数',totalHitPeriods+' / '+count+'期'],
  ['累计中奖注数',totalHits+'注'],
  ['0/1/2/3套命中',distribution.join(' / ')+'期'],
  ['7/8/9各套中奖',byTier.join(' / ')+'注'],
  ['累计模拟投入',strmoney(totalCost)],
  ['模拟净收益',moneyStr],
  ['平均每期注数',nfmt(totalGroups/count)+'注'],
  ['最长连续不中',maxMiss+'期'],
  ['最长连续命中',maxHit+'期']
 ],'【事后条件模拟，不是开奖前真实预测】每期根据已知开奖号码，先筛出两组都不会完整出现的对数组合，再用固定种子'+seed+'随机挑选其中1种。每期均重新排最近750期历史，三套各1倍且不去重。累计奖金'+strmoney(totalPrize)+'；平均每期7/8/9注数'+byTierGroups.map(function(v){return nfmt(v/count)}).join(' / ')+'。最长连错：'+indexName(maxMissStart)+'—'+indexName(maxMissEnd)+'；最长连中：'+indexName(maxHitStart)+'—'+indexName(maxHitEnd)+'。同一种子结果可复现，换种子可重新随机；这利用了开奖后信息，不能代表实际盈利。',
 records.slice().reverse().map(function(r){
  return [escapeHTML(historyIssueAt(r.index)),escapeHTML(r.actual),escapeHTML(r.pairA+'＋'+r.pairB),r.tiers.join('/'),r.hits+'注',nfmt(r.groups),money(r.profit),r.miss?escapeHTML(r.miss):'—'];
 }),['期号','开奖号码','本期随机排除对数','7/8/9命中','总中奖','总注数','净收益','未中原因']);
 renderSafeBreakdown(outcomeStats,tierStats,combinationStats,count);
}

function renderSafeBreakdown(byCount,bySet,byCombo,totalPeriods){
 var root=get('s789Breakdown');if(!root)return;
 var moneyCell=function(v){return '<td class="s789-tabular'+(v<0?' s789-neg':' s789-pos')+'">'+money(v)+'</td>'};
 var table=function(head,rows){
  return '<div class="s789-tablewrap"><table><thead><tr>'+head.map(function(t){return '<th>'+escapeHTML(t)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
 };
 var rows=byCount.map(function(x,i){
  return '<tr><td><strong>'+i+'套</strong></td><td>'+x.periods+'期</td><td>'+x.tickets+'注</td><td>'+strmoney(x.prize)+'</td><td>'+strmoney(x.cost)+'</td>'+moneyCell(x.prize-x.cost)+moneyCell(x.periods?(x.prize-x.cost)/x.periods:0)+'</tr>';
 });
 var setRows=bySet.map(function(x,i){
  return '<tr><td><strong>'+SETS[i].id+'码</strong></td><td>'+x.periods+'期</td><td>'+x.tickets+'注</td><td>'+strmoney(x.prize)+'</td><td>'+strmoney(x.cost)+'</td>'+moneyCell(x.prize-x.cost)+'</tr>';
 });
 var combRows=byCombo.map(function(x,i){
  var label=i===0?'三套均未中':SETS.filter(function(set,j){return (i&(1<<j))!==0}).map(function(set){return set.id+'码'}).join('＋');
  return '<tr><td><strong>'+label+'</strong></td><td>'+x.periods+'期</td><td>'+strmoney(x.prize)+'</td><td>'+strmoney(x.cost)+'</td>'+moneyCell(x.prize-x.cost)+'</tr>';
 });
 var totalPeriodsByCount=byCount.reduce(function(a,x){return a+x.periods},0);
 var costByCount=byCount.reduce(function(a,x){return a+x.cost},0),prizeByCount=byCount.reduce(function(a,x){return a+x.prize},0);
 var costBySet=bySet.reduce(function(a,x){return a+x.cost},0),prizeBySet=bySet.reduce(function(a,x){return a+x.prize},0);
 var periodsByCombo=byCombo.reduce(function(a,x){return a+x.periods},0);
 if(totalPeriodsByCount!==totalPeriods||periodsByCombo!==totalPeriods||Math.abs(costByCount-costBySet)>.01||Math.abs(prizeByCount-prizeBySet)>.01){
  root.innerHTML='<p class="s789-status error">分组投入、奖金校验未通过；请重新回测。</p>';
  root.style.display='block';return;
 }
 root.innerHTML='<div class="s789-divider"></div><h3 class="s789-smallhead">① 中0套／1套／2套／3套：各自盈利多少？</h3>'+
 '<p class="s789-helper">每一期归入对应的命中套数。每期投入按三套全部注数计算，不是只计算中奖那套；0套也是实付成本。</p>'+
 table(['命中','期数','奖金注数','奖金','三套合计投入','净收益','每期平均净收益'],rows)+
 '<h3 class="s789-smallhead s789-subhead">② 7码／8码／9码：各套独立盈亏</h3>'+
 '<p class="s789-helper">按每套自身的累计成本及中奖注数统计；同一个四位号码同时被多个套覆盖时，各套分别计注。</p>'+
 table(['套数','命中期数','中奖注数','奖金','本套投入','净收益'],setRows)+
 '<h3 class="s789-smallhead s789-subhead">③ 具体同时命中了哪几套？</h3>'+
 table(['实际命中组合','期数','奖金','三套合计投入','净收益'],combRows)+
 '<p class="s789-helper">核对：'+totalPeriodsByCount+'期，奖金'+strmoney(prizeByCount)+'，投入'+strmoney(costByCount)+'，净收益'+money(prizeByCount-costByCount)+'。所有金额仅为事后条件历史模拟。</p>';
 root.style.display='block';
}
function showResults(title,metrics,foot,rows,headers){
 var extra=get('s789Breakdown');if(extra){extra.style.display='none';extra.innerHTML=''}
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
  if(mode==='recorded'){backtestRecorded(n)}else if(mode==='safe-random'){await backtestSafeRandom(n)}else{await backtestSimulation(n)}
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
    items.push({version:1,asOfIndex:r.asOfIndex,issue:String(r.issue||'历史第'+(r.asOfIndex+1)+'条'),baseLast:String(r.baseLast||''),pairA:r.pairA,pairB:r.pairB,pairModes:Array.isArray(r.pairModes)&&r.pairModes.length===3?r.pairModes:DEFAULT_PAIR_MODES.slice(),filters:r.filters&&Number.isInteger(r.filters.sumMin)&&Number.isInteger(r.filters.sumMax)?r.filters:null,counts:r.counts,poolBits:r.poolBits,createdAt:r.createdAt,origin:'imported',rule:r.rule||'fixed789-750-v1',stake:STAKE,prize:PRIZE});num++;
   });
   store(items);recentRecords=items;updateInputs();renderRecords();setStatus('成功导入'+num+'条记录。外部导入的历史期次仅用于核对，不列为本机原始记录。','ok');
  }catch(e){setStatus('导入失败：'+e.message,'error')}
 };fr.readAsText(file);
}
function onHistoryChange(hist,meta){
 if(!Array.isArray(hist)||hist.length<20)return;
 var key=hist.length+'|'+hist.slice(-10).join('/');
 if(ready&&key===lastHistoryKey){metadata=meta||metadata;get('s789Issue').textContent=currentIssue();return;}
 lastHistoryKey=key;historyRows=hist.slice();metadata=meta||null;nowBaseKey='';ready=true;recentRecords=saved();
 updateInputs();renderRecords();
}
function init(){
 if(!get(ROOT))return;
 buildPatternControls();
 get('s789SumMin').onchange=saveFilterSettings;get('s789SumMax').onchange=saveFilterSettings;
 document.querySelectorAll('#s789OddPatterns input,#s789BigPatterns input').forEach(function(x){x.onchange=saveFilterSettings});
 get('s789ResetFilters').onclick=resetFilterSettings;
 initPairModes();
 for(var pm=0;pm<3;pm++){(function(j){var el=get('s789PairMode'+j);if(el)el.onchange=savePairModes})(pm)}
 initNumbers();
 get('s789Preview').onclick=preview;
 get('s789Save').onclick=savePick;
 get('s789Download').onclick=function(){try{makeDownload('观数知微_固定789_'+currentIssue()+'_不去重.txt',buildTicketText(),'text/plain;charset=utf-8');setStatus('号码TXT已经生成。','ok')}catch(e){setStatus(e.message,'error')}};
 for(var di=0;di<3;di++)(function(index){var btn=get('s789Download'+index);if(btn)btn.onclick=function(){try{makeDownload('观数知微_'+SETS[index].name+'_'+currentIssue()+'.txt',buildSingleSetText(index),'text/plain;charset=utf-8');setStatus(SETS[index].name+' TXT文件已生成，共'+nowPools[index].length+'注。','ok')}catch(e){setStatus(e.message,'error')}}})(di);
 get('s789Copy').onclick=function(){try{copyText(buildTicketText()).then(function(){setStatus('三套号码已复制到剪贴板。','ok')}).catch(function(){setStatus('复制受浏览器限制，请使用下载TXT。','error')})}catch(e){setStatus(e.message,'error')}};
 for(var bi=0;bi<7;bi++){
  (function(j){var btn=get('s789Batch'+j);if(btn)btn.onclick=function(){batchIndex=j;refreshBatches()}})(bi);
 }
 get('s789BatchCopy').onclick=function(){
  if(!nowPools)return;
  var seg=batchSlice(batchIndex);
  copyText(seg.items.map(pad).join('\n')).then(function(){get('s789BatchInfo').textContent='第'+(batchIndex+1)+'段已复制 · '+nfmt(seg.items.length)+'注（总数'+nfmt(seg.total)+'注，三套不去重）'}).catch(function(){get('s789BatchInfo').textContent='自动复制被限制，可长按下方号码复制';get('s789BatchText').focus();get('s789BatchText').select()});
 };
 get('s789PairA').onchange=function(){if(!recordForIndex(historyRows.length))resetMetrics()};
 get('s789PairB').onchange=function(){if(!recordForIndex(historyRows.length))resetMetrics()};
 get('s789RunBack').onclick=runBacktest;
 var seedInput=get('s789RandomSeed'),reroll=get('s789Reroll'),modeSelect=get('s789BackMode');
 if(seedInput&&reroll&&modeSelect){
  try{var lastSeed=localStorage.getItem('gszw-s789-safe-random-seed-v1');if(lastSeed&&Number(lastSeed)>0)seedInput.value=lastSeed}catch(_){}
  function refreshMode(){var show=modeSelect.value==='safe-random';get('s789RandomControls').style.display=show?'flex':'none';}
  seedInput.onchange=function(){try{localStorage.setItem('gszw-s789-safe-random-seed-v1',String(this.value))}catch(_){}};
  reroll.onclick=function(){
   var x=Number(seedInput.value);if(!Number.isSafeInteger(x)||x<1||x>4294967295)x=20261123;
   seedInput.value=String(x===4294967295?1:x+1);
   seedInput.onchange();
   runBacktest();
  };
  modeSelect.onchange=refreshMode;refreshMode();
 }

 var budget=get('s789Budget');if(budget){try{var old=localStorage.getItem('gszw-s789-budget-v1');if(old!==null&&Number(old)>0)budget.value=old}catch(_){}budget.onchange=function(){try{localStorage.setItem('gszw-s789-budget-v1',String(this.value))}catch(_){}updateBudget()}}
 get('s789Export').onclick=exportRecords;
 get('s789Import').onclick=function(){get('s789ImportFile').click()};
 get('s789ImportFile').onchange=function(){if(this.files&&this.files[0])importRecords(this.files[0]);this.value=''};
 window.Strategy789={onHistoryChange:onHistoryChange};
 try{if(typeof history!=='undefined'&&Array.isArray(history))onHistoryChange(history,typeof autoMeta!=='undefined'?autoMeta:null)}catch(e){setStatus('等待网站历史数据：'+e.message,'error')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();