/* 观数知微运营后台：GitHub-authorized tasks, notices & version metadata.
   No credentials are embedded or stored. All writes need a GitHub token
   with scoped Contents: Read and write permission on this repository. */
(function(){
'use strict';
const API='https://api.github.com/repos/tangjianming313-ops/pl5/contents/ops.json';
const $=id=>document.getElementById(id);
let feed={schema:1,tasks:[],announcements:[],release:{version:'',versionCode:0,title:'',notes:'',apkUrl:'',publishedAt:'',required:false}},sha='',busy=false;
function status(msg,error=false){const el=$('opsAdminStatus');if(el){el.textContent=msg;el.style.color=error?'#b13f43':'#236D57'}}
function safeUrl(raw){if(!raw)return '';try{const u=new URL(raw);if(u.protocol!=='https:')throw Error();return u.href}catch{throw Error('链接必须使用 https://')}}
function localIso(value){if(!value)return '';const d=new Date(value);if(!Number.isFinite(d.getTime()))throw Error('时间格式不正确');return d.toISOString()}
function encode(str){const arr=new TextEncoder().encode(str);let bytes='';for(const b of arr)bytes+=String.fromCharCode(b);return btoa(bytes)}
function decode(str){const bytes=Uint8Array.from(atob(str.replace(/\s/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function clean(data){
 if(!data||typeof data!=='object')throw Error('运营数据格式异常');
 return {schema:1,updatedAt:String(data.updatedAt||''),tasks:Array.isArray(data.tasks)?data.tasks:[],announcements:Array.isArray(data.announcements)?data.announcements:[],release:data.release&&typeof data.release==='object'?data.release:{version:'',versionCode:0,title:'',notes:'',apkUrl:'',publishedAt:'',required:false}};
}
async function github(method,body){
 const token=$('token').value.trim();
 if(!token)throw Error('请先在上方输入 GitHub 访问令牌');
 const response=await fetch(API,{method,cache:'no-store',headers:{
 'Accept':'application/vnd.github+json',
 'X-GitHub-Api-Version':'2022-11-28','Authorization':'Bearer '+token,
 ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(response.status===404&&method==='GET')return null;
 const data=await response.json();
 if(!response.ok)throw Error((data.message||'HTTP '+response.status)+'；请检查令牌权限与仓库状态');
 return data;
}
async function load(){
 const data=await github('GET');
 if(data){sha=data.sha;feed=clean(JSON.parse(decode(data.content)))}else{sha='';feed=clean(feed)}
 render();
}
async function mutate(action,message){
 if(busy)return;busy=true;status('正在发布到 GitHub…');
 try{
  await load(); // refresh blob SHA and prevent overwriting someone else's changes
  action(feed);
  feed.updatedAt=new Date().toISOString();
  const body={message:'Manage 观数知微: '+message,branch:'main',content:encode(JSON.stringify(feed,null,2)+'\n'),...(sha?{sha}:{})};
  const result=await github('PUT',body);
  sha=result.content.sha;
  render();
  status('发布成功。网站与安卓软件会在下次加载运营数据时看到更改。');
 }catch(e){status('操作失败：'+e.message,true)}finally{busy=false}
}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e}
function button(text,callback,color){
 const b=el('button',text,color?'secondary':'');b.type='button';b.onclick=callback;return b;
}
function renderList(which){
 const node=$(which==='tasks'?'opsAdminTasks':'opsAdminNotices');if(!node)return;node.replaceChildren();
 const list=feed[which].slice().reverse();
 if(!list.length){node.append(el('p','暂无记录','hint'));return}
 for(const item of list){
  const card=el('div',undefined,'admin-item');
  const title=el('strong',item.title||'未命名');
  const label=el('small',item.enabled===false?'（已停用）':'（正在发布）');
  card.append(title,label);
  if(item.description||item.message)card.append(el('p',String(item.description||item.message).slice(0,150),'hint'));
  const actions=el('div',undefined,'row');
  actions.append(button(item.enabled===false?'重新启用':'停用',()=>mutate(d=>{
    const entry=d[which].find(x=>x.id===item.id);if(entry)entry.enabled=entry.enabled===false;
  },'toggle '+which),true));
  actions.append(button('删除',()=>{
    if(!confirm('确定删除「'+(item.title||'未命名')+'」？'))return;
    mutate(d=>{d[which]=d[which].filter(x=>x.id!==item.id)},'delete '+which);
  },true));
  card.append(actions);node.append(card);
 }
}
function render(){
 renderList('tasks');renderList('announcements');
 const r=feed.release||{};
 if($('publishedRelease'))$('publishedRelease').textContent=r.version?('当前版本：v'+r.version+(r.apkUrl?'（有安装链接）':'（仅版本说明）')):'尚未发布新版本';
 if($('releaseVersion'))$('releaseVersion').value=r.version||'';
 if($('releaseCode'))$('releaseCode').value=r.versionCode||'';
 if($('releaseTitle'))$('releaseTitle').value=r.title||'';
 if($('releaseNotes'))$('releaseNotes').value=r.notes||'';
 if($('releaseApkUrl'))$('releaseApkUrl').value=r.apkUrl||'';
 if($('releaseRequired'))$('releaseRequired').checked=!!r.required;
}
function makeId(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)}
function taskFromForm(){
 const title=$('taskTitle').value.trim(),description=$('taskDescription').value.trim();
 if(!title)throw Error('任务标题不能为空');
 return {id:makeId('task'),title:title.slice(0,100),description:description.slice(0,2000),category:$('taskCategory').value.trim().slice(0,30),priority:$('taskPriority').value,deadline:localIso($('taskDeadline').value),linkUrl:safeUrl($('taskLink').value.trim()),enabled:true,publishedAt:new Date().toISOString()};
}
function noticeFromForm(){
 const title=$('noticeTitle').value.trim(),message=$('noticeMessage').value.trim();
 if(!title||!message)throw Error('公告标题和正文不能为空');
 return {id:makeId('notice'),title:title.slice(0,100),message:message.slice(0,3000),linkUrl:safeUrl($('noticeLink').value.trim()),enabled:true,publishedAt:new Date().toISOString()};
}
function releaseFromForm(){
 const version=$('releaseVersion').value.trim(),code=Number($('releaseCode').value),title=$('releaseTitle').value.trim(),notes=$('releaseNotes').value.trim();
 if(!/^\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9.-]+)?$/.test(version))throw Error('版本号格式示例：1.1.0');
 if(!Number.isInteger(code)||code<1)throw Error('版本代码应为正整数');
 return {version,versionCode:code,title:title.slice(0,100)||'观数知微版本更新',notes:notes.slice(0,3000),apkUrl:safeUrl($('releaseApkUrl').value.trim()),required:$('releaseRequired').checked,publishedAt:new Date().toISOString()};
}
function bind(){
 $('opsLoad').onclick=async()=>{try{status('正在读取运营数据…');await load();status('已获取最新运营数据。')}catch(e){status('读取失败：'+e.message,true)}};
 $('taskPublish').onclick=()=>{try{const item=taskFromForm();mutate(d=>{d.tasks.push(item);if(d.tasks.length>200)d.tasks=d.tasks.slice(-200)},'publish task').then(()=>{
   if(item.title&&$('opsAdminTasks').textContent.includes(item.title)){$('taskTitle').value='';$('taskDescription').value=''}
 })}catch(e){status(e.message,true)}};
 $('noticePublish').onclick=()=>{try{const item=noticeFromForm();mutate(d=>{d.announcements.push(item);if(d.announcements.length>100)d.announcements=d.announcements.slice(-100)},'publish notice')}catch(e){status(e.message,true)}};
 $('releasePublish').onclick=()=>{try{const version=releaseFromForm();if(!version.apkUrl&&!confirm('未填写 APK 下载地址。本次将只发布版本说明，不能直接升级安装包。继续吗？'))return;mutate(d=>{d.release=version},'publish release '+version.version)}catch(e){status(e.message,true)}};
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
