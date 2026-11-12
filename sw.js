const CACHE='everyday-v137-safe-workout-import';
const FILES=["./exercise-import-meta.js?v=137","./routine-import-model.js?v=137","./routine-import-ui.js?v=137","./routine-import.css?v=137","./cooking-model.js?v=137","./cooking-ui.js?v=137","./cooking.css?v=137","./food-portion-model.js?v=137","./appearance-model.js?v=137","./","./index.html","./theme.js?v=137","./styles.css?v=137","./appearance-coverage.css?v=137","./appearance-hierarchy.css?v=137","./muscle-levels.css?v=137","./ui-polish.css?v=137","./appearance-text-coverage.css?v=137","./ui-notifications-clipboard.css?v=137","./buddy-undo-guard.css?v=137","./lifting-routines.css?v=137","./weight-checkin.css?v=137","./app.js?v=137","./weight-checkin-model.js?v=137","./calendar-ui.js?v=137","./buddy-set-model.js?v=137","./muscle-map.js?v=137","./muscle-load.js?v=137","./durability.js?v=137","./import-model.js?v=137","./bank-import.js?v=137","./bank-reconcile.js?v=137","./paycheck-model.js?v=137","./classification-model.js?v=137","./account-sections.js?v=137","./account-cloud-store.js?v=137","./account-monthly.js?v=137","./finance-insights-model.js?v=137","./budget-model.js?v=137","./finance-overview-model.js?v=137","./finance-model.js?v=137","./data.js?v=137","./demo-mode.js?v=137","./storage-model.js?v=137","./cloud.js?v=137","./cloud-model.js?v=137","./health-model.js?v=137","./health-cloud.js?v=137","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=137","./icons/e-dot-192.png?v=137","./icons/e-dot-touch.png?v=137"];
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
