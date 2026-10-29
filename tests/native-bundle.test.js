import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('native release webDir can be prepared without altering the PWA',async()=>{
 execFileSync(process.execPath,['scripts/prepare-native.mjs'],{cwd:root,stdio:'pipe'});
 const [worker,bundle,html,version,config]=await Promise.all([
  readFile(join(root,'sw.js'),'utf8'),readFile(join(root,'native','www','app.js'),'utf8'),
  readFile(join(root,'native','www','index.html'),'utf8'),
  readFile(join(root,'native','www','version.json'),'utf8'),
  readFile(join(root,'native','capacitor.config.json'),'utf8')
 ]);
 assert.equal(JSON.parse(version).version,JSON.parse(await readFile(join(root,'version.json'),'utf8')).version);
 assert.equal(JSON.parse(config).webDir,'www');
 assert.ok(worker.includes('budget-model.js?v=98'),'offline PWA includes the budget model');
 assert.ok(bundle.includes("!globalThis.Capacitor?.isNativePlatform?.()"),'native skips PWA worker registration');
 assert.ok(html.includes('app.js?v=98'));
 assert.ok((await stat(join(root,'native','www','budget-model.js'))).isFile());
 assert.ok((await stat(join(root,'native','www','firebase-config.js'))).isFile());
});
