const CACHE='everyday-v143.1-instant-cached-food';
const FILES=["./exercise-import-meta.js?v=143.1","./routine-import-model.js?v=143.1","./routine-import-ui.js?v=143.1","./routine-import.css?v=143.1","./lifting-profile-fixes.css?v=143.1","./cooking-model.js?v=143.1","./cooking-ui.js?v=143.1","./cooking.css?v=143.1","./food-portion-model.js?v=143.1","./appearance-model.js?v=143.1","./","./index.html","./theme.js?v=143.1","./styles.css?v=143.1","./appearance-coverage.css?v=143.1","./appearance-hierarchy.css?v=143.1","./muscle-levels.css?v=143.1","./ui-polish.css?v=143.1","./appearance-text-coverage.css?v=143.1","./ui-notifications-clipboard.css?v=143.1","./buddy-undo-guard.css?v=143.1","./lifting-routines.css?v=143.1","./weight-checkin.css?v=143.1","./app.js?v=143.1","./weight-checkin-model.js?v=143.1","./calendar-ui.js?v=143.1","./buddy-set-model.js?v=143.1","./muscle-map.js?v=143.1","./muscle-load.js?v=143.1","./durability.js?v=143.1","./import-model.js?v=143.1","./bank-import.js?v=143.1","./bank-reconcile.js?v=143.1","./paycheck-model.js?v=143.1","./classification-model.js?v=143.1","./account-sections.js?v=143.1","./account-cloud-store.js?v=143.1","./account-monthly.js?v=143.1","./finance-insights-model.js?v=143.1","./budget-model.js?v=143.1","./finance-overview-model.js?v=143.1","./finance-model.js?v=143.1","./data.js?v=143.1","./demo-mode.js?v=143.1","./storage-model.js?v=143.1","./cloud.js?v=143.1","./cloud-model.js?v=143.1","./health-model.js?v=143.1","./health-cloud.js?v=143.1","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=143.1","./icons/e-dot-192.png?v=143.1","./icons/e-dot-touch.png?v=143.1"];
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
