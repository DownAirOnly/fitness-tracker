// Prepare release assets for a Capacitor WebView. Not an iOS compiler or signer.
import {readFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const webDir=join(root,'native','www');
const worker=await readFile(join(root,'sw.js'),'utf8');
const value=worker.match(/const FILES=(\[[^\n]+\]);/)?.[1];
if(!value)throw Error('Release asset manifest not found.');
const assets=JSON.parse(value).filter(x=>x!=='./'&&x!=='./sw.js');
assets.push('./version.json');
await rm(webDir,{recursive:true,force:true});await mkdir(webDir,{recursive:true});
for(const asset of [...new Set(assets)]){
 if(!asset.startsWith('./'))throw Error('Invalid asset: '+asset);
 const relative=asset.slice(2).split('?')[0];
 if(!relative||relative.includes('..')||relative.startsWith('/'))throw Error('Invalid path: '+asset);
 const source=resolve(root,relative),destination=resolve(webDir,relative);
 if(!source.startsWith(root+'/')||!destination.startsWith(webDir+'/'))throw Error('Unsafe asset: '+asset);
 await mkdir(dirname(destination),{recursive:true});await copyFile(source,destination);
}
const html=await readFile(join(webDir,'index.html'),'utf8');
if(!html.includes('<head>')||!html.includes('app.js?v='))throw Error('Missing native bundle app entrypoint.');
console.log('Prepared '+[...new Set(assets)].length+' files in native/www. This is not a signed iOS build.');
