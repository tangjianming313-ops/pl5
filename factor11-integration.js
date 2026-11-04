/* Additive 11-factor rule manager for the existing 广东来总排码 site.
   Score all available history with the original 11 factors, keep top nine
   per position, exclude the four lowest-scored digits as a separate rule.
   Worker runs off the UI thread; historical prefixes are cached for tests. */
(function(global){
"use strict";
let signature="",token=0,cache=new Map(),pendingBatch=null,error="",workers=new Set();
function fingerprint(h){return h.length+"|"+h.slice(0,3).join("/")+"|"+h.slice(-9).join("/")}
function workerJob(input,progress){
 return new Promise((resolve,reject)=>{
  let w,finished=false;
  try{w=new Worker("./factor11-worker.js?v=4")}catch(e){reject(e);return}
  workers.add(w);
  function finish(){if(finished)return;finished=true;workers.delete(w);w.terminate()}
  w.onmessage=e=>{const msg=e.data||{};if(msg.progress){if(progress)progress(msg);return}
    finish();if(msg.ok)resolve(msg);else reject(Error(msg.error||"11因子计算失败"))};
  w.onerror=()=>{finish();reject(Error("11因子计算模块无法运行，请刷新网站或使用正常浏览器"))};
  try{w.postMessage(input)}catch(e){finish();reject(e)}
 });
}
function restart(history,callback){
 const key=fingerprint(history);
 if(key===signature)return;
 signature=key;const run=++token;error="";pendingBatch=null;cache.clear();
 for(const w of workers)w.terminate();workers.clear();
 const snapshot=history.slice();
 workerJob({history:snapshot,counts:[9,9,9,9]}).then(data=>{
  if(run!==token)return;
  const row=data.result.positions.map(p=>p.excluded.join(""));
  if(row.length!==4||row.some(d=>!/^[0-9]$/.test(d)))throw Error("11因子输出格式无效");
  cache.set(snapshot.length,row);
  if(callback)callback();
 }).catch(e=>{if(run!==token)return;error=String(e.message||e);if(callback)callback()});
}
async function prepare(history,amount=200,onProgress){
 if(!cache.has(history.length))throw Error("动态11因子尚未完成最新期计算");
 const end=history.length,n=Math.max(1,Math.min(200,Math.floor(amount)));
 let complete=true;
 for(let k=end-n;k<end;k++)if(!cache.has(k)){complete=false;break}
 if(complete)return;
 if(pendingBatch)return pendingBatch;
 const run=token,snapshot=history.slice();
 const promise=workerJob({history:snapshot,mode:"batch",amount:200},onProgress).then(data=>{
  if(run!==token)throw Error("历史数据已变化，请重新运行");
  for(const row of data.results){
   if(row.length<1010||row.length>end||!Array.isArray(row.exclude)||row.exclude.length!==4||row.exclude.some(d=>!/^[0-9]$/.test(d)))throw Error("历史11因子结果校验失败");
   cache.set(row.length,row.exclude);
  }
  for(let k=end-n;k<end;k++)if(!cache.has(k))throw Error("历史11因子未完整计算");
 });
 pendingBatch=promise;
 try{await promise}finally{if(pendingBatch===promise)pendingBatch=null}
}
global.Factor11={
 ensureLatest:restart,
 ready:history=>cache.has(history.length),
 get:length=>cache.get(length)||null,
 error:()=>error,
 prepare,
 retry:()=>{signature=""},
 cancel:()=>{signature="";token++;cache.clear();for(const w of workers)w.terminate();workers.clear()}
};
})(window);
