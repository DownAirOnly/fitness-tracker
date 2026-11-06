// Account-backed appearance selections, independent of lifting and finance records.
export const PALETTES=[
 {id:'forest',name:'Enchanted Forest',description:'Original Everyday greens',colors:{background:'#101914',surface:'#1b2821',primary:'#b5d58d',secondary:'#91ba98'}},
 {id:'ocean',name:'Ocean at Night',description:'Deep blue with cool highlights',colors:{background:'#121c2b',surface:'#23354b',primary:'#8ac1f0',secondary:'#72b8cd'}},
 {id:'sage',name:'Soft Sage',description:'A lighter woodland green',colors:{background:'#18241e',surface:'#2c3c32',primary:'#9bc5a2',secondary:'#a3c2aa'}},
 {id:'amethyst',name:'Amethyst',description:'Muted violet and lilac',colors:{background:'#21192c',surface:'#332943',primary:'#c8a2ef',secondary:'#a995d6'}},
 {id:'slate',name:'Slate',description:'Quiet charcoal and silver',colors:{background:'#171c22',surface:'#2b343e',primary:'#b2c6d8',secondary:'#91aebc'}},
 {id:'harvest',name:'Harvest',description:'Thanksgiving amber and autumn',colors:{background:'#241b17',surface:'#392a21',primary:'#e5ae6a',secondary:'#d79865'}},
 {id:'winter',name:'Winter Holiday',description:'Evergreen, cranberry and gold',colors:{background:'#15211c',surface:'#293b32',primary:'#e2bf80',secondary:'#c7848e'}},
 {id:'high-seas',name:'High Seas',description:'Midnight water and antique brass',colors:{background:'#111e28',surface:'#273d4a',primary:'#dbba7d',secondary:'#85b2c6'}},
 {id:'arcade',name:'Pixel Arcade',description:'Purple and electric cyan',colors:{background:'#18152b',surface:'#302847',primary:'#ba90fa',secondary:'#69dce5'}}
];
export const SKINS=[
 {id:'none',name:'No skin',description:'Colors only',paletteId:'forest'},
 {id:'forest',name:'Enchanted Forest',description:'Botanical textures and woodland details',paletteId:'forest'},
 {id:'harvest',name:'Harvest',description:'Autumn leaves and warm trim',paletteId:'harvest'},
 {id:'winter',name:'Winter Holiday',description:'Subtle winter decorations',paletteId:'winter'},
 {id:'high-seas',name:'High Seas',description:'Nautical panels and brass accents',paletteId:'high-seas'},
 {id:'arcade',name:'Pixel Arcade',description:'Angular game-inspired details',paletteId:'arcade'}
];
const FIELDS=['background','surface','primary','secondary'];
const HEX=/^#[0-9a-fA-F]{6}$/;
export const defaultAppearance=()=>({paletteId:'forest',skinId:'none',customPalettes:[]});
export function normalizeAppearance(value){
 if(value==null)return defaultAppearance();
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid appearance preferences.');
 const palettes=value.customPalettes??[];
 if(!Array.isArray(palettes)||palettes.length>20)throw Error('Invalid custom palettes.');
 const seen=new Set();
 const customPalettes=palettes.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!/^custom-[a-z0-9-]{1,60}$/.test(item.id)||seen.has(item.id))
   throw Error('Invalid custom palette ID.');
  seen.add(item.id);
  const name=typeof item.name==='string'?item.name.trim():'';
  if(!name||name.length>36)throw Error('Invalid custom palette name.');
  if(!item.colors||typeof item.colors!=='object'||Array.isArray(item.colors))throw Error('Invalid custom palette colors.');
  const colors={};
  for(const field of FIELDS){
   if(typeof item.colors[field]!=='string'||!HEX.test(item.colors[field]))throw Error('Invalid custom palette color.');
   colors[field]=item.colors[field].toLowerCase();
  }
  return{id:item.id,name,colors};
 });
 const paletteId=value.paletteId??'forest',skinId=value.skinId??'none';
 if(!PALETTES.some(p=>p.id===paletteId)&&!seen.has(paletteId))throw Error('Invalid selected palette.');
 if(!SKINS.some(s=>s.id===skinId))throw Error('Invalid selected skin.');
 return{paletteId,skinId,customPalettes};
}
export function appearancePalette(value){
 const appearance=normalizeAppearance(value);
 return appearance.customPalettes.find(p=>p.id===appearance.paletteId)||PALETTES.find(p=>p.id===appearance.paletteId)||PALETTES[0];
}
