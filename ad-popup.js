(()=>{'use strict';
const DATA='./ads.json',KEY='laizong_ad_seen_v1';
function validUrl(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}}
function build(ad){
 const overlay=document.createElement('div');overlay.id='siteAdOverlay';overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#07182bba;display:flex;align-items:center;justify-content:center;padding:18px';
 const card=document.createElement('div');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','站内公告');card.style.cssText='position:relative;width:min(94vw,420px);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:22px;color:#163c63;box-shadow:0 25px 90px #001b4b66;text-align:center;font-family:system-ui,sans-serif';
 const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','关闭弹窗');close.style.cssText='position:absolute;right:10px;top:7px;border:0;background:#edf3f9;border-radius:50%;width:36px;height:36px;font-size:24px;color:#31577a;cursor:pointer';
 const title=document.createElement('h2');title.textContent=String(ad.title||'站内公告').slice(0,80);title.style.cssText='font-size:22px;margin:16px 26px 12px;line-height:1.4';
 const desc=document.createElement('p');desc.textContent=String(ad.message||'').slice(0,800);desc.style.cssText='white-space:pre-wrap;line-height:1.7;font-size:15px;color:#52718b';
 card.append(close);
 const image=validUrl(ad.imageUrl||'');if(image){const img=document.createElement('img');img.src=image;img.alt='公告图片';img.style.cssText='max-width:100%;max-height:300px;object-fit:contain;border-radius:12px';img.onerror=()=>img.remove();card.append(img)}
 card.append(title,desc);
 const link=validUrl(ad.linkUrl||'');if(link){const a=document.createElement('a');a.textContent=String(ad.buttonText||'查看详情').slice(0,30);a.href=link;a.target='_blank';a.rel='noopener noreferrer sponsored';a.style.cssText='display:block;background:#087be1;color:white;border-radius:12px;padding:13px;margin-top:15px;text-decoration:none;font-weight:700';card.append(a)}
 const dismiss=()=>{overlay.remove();try{sessionStorage.setItem(KEY,String(ad.id||'default'))}catch{}};
 close.onclick=dismiss;overlay.onclick=e=>{if(e.target===overlay)dismiss()};const onKey=e=>{if(e.key==='Escape'){dismiss();document.removeEventListener('keydown',onKey)}};document.addEventListener('keydown',onKey);
 overlay.append(card);document.body.append(overlay);close.focus();
}
async function load(){
 try{const res=await fetch(DATA+'?t='+Date.now(),{cache:'no-store'});if(!res.ok)return;const ad=await res.json();if(!ad||ad.enabled!==true)return;
 const now=Date.now(),start=Date.parse(ad.startAt||''),end=Date.parse(ad.endAt||'');
 if(Number.isFinite(start)&&now<start||Number.isFinite(end)&&now>end)return;
 if(ad.frequency!=='always'){try{if(sessionStorage.getItem(KEY)===String(ad.id||'default'))return}catch{}}
 build(ad);
 }catch(e){console.warn('公告加载失败',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
