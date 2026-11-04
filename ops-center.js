/* 观数知微 · 任务 / 公告 / 版本中心 (public read-only client).
   Administrators publish ops.json with GitHub authorization.
   Local completion markers are device-only, not administrator reports. */
(function(){
'use strict';
const FEED='./ops.json', STORAGE='gszw_tasks_completed_v1';
const $=id=>document.getElementById(id);
let current=null;
function element(tag,className,text){
 const node=document.createElement(tag);if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);return node;
}
function isoDate(value){if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d:null}
function when(value){const d=isoDate(value);return d?d.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):''}
function active(item){
 if(item.enabled===false)return false;
 const now=Date.now(),start=isoDate(item.startsAt||item.publishedAt),end=isoDate(item.expiresAt);
 return (!start||now>=start.getTime())&&(!end||now<=end.getTime());
}
function url(value){
 if(typeof value!=='string'||!value.trim())return '';
 try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}
}
function visited(){
 try{const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');return new Set(Array.isArray(data)?data.filter(s=>typeof s==='string').slice(-500):[])}catch{return new Set()}
}
function saveDone(done){
 try{localStorage.setItem(STORAGE,JSON.stringify([...done].slice(-500)))}catch(_){}
}
function showTask(task,done){
 const item=element('article','ops-item');
 const head=element('div','ops-item-head'),title=element('strong','ops-item-title',task.title||'未命名任务');
 const pill=element('span','ops-task-pill'+(done.has(task.id)?' is-done':''),done.has(task.id)?'本机已完成':'待办理');
 head.append(title,pill);item.append(head);
 if(task.description)item.append(element('p','ops-item-copy',String(task.description).slice(0,2000)));
 const meta=element('div','ops-item-meta');
 if(task.deadline)meta.append(element('span','', '截止：'+when(task.deadline)));
 if(task.category)meta.append(element('span','', String(task.category).slice(0,30)));
 if(task.priority==='high')meta.append(element('span','ops-priority','重点任务'));
 if(meta.childNodes.length)item.append(meta);
 const actions=element('div','ops-item-actions');
 const complete=element('button','ops-small-button '+(done.has(task.id)?'secondary':''),done.has(task.id)?'标记为未完成':'标记完成');
 complete.type='button';complete.onclick=()=>{
  const set=visited();if(set.has(task.id))set.delete(task.id);else set.add(task.id);saveDone(set);renderTasks(current);
 };
 actions.append(complete);
 const href=url(task.linkUrl);if(href){const a=element('a','ops-small-link','查看任务详情');a.href=href;a.target='_blank';a.rel='noopener noreferrer';actions.append(a)}
 item.append(actions);
 return item;
}
function renderTasks(data){
 const out=$('opsTasks'),counter=$('opsTaskTotal');
 if(!out)return;
 out.replaceChildren();
 const all=Array.isArray(data?.tasks)?data.tasks:[];
 const rows=all.filter(x=>x&&typeof x==='object'&&active(x)).slice(0,100);
 rows.sort((a,b)=>(a.priority==='high'?-1:0)-(b.priority==='high'?-1:0));
 if(counter)counter.textContent=String(rows.length);
 if(!rows.length){out.append(element('p','ops-empty','当前暂无已发布任务。'));return}
 const done=visited();
 for(const task of rows)out.append(showTask(task,done));
}
function renderAnnouncements(data){
 const out=$('opsAnnouncements'),preview=$('opsNoticeSummary');
 if(!out)return;
 out.replaceChildren();
 const all=Array.isArray(data?.announcements)?data.announcements:[];
 const rows=all.filter(x=>x&&typeof x==='object'&&active(x)).slice().reverse().slice(0,30);
 if(!rows.length){out.append(element('p','ops-empty','当前暂无平台公告。'));if(preview)preview.hidden=true;return}
 if(preview){
  preview.hidden=false;preview.replaceChildren();
  const top=rows[0];
  const bar=element('div','ops-notice-inner');
  const copy=element('div','ops-notice-text');
  copy.append(element('span','ops-overline','PLATFORM NOTICE · 平台公告'));
  copy.append(element('strong','',String(top.title||'平台公告').slice(0,100)));
  if(top.message)copy.append(element('p','',String(top.message).slice(0,160)));
  bar.append(copy);const btn=element('button','ops-notice-link','查看公告');
  btn.type='button';btn.setAttribute('data-go','tasks');
  btn.onclick=()=>{const nav=document.querySelector('main nav button[data-tab="tasks"]');if(nav)nav.click()};
  bar.append(btn);preview.append(bar);
 }
 for(const notice of rows){
  const card=element('article','ops-item');
  const heading=element('div','ops-item-head');
  heading.append(element('strong','ops-item-title',String(notice.title||'平台公告').slice(0,100)));
  if(notice.publishedAt)heading.append(element('span','ops-time',when(notice.publishedAt)));
  card.append(heading);
  if(notice.message)card.append(element('p','ops-item-copy',String(notice.message).slice(0,3000)));
  const href=url(notice.linkUrl);if(href){const link=element('a','ops-small-link','查看详情');link.href=href;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
  out.append(card);
 }
}
function versionCompare(a,b){
 const x=String(a||'0').split('.').map(v=>parseInt(v,10)||0),y=String(b||'0').split('.').map(v=>parseInt(v,10)||0);
 for(let i=0;i<Math.max(x.length,y.length);i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)-(y[i]||0)}
 return 0;
}
function renderRelease(data){
 const root=$('opsRelease');if(!root)return;root.replaceChildren();
 const r=data?.release;
 if(!r||typeof r!=='object'||!r.version){
  root.append(element('p','ops-empty','尚未发布新版安装包或版本公告。'));return;
 }
 const box=element('div','ops-release');
 const head=element('div','ops-item-head');
 head.append(element('strong','ops-item-title',String(r.title||'观数知微版本更新').slice(0,100)));
 head.append(element('span','ops-version','v'+String(r.version).slice(0,30)));
 box.append(head);
 if(r.notes)box.append(element('p','ops-item-copy',String(r.notes).slice(0,3000)));
 if(r.publishedAt)box.append(element('div','ops-item-meta','发布日期：'+when(r.publishedAt)));
 const params=new URLSearchParams(location.search);
 const native=params.get('app')==='android',installed=native?params.get('version')||'':'';
 if(native&&installed){
  if(versionCompare(r.version,installed)>0){
   const msg=element('div','ops-update-hint',r.required?'此版本标记为重要更新，请按提示安装。':'当前软件有新版本可供查看。');
   box.append(msg);
  }else box.append(element('div','ops-item-meta','当前安装版本：v'+installed));
 }
 const link=url(r.apkUrl);
 if(link){
  const button=element('a','ops-download','查看安卓安装包');
  button.href=link;button.target='_blank';button.rel='noopener noreferrer';
  box.append(button);
  box.append(element('p','ops-footnote','安卓升级需要下载并安装签名一致的新APK；网站内容更新通常无需重新安装软件。'));
 }else box.append(element('p','ops-footnote','目前发布的是版本说明，尚未提供可验证的APK安装链接。'));
 root.append(box);
}
function display(data,stale){
 current=data;renderTasks(data);renderAnnouncements(data);renderRelease(data);
 const status=$('opsStatus');
 if(status)status.textContent=(stale?'当前展示离线缓存，可能不是最新发布内容。':'已同步平台任务与公告。')+
   (data.updatedAt?' 最近发布：'+when(data.updatedAt):'');
}
async function refresh(){
 const status=$('opsStatus');if(status)status.textContent='正在同步平台运营数据…';
 try{
  const response=await fetch(FEED+'?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!data||data.schema!==1||!Array.isArray(data.tasks)||!Array.isArray(data.announcements))throw Error('数据格式不正确');
  display(data,false);
  try{localStorage.setItem('gszw_public_ops_cache_v1',JSON.stringify(data))}catch(_){}
 }catch(e){
  try{const cached=JSON.parse(localStorage.getItem('gszw_public_ops_cache_v1')||'null');if(cached&&cached.schema===1){display(cached,true);return}}catch(_){}
  if(status)status.textContent='运营数据暂时无法加载：'+e.message;
  for(const id of ['opsTasks','opsAnnouncements','opsRelease']){
   const node=$(id);if(node)node.replaceChildren(element('p','ops-empty','无法加载，请检查网络并刷新。'));
  }
 }
}
function boot(){
 const btn=$('opsRefresh');if(btn)btn.onclick=refresh;
 refresh();
 setInterval(refresh,300000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
