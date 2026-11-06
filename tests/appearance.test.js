import test from 'node:test';
import assert from 'node:assert/strict';
import {PALETTES,SKINS,defaultAppearance,normalizeAppearance,appearancePalette} from '../appearance-model.js';
import {emptyData,normalizeData,encodeData} from '../data.js';

test('original green stays the default and ocean blue is an alternative',()=>{
 assert.equal(defaultAppearance().paletteId,'forest');
 assert.equal(appearancePalette().colors.background,'#101914');
 assert.equal(PALETTES.find(p=>p.id==='ocean').name,'Ocean at Night');
 assert.ok(SKINS.some(s=>s.id==='winter')&&SKINS.some(s=>s.id==='harvest'));
});

test('custom palettes round-trip through the notebook with history unchanged',()=>{
 const source=emptyData();
 source.lifts.push({id:'historic-lift',date:'2026-11-01',exercise:'Chest Press',sets:[{weight:70,reps:8}]});
 source.preferences.appearance={
  paletteId:'custom-my-first',skinId:'high-seas',
  customPalettes:[{id:'custom-my-first',name:'Favorite',colors:{background:'#181d29',surface:'#303749',primary:'#b58aeb',secondary:'#64c7ba'}}]
 };
 const encoded=encodeData(source),restored=normalizeData(encoded);
 assert.deepEqual(restored.preferences.appearance,source.preferences.appearance);
 assert.equal(restored.lifts[0].sets[0].weight,70);
 assert.equal(restored.preferences.theme,'system');
});

test('old backups default to forest and invalid colors or identity fail closed',()=>{
 const legacy=emptyData();delete legacy.preferences.appearance;
 assert.deepEqual(normalizeData(legacy).preferences.appearance,defaultAppearance());
 const base={paletteId:'custom-a',skinId:'none',customPalettes:[{id:'custom-a',name:'Valid',colors:{background:'#123456',surface:'#222222',primary:'#abcdef',secondary:'#123abc'}}]};
 assert.deepEqual(normalizeAppearance(base).customPalettes[0].colors,base.customPalettes[0].colors);
 assert.throws(()=>normalizeAppearance({...base,customPalettes:[{...base.customPalettes[0],colors:{...base.customPalettes[0].colors,primary:'red'}}]}),/custom palette color/);
 assert.throws(()=>normalizeAppearance({...base,skinId:'unrecognized'}),/selected skin/);
 assert.throws(()=>normalizeAppearance({...base,customPalettes:[base.customPalettes[0],base.customPalettes[0]]}),/palette ID/);
});
