// AI HUB PWA: cache only own-origin static pages. Never cache Supabase user data.
const CACHE = 'ai-hub-v3';
const STATIC = ['./','./index.html','./account.html','./admin.html','./manifest.webmanifest','./icon.svg','./cloud.js','./config.js'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith('ai-hub-')&&key!==CACHE).map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return; // Never intercept Auth/API/CDN responses
  if(!STATIC.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
  e.respondWith(fetch(e.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
    return response;
  }).catch(()=>caches.match(e.request)));
});
