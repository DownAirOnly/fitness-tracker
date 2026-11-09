#!/usr/bin/env node
/* Everyday stylesheet audit: find literal green values that can survive into
   palettes other than Enchanted Forest. This is a SOURCE audit, not a browser
   computed-style proof. Review neutral findings before adding a rule; semantic
   colors (income, anatomy, effort, routine identity) are intentionally retained.
   Usage: node scripts/theme-green-audit.mjs [--json]
*/
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const files=(await readdir(root)).filter(name=>name.endsWith('.css')).sort();
const darkPattern=/data-theme\s*=\s*["']dark|:root\[data-theme/;
const semantic=/\b(?:finance|money|income|expense|error|success|warning|health|muscle|anatomy|effort|nutrition-accuracy|routine-tone|equipment|recovery|protein|calor(?:ie|ic)|trend-line)\b/i;
const neutral=/\b(?:schedule|select|picker|toolbar|button|input|field|note|helper|subtitle|caption|nav|dialog|modal|card|panel|header|history|time|food|workout|buddy|library|settings|import|preview|filter|search|footer|label|background|section)\b/i;
function rgb(code){
 let hex=code.slice(1).toLowerCase();
 if(hex.length===3||hex.length===4)hex=[...hex].map(x=>x+x).join('');
 return [0,2,4].map(x=>parseInt(hex.slice(x,x+2),16));
}
function isGreen(code){
 const [r,g,b]=rgb(code);
 return g>r+10&&g>b+5&&Math.max(r,g,b)-Math.min(r,g,b)>15;
}
const report={summary:{},neutral:[],semantic:[],uncertain:[]};
for(const file of files){
 const raw=await readFile(resolve(root,file),'utf8');
 const text=raw.replace(/\/\*[\s\S]*?\*\//g,match=>match.replace(/[^\n]/g,' '));
 // Keep selectors and braces together; old styles.css has several compressed rules.
 let offset=0,counts={greenDeclarations:0,neutral:0,semantic:0,uncertain:0};
 for(const block of text.split('}')){
  const start=block.lastIndexOf('{'),selector=block.slice(0,start).trim().split('}').at(-1)?.trim()||'';
  const body=start>=0?block.slice(start+1):'';
  const line=1+text.slice(0,offset).split('\n').length-1;
  offset+=block.length+1;
  if(!selector||!body)continue;
  const entries=body.split(';').filter(decl=>decl.trim()&&!decl.includes('var('));
  const colors=entries.flatMap(decl=>(decl.match(/#[a-f\d]{3,8}\b/gi)||[]).filter(isGreen));
  if(!colors.length)continue;
  counts.greenDeclarations++;
  const category=semantic.test(selector)?'semantic':neutral.test(selector)?'neutral':'uncertain';
  counts[category]++;
  report[category].push({file,line,selector:selector.replace(/\s+/g,' ').slice(0,170),colors:[...new Set(colors)]});
 }
 report.summary[file]=counts;
}
const total=Object.values(report.summary).reduce((n,x)=>n+x.greenDeclarations,0);
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(report,null,2)+'\n');
else{
 console.log('Potential literal green CSS rules:',total);
 for(const [file,counts] of Object.entries(report.summary))console.log(file,JSON.stringify(counts));
 console.log('\nReview neutral and uncertain rules in the generated JSON. Many legacy');
 console.log('rules are already overridden by palette CSS; inspect computed color');
 console.log('on each appearance before claiming a runtime regression.\n');
 console.log('First 40 candidate rules:');
 for(const entry of [...report.neutral,...report.uncertain].slice(0,40))
  console.log(entry.file+':'+entry.line+' '+entry.selector+' '+entry.colors.join(','));
}
