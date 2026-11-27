// Everyday v154.8: pure scanned nutrition normalization (no saved data writes).
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
export function normalizeBarcodeProduct(p){
 const n=p?.nutriments||{};
 let calories=num(n['energy-kcal_serving']),protein=num(n.proteins_serving);
 let basis='Per serving',note='';
 if(calories===null||protein===null){
  const cal100=num(n['energy-kcal_100g']),pro100=num(n.proteins_100g);
  const size=String(p?.serving_size||'');
  const amount=size.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\b/i)||size.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i);
  const qty=num(p?.serving_quantity)??(amount?Number(amount[1]):null);
  if(cal100!==null&&pro100!==null&&qty>0){
   calories=Math.round(cal100*qty/100);protein=Math.round(pro100*qty/10)/10;
   basis='Calculated for '+(size||qty+' g');
   note='Calculated from values per 100 g/mL. Verify the package serving.';
  }else if(cal100!==null&&pro100!==null){
   calories=cal100;protein=pro100;
   basis='Per 100 g/mL, NOT per package serving';
   note='No serving size was found. These are per-100g/mL values; adjust for your portion.';
  }
 }
 const title=String(p?.product_name||p?.product_name_en||'').trim(),brand=String(p?.brands||'').split(',')[0].trim();
 return {name:(brand&&title&&!title.toLowerCase().includes(brand.toLowerCase())?brand+' '+title:title||brand).slice(0,100),calories,protein,basis,note,source:'Open Food Facts'};
}
export function parseNutritionLabel(raw){
 // Only take values next to their Nutrition Facts label; avoid columns that
 // have been interleaved by OCR on a full-package photo.
 const text=String(raw||'').replace(/\r/g,'');
 const lines=text.split('\n').map(x=>x.replace(/[|]/g,' ').trim()).filter(Boolean);
 let calories=null,protein=null,caloriesUnit=false,proteinUnit=false;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(calories===null&&/\bcalor(?:ies|y)\b/i.test(line)&&!/calories?\s+from\s+fat/i.test(line)){
   const tail=line.slice(line.search(/\bcalor(?:ies|y)\b/i)).replace(/^calor(?:ies|y)\b/i,'').replace(/^\s*(?:kcal|:|-)\s*/i,'');
   let match=tail.match(/^\s*(\d{1,4})(?![\/\d])/);
   if(!match&&lines[i+1]&&/^\s*\d{2,4}\s*$/.test(lines[i+1]))
    match=lines[i+1].match(/^\s*(\d{2,4})\s*$/);
   if(match){calories=num(match[1]);caloriesUnit=true;}
  }
  if(protein===null&&/\bprotein\b/i.test(line)){
   const tail=line.slice(line.search(/\bprotein\b/i)).replace(/^protein\b/i,'');
   let match=tail.match(/^\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*(g|grams?)\b/i);
   if(match){protein=num(match[1]);proteinUnit=true;}
   // OCR sometimes omits the g. A unitless number is too ambiguous to import
   // automatically: on the supplied cookie photo, "2g" was read as "20".
  }
 }
 const servingLine=lines.find(x=>/\bserving\s*size\b/i.test(x))||'';
 const cleanedServing=servingLine.replace(/^.*?\bserving\s*size\b[:\s-]*/i,'');
 const size=cleanedServing.match(/^\s*(\d+(?:\/\d+)?(?:\.\d+)?\s+(?:cookie|cookies|bar|bottle|cup|cups|slice|slices|piece|pieces|serving|packet|pouch|tbsp|tsp|oz)\b(?:\s*\(\s*\d+(?:\.\d+)?\s*(?:g|ml|oz)\s*\))?)/i)
  ||cleanedServing.match(/^\s*(\d+(?:\/\d+)?(?:\.\d+)?\s*(?:g|ml|oz)\b)/i);
 const serving=size?size[1].trim():'';
 return {name:'',calories,protein,basis:serving?'Label serving: '+serving:'Nutrition Facts label',
  note:'Verify both values against the label. OCR can misread digits or columns; missing values stay blank.',
  source:'On-device label OCR',
  quality:caloriesUnit&&proteinUnit?'complete':caloriesUnit||proteinUnit?'partial':'unreadable'};
}
