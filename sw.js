const CACHE='everyday-v135-cooking-recipes';
const FILES=["./cooking-model.js?v=135","./cooking-ui.js?v=135","./cooking.css?v=135","./food-portion-model.js?v=135","./appearance-model.js?v=135","./","./index.html","./theme.js?v=135","./styles.css?v=135","./appearance-coverage.css?v=135","./appearance-hierarchy.css?v=135","./muscle-levels.css?v=135","./ui-polish.css?v=135","./appearance-text-coverage.css?v=135","./ui-notifications-clipboard.css?v=135","./buddy-undo-guard.css?v=135","./lifting-routines.css?v=135","./weight-checkin.css?v=135","./app.js?v=135","./weight-checkin-model.js?v=135","./calendar-ui.js?v=135","./buddy-set-model.js?v=135","./muscle-map.js?v=135","./muscle-load.js?v=135","./durability.js?v=135","./import-model.js?v=135","./bank-import.js?v=135","./bank-reconcile.js?v=135","./paycheck-model.js?v=135","./classification-model.js?v=135","./account-sections.js?v=135","./account-cloud-store.js?v=135","./account-monthly.js?v=135","./finance-insights-model.js?v=135","./budget-model.js?v=135","./finance-overview-model.js?v=135","./finance-model.js?v=135","./data.js?v=135","./demo-mode.js?v=135","./storage-model.js?v=135","./cloud.js?v=135","./cloud-model.js?v=135","./health-model.js?v=135","./health-cloud.js?v=135","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=135","./icons/e-dot-192.png?v=135","./icons/e-dot-touch.png?v=135"];
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
