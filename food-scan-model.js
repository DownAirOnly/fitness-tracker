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
 const text=String(raw||'').replace(/\r/g,''),lines=text.split('\n').map(x=>x.replace(/[|]/g,' ').trim()).filter(Boolean);
 let calories=null,protein=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(calories===null&&/\bcalor(?:ies|y)\b/i.test(line)&&!/calories?\s+from\s+fat/i.test(line)){
   const tail=line.replace(/^.*?\bcalor(?:ies|y)\b/i,'').replace(/^\s*(?:kcal|:|-)\s*/i,'');
   let m=tail.match(/^(\d{1,4})(?!\d)/);
   if(!m&&lines[i+1])m=lines[i+1].match(/^\s*(\d{1,4})(?:\s|$)/);
   if(m)calories=num(m[1]);
  }
  if(protein===null&&/\bprotein\b/i.test(line)){
   const tail=line.replace(/^.*?\bprotein\b/i,'');
   let m=tail.match(/^\s*(?:\(?g\)?\s*)?[:\-]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
   if(!m&&lines[i+1])m=lines[i+1].match(/^\s*(\d+(?:\.\d+)?)\s*g\b/i);
   if(m)protein=num(m[1]);
  }
 }
 const serving=text.match(/serving\s+size\s*[:\-]?\s*([^\n]{2,70})/i);
 return {name:'',calories,protein,basis:serving?'Label serving: '+serving[1].trim():'Nutrition Facts label',note:'OCR may misread a digit or column. Verify values against the label.',source:'On-device label OCR'};
}
