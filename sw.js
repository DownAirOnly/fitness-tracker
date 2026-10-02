const CACHE='everyday-v43-offline-json-workspace';
const FILES=['./','./index.html','./theme.js','./styles.css?v=43','./app.js?v=43','./import-model.js?v=43','./data.js?v=43','./storage-model.js?v=43','./cloud.js?v=43','./cloud-model.js?v=43','./health-model.js?v=43','./health-cloud.js?v=43','./health-shortcut.html','./firebase-config.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('everyday-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const allowed=FILES.some(file=>new URL(file,self.registration.scope).pathname===url.pathname);
  if(!allowed)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(r=>r||Response.error())));
});
