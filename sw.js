const CACHE='everyday-v56-offline-exit-guard';
const FILES=['./','./index.html','./theme.js','./styles.css?v=56','./app.js?v=56','./durability.js?v=56','./import-model.js?v=56','./data.js?v=56','./storage-model.js?v=56','./cloud.js?v=56','./cloud-model.js?v=56','./health-model.js?v=56','./health-cloud.js?v=56','./health-shortcut.html','./firebase-config.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('everyday-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const allowed=FILES.some(file=>new URL(file,self.registration.scope).pathname===url.pathname);
  if(!allowed)return;
  event.respondWith(caches.match(event.request).then(cached=>{
    const network=fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
      return response;
    }).catch(()=>cached||Response.error());
    return cached||network;
  }));
});
