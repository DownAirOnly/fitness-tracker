const CACHE='everyday-v141-instant-cached-food';
const FILES=["./exercise-import-meta.js?v=141","./routine-import-model.js?v=141","./routine-import-ui.js?v=141","./routine-import.css?v=141","./lifting-profile-fixes.css?v=141","./cooking-model.js?v=141","./cooking-ui.js?v=141","./cooking.css?v=141","./food-portion-model.js?v=141","./appearance-model.js?v=141","./","./index.html","./theme.js?v=141","./styles.css?v=141","./appearance-coverage.css?v=141","./appearance-hierarchy.css?v=141","./muscle-levels.css?v=141","./ui-polish.css?v=141","./appearance-text-coverage.css?v=141","./ui-notifications-clipboard.css?v=141","./buddy-undo-guard.css?v=141","./lifting-routines.css?v=141","./weight-checkin.css?v=141","./app.js?v=141","./weight-checkin-model.js?v=141","./calendar-ui.js?v=141","./buddy-set-model.js?v=141","./muscle-map.js?v=141","./muscle-load.js?v=141","./durability.js?v=141","./import-model.js?v=141","./bank-import.js?v=141","./bank-reconcile.js?v=141","./paycheck-model.js?v=141","./classification-model.js?v=141","./account-sections.js?v=141","./account-cloud-store.js?v=141","./account-monthly.js?v=141","./finance-insights-model.js?v=141","./budget-model.js?v=141","./finance-overview-model.js?v=141","./finance-model.js?v=141","./data.js?v=141","./demo-mode.js?v=141","./storage-model.js?v=141","./cloud.js?v=141","./cloud-model.js?v=141","./health-model.js?v=141","./health-cloud.js?v=141","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=141","./icons/e-dot-192.png?v=141","./icons/e-dot-touch.png?v=141"];
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
