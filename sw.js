const CACHE='everyday-v120-palette-cleanup';
const FILES=["./appearance-model.js?v=116","./","./index.html","./theme.js?v=112","./styles.css?v=120","./appearance-coverage.css?v=120","./app.js?v=120","./calendar-ui.js?v=99.7.4","./buddy-set-model.js?v=103","./muscle-map.js?v=99.7.17","./durability.js?v=112","./import-model.js?v=112","./bank-import.js?v=112","./bank-reconcile.js?v=112","./paycheck-model.js?v=115","./classification-model.js?v=96","./account-sections.js?v=112","./account-cloud-store.js?v=112","./account-monthly.js?v=112","./finance-insights-model.js?v=112","./budget-model.js?v=112","./finance-overview-model.js?v=112","./finance-model.js?v=83","./data.js?v=116","./data.js?v=112","./demo-mode.js?v=112","./storage-model.js?v=112","./cloud.js?v=120","./cloud-model.js?v=112","./health-model.js?v=112","./health-cloud.js?v=112","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=99.7.12","./icons/header-mark.svg","./icons/icon-192.png?v=99.7.12","./icons/icon-512.png?v=99.7.12","./icons/apple-touch-icon.png?v=99.7.12"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('everyday-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    // Online: prefer current HTML. Offline: serve the complete installed release.
    event.respondWith((async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
      try{
        const response=await fetch(request,{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw Error('Navigation unavailable');
        return response;
      }catch{
        return (await caches.match(new URL('./index.html',self.registration.scope).href)) ||
          (await caches.match(new URL('./',self.registration.scope).href)) || Response.error();
      }finally{clearTimeout(timer);}
    })());
    return;
  }
  // version.json is deliberately network-only so it cannot falsely report a cached release.
  const allowed=FILES.some(file=>new URL(file,self.registration.scope).pathname===url.pathname);
  if(!allowed)return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
    return response;
  })));
});
