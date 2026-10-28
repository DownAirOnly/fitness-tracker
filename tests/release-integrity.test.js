import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');

test('published version, entry assets, registration and offline bundle stay aligned',async()=>{
 const [manifest,index,service,app]=await Promise.all([
  read('version.json'),read('index.html'),read('sw.js'),read('app.js')
 ]);
 const version=JSON.parse(manifest).version;
 assert.match(version,/^v\d+$/);
 const cacheName=service.match(/const CACHE='([^']+)'/)?.[1];
 assert.ok(cacheName?.startsWith('everyday-'+version+'-'),'service-worker cache belongs to release '+version);
 assert.ok(index.includes('styles.css?v='+version),'HTML loads release stylesheet');
 assert.ok(index.includes('app.js?v='+version),'HTML loads release JS');
 assert.ok(service.includes('"./styles.css?v='+version+'"'),'offline stylesheet matches HTML');
 assert.ok(service.includes('"./app.js?v='+version+'"'),'offline app matches HTML');
 assert.ok(app.includes("register('./sw.js?v="+version+"'"),'app registers the release service worker');
 // Module imports are pinned to asset revisions. Ensure the corresponding
 // exact URLs are included for offline Home Screen use.
 for(const [,file,revision]of app.matchAll(/from ['"]\.\/([^'"/]+\.js)\?v=(\d+)['"]/g)){
  assert.ok(service.includes('"./'+file+'?v='+revision+'"'),'service worker must precache '+file+'?v='+revision);
 }
 assert.ok(!/maximum-scale\s*=|user-scalable\s*=\s*no/i.test(index),'manual zoom remains enabled');
});
