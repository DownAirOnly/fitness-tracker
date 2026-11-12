const CACHE='everyday-v134-food-portions';
const FILES=["./food-portion-model.js?v=134","./appearance-model.js?v=134","./","./index.html","./theme.js?v=134","./styles.css?v=134","./appearance-coverage.css?v=134","./appearance-hierarchy.css?v=134","./muscle-levels.css?v=134","./ui-polish.css?v=134","./appearance-text-coverage.css?v=134","./ui-notifications-clipboard.css?v=134","./buddy-undo-guard.css?v=134","./lifting-routines.css?v=134","./weight-checkin.css?v=134","./app.js?v=134","./weight-checkin-model.js?v=134","./calendar-ui.js?v=134","./buddy-set-model.js?v=134","./muscle-map.js?v=134","./muscle-load.js?v=134","./durability.js?v=134","./import-model.js?v=134","./bank-import.js?v=134","./bank-reconcile.js?v=134","./paycheck-model.js?v=134","./classification-model.js?v=134","./account-sections.js?v=134","./account-cloud-store.js?v=134","./account-monthly.js?v=134","./finance-insights-model.js?v=134","./budget-model.js?v=134","./finance-overview-model.js?v=134","./finance-model.js?v=134","./data.js?v=134","./demo-mode.js?v=134","./storage-model.js?v=134","./cloud.js?v=134","./cloud-model.js?v=134","./health-model.js?v=134","./health-cloud.js?v=134","./health-shortcut.html","./firebase-config.js","./manifest.webmanifest","./icons/icon.svg?v=134","./icons/e-dot-192.png?v=134","./icons/e-dot-touch.png?v=134"];
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
