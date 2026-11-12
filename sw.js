const CACHE='everyday-v138-lifting-profile-targets';
const FILES=["./exercise-import-meta.js?v=138","./routine-import-model.js?v=138","./routine-import-ui.js?v=138","./routine-import.css?v=138","./lifting-profile-fixes.css?v=138","./cooking-model.js?v=138","./cooking-ui.js?v=138","./cooking.css?v=138","./food-portion-model.js?v=138","./appearance-model.js?v=138","./","./index.html","./theme.js?v=138","./styles.css?v=138","./appearance-coverage.css?v=138","./appearance-hierarchy.css?v=138","./muscle-levels.css?v=138","./ui-polish.css?v=138","./appearance-text-coverage.css?v=138","./ui-notifications-clipboard.css?v=138","./buddy-undo-guard.css?v=138","./lifting-routines.css?v=138","./weight-checkin.css?v=138","./app.js?v=138","./weight-checkin-model.js?v=138","./calendar-ui.js?v=138","./buddy-set-model.js?v=138","./muscle-map.js?v=138","./muscle-load.js?v=138","./durability.js?v=138","./import-model.js?v=138","./bank-import.js?v=138","./bank-reconcile.js?v=138","./paycheck-model.js?v=138","./classification-model.js?v=138","./account-sections.js?v=138","./account-cloud-store.js?v=138","./account-monthly.js?v=138","./finance-insights-model.js?v=138","./budget-model.js?v=138","./finance-overview-model.js?v=138","./finance-model.js?v=138","./data.js?v=138","./demo-mode.js?v=138","./storage-model.js?v=138","./cloud.js?v=138","./cloud-model.js?v=138","./health-model.js?v=138","./health-cloud.js?v=138","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=138","./icons/e-dot-192.png?v=138","./icons/e-dot-touch.png?v=138"];
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
