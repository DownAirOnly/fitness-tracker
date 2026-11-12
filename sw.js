const CACHE='everyday-v136-v133-food-entry';
const FILES=["./cooking-model.js?v=136","./cooking-ui.js?v=136","./cooking.css?v=136","./food-portion-model.js?v=136","./appearance-model.js?v=136","./","./index.html","./theme.js?v=136","./styles.css?v=136","./appearance-coverage.css?v=136","./appearance-hierarchy.css?v=136","./muscle-levels.css?v=136","./ui-polish.css?v=136","./appearance-text-coverage.css?v=136","./ui-notifications-clipboard.css?v=136","./buddy-undo-guard.css?v=136","./lifting-routines.css?v=136","./weight-checkin.css?v=136","./app.js?v=136","./weight-checkin-model.js?v=136","./calendar-ui.js?v=136","./buddy-set-model.js?v=136","./muscle-map.js?v=136","./muscle-load.js?v=136","./durability.js?v=136","./import-model.js?v=136","./bank-import.js?v=136","./bank-reconcile.js?v=136","./paycheck-model.js?v=136","./classification-model.js?v=136","./account-sections.js?v=136","./account-cloud-store.js?v=136","./account-monthly.js?v=136","./finance-insights-model.js?v=136","./budget-model.js?v=136","./finance-overview-model.js?v=136","./finance-model.js?v=136","./data.js?v=136","./demo-mode.js?v=136","./storage-model.js?v=136","./cloud.js?v=136","./cloud-model.js?v=136","./health-model.js?v=136","./health-cloud.js?v=136","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=136","./icons/e-dot-192.png?v=136","./icons/e-dot-touch.png?v=136"];
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
