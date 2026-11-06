import {POSITIONS,DEFAULT_RULES,EMPTY_RULES,clone,assertHistory,validateRules,structure,sum,generate,subset,parseHistory,ruleSummary,backtest} from './engine.mjs';
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const KEY='binbin-p5-studio-v1';
const fmt=n=>Number(n).toLocaleString('zh-CN');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={distinct:'无对子',pair:'单对子',doublePair:'双对子',triple:'三重',quad:'四重'};
let state={version:1,history:[],rules:clone(DEFAULT_RULES),schemes:[],sourceName:'内置历史',presetName:'常用规则'};
let result=null,visible=[],kind='all',page=1,historyLimit=100,btResult=null,btController=null,btRevision=0,revision=0,toastTimer,importParsed=null,ready=false;
const PAGE_SIZE=80;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='已保存在此设备';return true;}catch{$('#save-status').textContent='保存失败，请下载备份';toast('浏览器未能保存修改，请下载 JSON 备份。');return false;}}
function checkState(value){
  if(!value||value.version!==1)throw new Error('备份版本不支持。');
  assertHistory(value.history);validateRules(value.rules);
  if(!Array.isArray(value.schemes)||value.schemes.length>100)throw new Error('方案列表无效或超过 100 个。');
  for(const s of value.schemes){if(typeof s.name!=='string'||s.name.length>40||typeof s.id!=='string'||s.id.length>100)throw new Error('方案格式无效。');validateRules(s.rules);}
  return {version:1,history:value.history,rules:clone(value.rules),schemes:value.schemes.map(s=>({id:s.id,name:s.name,rules:clone(s.rules),date:String(s.date||'')})),sourceName:String(value.sourceName||'已恢复历史').slice(0,180),presetName:String(value.presetName||'自定义规则').slice(0,40)};
}
function renderRuleControls(){
  $('#position-grids').innerHTML=POSITIONS.map((label,p)=>`<div class="position-row"><span class="position-name">${label}</span><div class="digit-grid">${Array.from({length:10},(_,d)=>`<button class="digit-btn ${state.rules.excluded[p].includes(d)?'active':''}" data-position="${p}" data-digit="${d}" aria-label="${label}排除 ${d}" aria-pressed="${state.rules.excluded[p].includes(d)}">${d}</button>`).join('')}</div></div>`).join('');
  $$('[data-rule]').forEach(el=>{const value=state.rules[el.dataset.rule];if(el.type==='checkbox')el.checked=value;else el.value=value;});
  $('#structure-choices').innerHTML=Object.entries(names).map(([id,label])=>`<button class="choice-chip ${state.rules.structures.includes(id)?'active':''}" data-structure="${id}" aria-pressed="${state.rules.structures.includes(id)}">${label}</button>`).join('');
  for(const [id,chars,key] of [['parity-choices',['双','单'],'parityExcluded'],['size-choices',['小','大'],'sizeExcluded']]){
    $(`#${id}`).innerHTML=Array.from({length:16},(_,n)=>[3,2,1,0].map(i=>chars[(n>>i)&1]).join('')).map(s=>`<button class="pattern-chip ${state.rules[key].includes(s)?'active':''}" data-pattern="${s}" data-key="${key}" aria-label="排除${s}" aria-pressed="${state.rules[key].includes(s)}">${s}</button>`).join('');
  }
  $('#preset-label').textContent=state.presetName;
}
function refreshData(){
  $('#stat-history').textContent=fmt(state.history.length);$('#nav-history-count').textContent=fmt(state.history.length);$('#history-total').textContent=`${fmt(state.history.length)} 期`;
  $('#history-source').textContent=state.history.length?`窗口内 ${fmt(new Set(state.history.slice(-state.rules.historyWindow)).size)} 组不重复号码`:'请先导入历史';
  const last=state.history.at(-1)||'————';
  $('#latest-balls').innerHTML=[...last].map(d=>`<b>${d}</b>`).join('');
  $('#previous-draw').textContent=`上期 ${state.history.at(-2)||'—'} · 最新历史序号 ${state.history.length||'—'}`;
  $('#hefen1-target').textContent=state.history.length?`排尾和 ${(Number(last[0])+Number(last[2]))%10}`:'等待上期号码';
  $('#hefen4-target').textContent=state.history.length?`排尾和 ${(Number(last[2])+Number(last[3]))%10}`:'等待上期号码';
  renderHistory();
}
function invalidateBacktest(){revision++;if(btController)btController.abort();if(btResult)$('#backtest-stale').hidden=false;$('#export-backtest').disabled=true;}
function run({persist=true,announce=false}={}){
  if(!ready)return;
  const started=performance.now();
  try{
    validateRules(state.rules);
    result=generate(state.rules,state.history);
    $('#result-error').hidden=true;$('#stat-count').textContent=fmt(result.candidates.length);$('#stat-rules').textContent=result.steps.length;
    $('#stat-coverage').textContent=`占全部组合 ${(result.candidates.length/100).toFixed(2)}% · 已排 ${fmt(10000-result.candidates.length)} 组`;
    $('#stat-time').textContent=`从 10,000 组重算 · ${Math.max(1,Math.round(performance.now()-started))} ms`;
    $('#computed-label').innerHTML='<svg><use href="#i-check"/></svg>已核对计算';
    $('#result-warning').hidden=!result.warnings.length;$('#result-warning').textContent=result.warnings.join(' ');
    $('#advanced-status').textContent=`${Number(state.rules.hefen1)+Number(state.rules.hefen4)+state.rules.parityExcluded.length+state.rules.sizeExcluded.length} 项启用`;
    $('#rules-text').textContent=ruleSummary(state.rules);
    $('#pipeline').innerHTML=result.steps.length?result.steps.map(s=>`<div class="pipeline-row"><span>${esc(s.name)}</span><div class="pipeline-bar"><span style="width:${s.remaining/100}%"></span></div><strong>${fmt(s.remaining)}</strong><small>−${s.excluded}</small></div>`).join(''):'<div class="audit-note">没有启用排除条件，完整保留 10,000 组。</div>';
    $$('[data-subset]').forEach(el=>{el.querySelector('span').textContent=fmt(subset(result.candidates,el.dataset.subset).length);});
    refreshData();page=1;renderResults();if(persist)save();if(announce)toast(`已从 10,000 组重算，保留 ${fmt(result.candidates.length)} 组。`);
  }catch(err){
    result=null;visible=[];$('#result-error').hidden=false;$('#result-error').textContent=err.message;
    $('#stat-count').textContent='—';$('#computed-label').textContent='请检查规则';$('#number-grid').innerHTML='<div class="no-results">规则修正后将自动重算</div>';
    $('#result-count').textContent='—';$('#pipeline').textContent='等待有效规则。';setExportDisabled(true);
    $('#rules-text').textContent='当前规则有误，请修正后再保存或导出。';
    if(announce)toast(err.message);
  }
}
function changed({history=false,controls=false}={}){
  if(!history)state.presetName='自定义规则';
  if(controls)renderRuleControls();else $('#preset-label').textContent=state.presetName;
  invalidateBacktest();run();
}
function setExportDisabled(disabled){['copy-all','copy-batch','download-txt','download-csv'].forEach(id=>$(`#${id}`).disabled=disabled);}
function renderResults(){
  if(!result)return;
  const query=$('#candidate-search').value.trim(),first=$('#first-digit').value;
  visible=subset(result.candidates,kind).filter(s=>(!query||s.startsWith(query))&&(!first||s.startsWith(first)));
  const pages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));page=Math.min(Math.max(page,1),pages);
  const start=(page-1)*PAGE_SIZE;
  const items=visible.slice(start,start+PAGE_SIZE);
  $('#result-count').textContent=`${fmt(visible.length)} 组`;
  $('#number-grid').innerHTML=items.length?items.map(n=>`<button class="number-cell ${structure(n)==='pair'?'is-pair':''}" data-copy-number="${n}" title="点击复制 ${n}" aria-label="复制号码 ${n}"><span class="first">${n[0]}</span>${n.slice(1)}</button>`).join(''):'<div class="no-results">当前条件下没有号码<br><small>可调整规则、搜索或万位筛选</small></div>';
  $('#page-info').textContent=visible.length?`显示 ${fmt(start+1)}–${fmt(Math.min(start+PAGE_SIZE,visible.length))} / ${fmt(visible.length)} 组`:'共 0 组';
  $('#page-number').textContent=`${page} / ${pages}`;$('#prev-page').disabled=page<=1;$('#next-page').disabled=page>=pages;
  $$('[data-subset]').forEach(el=>{el.classList.toggle('active',el.dataset.subset===kind);el.setAttribute('aria-pressed',el.dataset.subset===kind);});
  $('#subset-help').textContent={all:'所有通过当前规则的四位号码',distinct:'无对子：四位数字互不相同',pair:'普通单对子：恰好一对，其他两位各不相同',shrink:'主池内：单对子 · 和值 9–25 · 万位 2/3/5/7/9'}[kind];
  $('#export-scope').textContent=`当前${query||first?'筛选':'子集'} ${fmt(visible.length)} 组`;
  $('#copy-all').innerHTML=`<svg><use href="#i-copy"/></svg>复制 ${fmt(visible.length)} 组`;
  setExportDisabled(!visible.length);renderBatch();
}
function batches(){const n=Number($('#batch-total').value),size=Math.ceil(visible.length/n);return Array.from({length:n},(_,i)=>visible.slice(i*size,(i+1)*size));}
function renderBatch(){
  const values=batches(),old=Math.min(Number($('#batch-index').value)||0,values.length-1);
  $('#batch-index').innerHTML=values.map((items,i)=>`<option value="${i}">第 ${i+1} 批 · ${items.length} 组</option>`).join('');$('#batch-index').value=String(old);renderBatchInfo();
}
function renderBatchInfo(){const items=batches()[Number($('#batch-index').value)]||[];$('#batch-info').textContent=items.length?`${items[0]} → ${items.at(-1)} · 每行一组，按万位升序`:'本批为空，可选择其他批次。';$('#copy-batch').disabled=!items.length;}
function renderHistory(){
  $('#history-table').innerHTML=state.history.slice(-historyLimit).map((n,i,a)=>({n,index:state.history.length-a.length+i+1})).reverse().map(({n,index})=>`<tr><td>${index}</td><td class="number">${n}</td><td>${sum(n)}</td><td><span class="badge">${names[structure(n)]}</span></td><td>${[...n].map(v=>Number(v)%2?'单':'双').join('')}</td></tr>`).join('')||'<tr><td colspan="5">尚无历史，先导入或追加一期。</td></tr>';
  $('#more-history').hidden=historyLimit>=state.history.length;$('#undo-draw').disabled=!state.history.length;
}
function view(id){
  const valid=['workbench','history','backtest','schemes'];if(!valid.includes(id))id='workbench';
  $$('.view').forEach(el=>el.hidden=el.id!==`view-${id}`);$$('.nav-item').forEach(el=>{el.classList.toggle('active',el.dataset.view===id);if(el.dataset.view===id)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('#page-crumb').textContent={workbench:'排码工作台',history:'历史开奖',backtest:'滚动回测',schemes:'我的方案'}[id];
  if(id==='schemes')renderSchemes();
  window.history.replaceState(null,'',`#${id}`);window.scrollTo({top:0,behavior:'instant'});
}
function download(content,name,type='text/plain;charset=utf-8'){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`已开始下载 ${name}`);
}
async function copy(text,message='已复制'){
  if(!text){toast('没有可复制的内容。');return;}
  try{await navigator.clipboard.writeText(text);toast(message);}catch{$('#copy-fallback').value=text;$('#copy-dialog').showModal();$('#copy-fallback').focus();$('#copy-fallback').select();}
}
function exportName(ext){const label={all:'全部',distinct:'无对子',pair:'单对子',shrink:'缩水池'}[kind];return `P5_截至${state.history.at(-1)||'无历史'}_${label}_${visible.length}组.${ext}`;}
function markPreset(rules,label){state.rules=clone(rules);state.presetName=label;renderRuleControls();invalidateBacktest();run();toast(`已应用「${label}」`);}
function saveDialog(){try{validateRules(state.rules);$('#scheme-name').value='';$('#save-dialog').showModal();$('#scheme-name').focus();}catch(err){toast(err.message);}}
function renderSchemes(){
  const defaults=[{id:'builtin',name:'常用规则',date:'内置预设',rules:DEFAULT_RULES},{id:'empty',name:'全部放开',date:'从零设置',rules:EMPTY_RULES}];
  $('#scheme-list').innerHTML=[...defaults,...state.schemes].map(s=>`<article class="panel scheme-card"><svg><use href="#i-folder"/></svg><h3>${esc(s.name)}</h3><p>${esc(s.date)}<br>${s.rules.historyEnabled?`最近 ${s.rules.historyWindow} 期历史排除`:'不启用历史排除'} · ${s.rules.sumEnabled?`和值 ${s.rules.sumMin}–${s.rules.sumMax}`:'和值不限'}<br>保留 ${esc(s.rules.structures.map(k=>names[k]).join('、'))||'无结构'}</p><div class="actions"><button class="btn" data-apply-scheme="${esc(s.id)}">应用方案</button>${['builtin','empty'].includes(s.id)?'':`<button class="inline-link muted-link" data-delete-scheme="${esc(s.id)}">删除</button>`}</div></article>`).join('');
}
function previewImport(){
  try{
    importParsed=parseHistory($('#import-text').value,$('#import-order').value==='newest');
    const {draws,errors}=importParsed;
    $('#confirm-import').disabled=!!errors.length||!draws.length;
    $('#import-preview').classList.toggle('danger',!!errors.length);
    $('#import-preview').textContent=errors.length?`有 ${errors.length} 行无法识别，导入尚未执行。请修正：${errors.slice(0,5).map(e=>`第 ${e.line} 行「${e.text}」`).join('；')}`:draws.length?`已识别 ${fmt(draws.length)} 期。最旧 ${draws[0]}，最新 ${draws.at(-1)}。${$('#import-mode').value==='replace'?'将替换现有历史。':'将按所选顺序追加到现有历史之后。'}重复开奖会保留。`:'请选择文件或粘贴号码。';
  }catch(err){importParsed=null;$('#confirm-import').disabled=true;$('#import-preview').textContent=err.message;$('#import-preview').classList.add('danger');}
}
function renderBacktest(data){
  $('#backtest-empty').hidden=true;$('#backtest-result').hidden=false;$('#backtest-stale').hidden=false;
  const current=btRevision===revision;$('#backtest-stale').hidden=current;$('#export-backtest').disabled=!current;
  $('#bt-hits').textContent=data.hits;$('#bt-total').textContent=`/ ${data.rows.length} 期`;$('#bt-rate').textContent=`${(100*data.hits/data.rows.length).toFixed(1)}%`;
  $('#bt-average').textContent=fmt(Math.round(data.averageCount));$('#bt-coverage').textContent=`平均覆盖 ${(data.averageCount/100).toFixed(2)}% 的全部组合`;
  $('#bt-miss').textContent=data.maxMiss;
  $('#hit-tape').innerHTML=data.rows.map(r=>`<button class="${r.hit?'hit':''}" data-bt-index="${r.index}" title="序号 ${r.index} · ${r.draw} · ${r.count} 组 · ${r.hit?'命中':'未中'}" aria-label="序号 ${r.index} ${r.hit?'命中':'未中'}">${r.index%100}</button>`).join('');
  $('#backtest-table').innerHTML=[...data.rows].reverse().map(r=>`<tr><td>${r.index}</td><td class="number">${r.draw}</td><td>${fmt(r.count)}</td><td><span class="${r.hit?'hit-badge':'miss-badge'}">${r.hit?'命中':'未中'}</span></td></tr>`).join('');
}
document.addEventListener('click',event=>{
  const nav=event.target.closest('[data-view]');if(nav){view(nav.dataset.view);return;}
  const close=event.target.closest('[data-close]');if(close){$(`#${close.dataset.close}`).close();return;}
  const position=event.target.closest('[data-position]');if(position){const p=Number(position.dataset.position),d=Number(position.dataset.digit),a=state.rules.excluded[p];state.rules.excluded[p]=a.includes(d)?a.filter(n=>n!==d):[...a,d].sort((a,b)=>a-b);changed({controls:true});return;}
  const struct=event.target.closest('[data-structure]');if(struct){const key=struct.dataset.structure;state.rules.structures=state.rules.structures.includes(key)?state.rules.structures.filter(v=>v!==key):[...state.rules.structures,key];changed({controls:true});return;}
  const pattern=event.target.closest('[data-pattern]');if(pattern){const {key,pattern:p}=pattern.dataset;state.rules[key]=state.rules[key].includes(p)?state.rules[key].filter(s=>s!==p):[...state.rules[key],p];changed({controls:true});return;}
  const st=event.target.closest('[data-subset]');if(st){kind=st.dataset.subset;page=1;renderResults();return;}
  const n=event.target.closest('[data-copy-number]');if(n){copy(n.dataset.copyNumber,`已复制 ${n.dataset.copyNumber}`);return;}
  const open=event.target.closest('[data-open-import]');if(open){$('#import-dialog').showModal();return;}
  const apply=event.target.closest('[data-apply-scheme]');if(apply){const id=apply.dataset.applyScheme;if(id==='builtin')markPreset(DEFAULT_RULES,'常用规则');else if(id==='empty')markPreset(EMPTY_RULES,'全部放开');else{const s=state.schemes.find(s=>s.id===id);if(s)markPreset(s.rules,s.name);}view('workbench');return;}
  const remove=event.target.closest('[data-delete-scheme]');if(remove){const s=state.schemes.find(s=>s.id===remove.dataset.deleteScheme);if(s&&confirm(`删除方案「${s.name}」？当前规则不受影响。`)){state.schemes=state.schemes.filter(v=>v.id!==s.id);save();renderSchemes();}return;}
  const bt=event.target.closest('[data-bt-index]');if(bt&&btResult){const r=btResult.rows.find(r=>r.index===Number(bt.dataset.btIndex));if(r)toast(`历史序号 ${r.index} · 开 ${r.draw}\n${r.count} 组候选 · ${r.hit?'命中':'未中'}`);}
});
$$('[data-rule]').forEach(el=>el.addEventListener('change',()=>{
  const key=el.dataset.rule;
  state.rules[key]=el.type==='checkbox'?el.checked:(el.type==='number'||key.endsWith('Threshold'))?(el.value===''?NaN:Number(el.value)):el.value;
  changed();
}));
$('#calculate-button').addEventListener('click',()=>run({announce:true}));
$('#jump-results').addEventListener('click',()=>$('.results-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
$('#reset-rules').addEventListener('click',()=>markPreset(DEFAULT_RULES,'常用规则'));
$('#empty-rules').addEventListener('click',()=>markPreset(EMPTY_RULES,'全部放开'));
$('#candidate-search').addEventListener('input',()=>{page=1;renderResults();});$('#first-digit').addEventListener('change',()=>{page=1;renderResults();});
$('#prev-page').addEventListener('click',()=>{page--;renderResults();});$('#next-page').addEventListener('click',()=>{page++;renderResults();});
$('#batch-total').addEventListener('change',renderBatch);$('#batch-index').addEventListener('change',renderBatchInfo);
$('#copy-all').addEventListener('click',()=>copy(visible.join('\n'),`已复制 ${fmt(visible.length)} 组，每行一组。`));
$('#copy-batch').addEventListener('click',()=>{const i=Number($('#batch-index').value),a=batches()[i];copy(a.join('\n'),`已复制第 ${i+1} 批，共 ${a.length} 组。`);});
$('#download-txt').addEventListener('click',()=>download(visible.join('\n')+'\n',exportName('txt')));
$('#download-csv').addEventListener('click',()=>download('\uFEFF号码\r\n'+visible.map(s=>`"${s}"`).join('\r\n')+'\r\n',exportName('csv'),'text/csv;charset=utf-8'));
const copyRules=()=>{try{copy(ruleSummary(state.rules),'已复制完整规则说明');}catch(e){toast(e.message);}};
$('#copy-rules').addEventListener('click',copyRules);$('#copy-rules-secondary').addEventListener('click',copyRules);
$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
$('#save-scheme').addEventListener('click',saveDialog);$('#save-scheme-secondary').addEventListener('click',saveDialog);
$('#save-scheme-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#scheme-name').value.trim();if(!name){toast('请输入方案名称。');return;}if(state.schemes.length>=100){toast('最多保存 100 个方案，请先删除不再使用的方案。');return;}try{validateRules(state.rules);}catch(err){toast(err.message);return;}state.schemes.push({id:typeof crypto.randomUUID==='function'?crypto.randomUUID():`scheme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`,name,rules:clone(state.rules),date:new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})});save();$('#save-dialog').close();renderSchemes();toast(`已保存「${name}」`);});
$('#append-form').addEventListener('submit',e=>{
  e.preventDefault();const raw=$('#append-number').value.trim();if(!/^\d{4,5}$/.test(raw)){toast('请输入 4 位或 5 位数字，前导零需要保留。');return;}
  if(state.history.length>=100000){toast('历史最多保存 100,000 期。');return;}
  const n=raw.slice(0,4);if(n===state.history.at(-1)&&!confirm(`新号码 ${n} 与最后一期相同，确定是新一期并继续追加吗？`))return;
  state.history.push(n);state.sourceName='本地更新';$('#append-number').value='';changed({history:true});toast(`已追加 ${n}${raw.length===5?'（已忽略个位）':''}，全部候选已更新。`);
});
$('#undo-draw').addEventListener('click',()=>{if(!state.history.length)return;const n=state.history.at(-1);if(confirm(`移除最后一期 ${n}？移除后会重新计算所有候选。`)){state.history.pop();changed({history:true});toast(`已移除 ${n}。`);}});
$('#more-history').addEventListener('click',()=>{historyLimit+=100;renderHistory();});
$('#export-history').addEventListener('click',()=>download(state.history.map((n,i)=>`${i+1}\t${n}`).join('\n')+'\n',`P5_历史_${state.history.length}期_截至${state.history.at(-1)||'无历史'}.txt`));
$('#import-text').addEventListener('input',previewImport);$('#import-order').addEventListener('change',previewImport);$('#import-mode').addEventListener('change',previewImport);
$('#history-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>5000000){toast('请使用 5 MB 以内的文件。');return;}try{$('#import-text').value=await file.text();previewImport();}catch{toast('文件读取失败，请重新选择。');}});
$('#confirm-import').addEventListener('click',()=>{
  previewImport();if(!importParsed||importParsed.errors.length||!importParsed.draws.length)return;
  const merged=$('#import-mode').value==='append'?[...state.history,...importParsed.draws]:[...importParsed.draws];
  try{assertHistory(merged);}catch(e){toast(e.message);return;}
  state.history=merged;state.sourceName='导入历史';historyLimit=100;$('#import-dialog').close();changed({history:true});toast(`已导入，现有 ${fmt(state.history.length)} 期，最新 ${state.history.at(-1)}。`);
});
$('#backup-button').addEventListener('click',()=>{try{checkState(state);download(JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),`P5_完整备份_截至${state.history.at(-1)||'无历史'}.json`,'application/json');}catch(e){toast(e.message);}});
$('#restore-backup').addEventListener('click',()=>$('#backup-file').click());
$('#backup-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;try{if(file.size>6000000)throw new Error('备份超过 6 MB，无法导入。');const value=checkState(JSON.parse(await file.text()));if(!confirm(`恢复这份备份？将替换当前历史（${value.history.length} 期）、规则和 ${value.schemes.length} 个方案。`))return;state=value;invalidateBacktest();renderRuleControls();run();renderSchemes();toast('备份已恢复，候选已重新计算。');}catch(err){toast(`无法恢复：${err.message}`);}finally{e.target.value='';}
});
$('#select-copy').addEventListener('click',()=>{$('#copy-fallback').focus();$('#copy-fallback').select();});
$('#run-backtest').addEventListener('click',async()=>{
  if(btController)return;try{validateRules(state.rules);}catch(e){toast(e.message);return;}
  btController=new AbortController();const controller=btController;btRevision=revision;
  const rules=clone(state.rules),history=[...state.history],window=Number($('#backtest-window').value);
  $('#run-backtest').disabled=true;$('#backtest-progress').hidden=false;$('#progress-bar').value=0;$('#progress-label').textContent='准备逐期计算…';
  try{const data=await backtest(rules,history,window,({done,total})=>{$('#progress-bar').value=done/total*100;$('#progress-label').textContent=`${done} / ${total} 期`;},controller.signal);if(controller.signal.aborted||btRevision!==revision)throw new Error('规则或历史已变化，回测已取消。');btResult=data;renderBacktest(data);toast(`回测 ${data.rows.length} 期，命中 ${data.hits} 期。`);}catch(err){toast(err.message);}finally{if(btController===controller)btController=null;$('#run-backtest').disabled=false;$('#backtest-progress').hidden=true;}
});
$('#cancel-backtest').addEventListener('click',()=>btController?.abort());
$('#export-backtest').addEventListener('click',()=>{if(!btResult||btRevision!==revision){toast('请先使用当前规则重新回测。');return;}download('\uFEFF历史序号,前四位,候选组数,是否命中\r\n'+btResult.rows.map(r=>`${r.index},"${r.draw}",${r.count},${r.hit?'是':'否'}`).join('\r\n'),`P5_滚动回测_${btResult.rows.length}期.csv`,'text/csv;charset=utf-8');});
window.addEventListener('hashchange',()=>view(location.hash.slice(1)));
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{state=checkState(JSON.parse(e.newValue));invalidateBacktest();renderRuleControls();run({persist:false});renderSchemes();toast('已同步另一个标签页的修改。');}catch{toast('另一个标签页的存档无法读取，请使用备份。');}}});
async function init(){
  let stored=null;
  try{const raw=localStorage.getItem(KEY);if(raw)stored=checkState(JSON.parse(raw));}catch(err){$('#load-error').hidden=false;$('#load-error').textContent=`本地存档无法读取：${err.message} 正在使用内置数据。`;} 
  if(stored){state=stored;$('#save-status').textContent='已读取此设备存档';}
  else{try{const response=await fetch('./history.json');if(!response.ok)throw new Error('HTTP '+response.status);const seed=await response.json();assertHistory(seed.draws);state.history=seed.draws;state.sourceName=seed.sourceName;$('#save-status').textContent='已载入内置历史';}catch(err){$('#load-error').hidden=false;$('#load-error').textContent='内置历史读取失败。你仍可导入 TXT / CSV 使用网站；请先导入历史后再排码。';$('#save-status').textContent='等待导入历史';}}
  ready=true;renderRuleControls();run({persist:!stored});renderSchemes();view(location.hash.slice(1)||'workbench');
}
init();
