const CACHE='everyday-v148-cooking-sessions';
const FILES=["./release-history.js?v=148","./exercise-import-meta.js?v=148","./routine-import-model.js?v=148","./routine-import-ui.js?v=148","./routine-import.css?v=148","./lifting-profile-fixes.css?v=148","./cooking-model.js?v=148","./cooking-ui.js?v=148","./cooking.css?v=148","./food-portion-model.js?v=148","./appearance-model.js?v=148","./","./index.html","./theme.js?v=148","./styles.css?v=148","./appearance-coverage.css?v=148","./appearance-hierarchy.css?v=148","./muscle-levels.css?v=148","./ui-polish.css?v=148","./appearance-text-coverage.css?v=148","./ui-notifications-clipboard.css?v=148","./buddy-undo-guard.css?v=148","./lifting-routines.css?v=148","./weight-checkin.css?v=148","./app.js?v=148","./weight-checkin-model.js?v=148","./calendar-ui.js?v=148","./buddy-set-model.js?v=148","./muscle-map.js?v=148","./muscle-load.js?v=148","./durability.js?v=148","./import-model.js?v=148","./bank-import.js?v=148","./bank-reconcile.js?v=148","./paycheck-model.js?v=148","./classification-model.js?v=148","./account-sections.js?v=148","./account-cloud-store.js?v=148","./account-monthly.js?v=148","./finance-insights-model.js?v=148","./budget-model.js?v=148","./finance-overview-model.js?v=148","./finance-model.js?v=148","./data.js?v=148","./demo-mode.js?v=148","./storage-model.js?v=148","./cloud.js?v=148","./cloud-model.js?v=148","./health-model.js?v=148","./health-cloud.js?v=148","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=148","./icons/e-dot-192.png?v=148","./icons/e-dot-touch.png?v=148"];
// Earlier imports inside unchanged modules still use v145. Cache both token URLs until all transitive modules are re-pinned.
const TRANSITIVE_MODULES=["./release-history.js?v=145","./exercise-import-meta.js?v=145","./routine-import-model.js?v=145","./routine-import-ui.js?v=145","./cooking-model.js?v=145","./cooking-ui.js?v=145","./food-portion-model.js?v=145","./appearance-model.js?v=145","./theme.js?v=145","./weight-checkin-model.js?v=145","./calendar-ui.js?v=145","./buddy-set-model.js?v=145","./muscle-map.js?v=145","./muscle-load.js?v=145","./durability.js?v=145","./import-model.js?v=145","./bank-import.js?v=145","./bank-reconcile.js?v=145","./paycheck-model.js?v=145","./classification-model.js?v=145","./account-sections.js?v=145","./account-cloud-store.js?v=145","./account-monthly.js?v=145","./finance-insights-model.js?v=145","./budget-model.js?v=145","./finance-overview-model.js?v=145","./finance-model.js?v=145","./data.js?v=145","./demo-mode.js?v=145","./storage-model.js?v=145","./cloud.js?v=145","./cloud-model.js?v=145","./health-model.js?v=145","./health-cloud.js?v=145"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...FILES,...TRANSITIVE_MODULES])).then(()=>self.skipWaiting())));
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
