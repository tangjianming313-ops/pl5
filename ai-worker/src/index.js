const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,"0")).join("");
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("");
export default {async fetch(req,env){
const origin=req.headers.get("Origin");
if(req.method==="OPTIONS")return new Response(null,{headers:{"Access-Control-Allow-Origin":env.ALLOWED_ORIGIN,"Access-Control-Allow-Headers":"Content-Type,Authorization","Access-Control-Allow-Methods":"POST,OPTIONS"}});
if(origin!==env.ALLOWED_ORIGIN)return json({error:"Forbidden"},403);
const respond=(data,status=200)=>{const r=json(data,status);r.headers.set("Access-Control-Allow-Origin",env.ALLOWED_ORIGIN);return r};
if(req.method!=="POST")return respond({error:"Method not allowed"},405);
try{
const path=new URL(req.url).pathname;
if(path==="/activate"){
const body=await req.json();if(typeof body.code!=="string"||!/^[a-zA-Z0-9-]{16,80}$/.test(body.code))return respond({error:"邀请码格式错误"},400);
const ip=req.headers.get("CF-Connecting-IP")||"unknown",minute=new Date().toISOString().slice(0,16);
const fingerprint=await hash(ip+env.INVITE_PEPPER);
await env.DB.prepare("INSERT INTO failed_attempts(fingerprint,minute,attempts) VALUES(?,?,1) ON CONFLICT(fingerprint,minute) DO UPDATE SET attempts=attempts+1").bind(fingerprint,minute).run();
const attempts=await env.DB.prepare("SELECT attempts FROM failed_attempts WHERE fingerprint=? AND minute=?").bind(fingerprint,minute).first();
if(attempts.attempts>6)return respond({error:"尝试次数过多，请稍后再试"},429);
const session=token(),codeHash=await hash(env.INVITE_PEPPER+":"+body.code);
const updated=await env.DB.prepare("UPDATE invites SET redeemed_at=CURRENT_TIMESTAMP,session_hash=? WHERE code_hash=? AND redeemed_at IS NULL").bind(await hash(session),codeHash).run();
if(updated.meta.changes!==1)return respond({error:"邀请码无效或已使用"},403);
return respond({token:session,limit:30});
}
const auth=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get("Authorization")||"");
if(!auth)return respond({error:"请先激活邀请码"},401);
const user=await env.DB.prepare("SELECT id FROM invites WHERE session_hash=?").bind(await hash(auth[1])).first();
if(!user)return respond({error:"授权已失效"},401);
const day=today();
if(path==="/quota"){
const row=await env.DB.prepare("SELECT used FROM daily_usage WHERE invite_id=? AND day=?").bind(user.id,day).first();
return respond({used:row?.used||0,remaining:30-(row?.used||0),day});
}
if(path!=="/chat")return respond({error:"Not found"},404);
const body=await req.json();
if(typeof body.message!=="string"||body.message.length<1||body.message.length>1200)return respond({error:"问题长度需为1至1200字"},400);
if(!env.OPENAI_API_KEY)return respond({error:"AI服务尚未配置"},503);
const reserved=await env.DB.prepare("INSERT INTO daily_usage(invite_id,day,used) VALUES(?,?,1) ON CONFLICT(invite_id,day) DO UPDATE SET used=used+1 WHERE used<30").bind(user.id,day).run();
if(reserved.meta.changes!==1)return respond({error:"今日额度已用完",remaining:0},429);
try{
const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.MODEL||"gpt-4.1-mini",max_tokens:600,messages:[{role:"system",content:"你是广东来总AI排码的中文数据助手。客观解释规则与统计，不编造历史数据，不承诺预测中奖或盈利。不要询问邀请码或密钥。"},{"role":"user",content:body.message}]})});
if(!r.ok)throw Error("upstream");
const data=await r.json();const answer=data.choices?.[0]?.message?.content;
if(!answer)throw Error("empty");
const row=await env.DB.prepare("SELECT used FROM daily_usage WHERE invite_id=? AND day=?").bind(user.id,day).first();
return respond({answer,remaining:30-row.used,day});
}catch(e){
await env.DB.prepare("UPDATE daily_usage SET used=MAX(used-1,0) WHERE invite_id=? AND day=?").bind(user.id,day).run();
return respond({error:"AI暂时不可用，本次未扣额度"},502);
}
}catch(e){return respond({error:"请求失败，请稍后重试"},400);}
}};
