// Pantry stock is measured in ingredient reference servings. It never logs food.
const cleanText=(value,max,label)=>{
 if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error('Check '+label+'.');
 return value.trim();
};
const count=(value,label)=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000)throw Error(label+' must be between 0 and 100,000 servings.');
 return value;
};
export function normalizePantry(value){
 if(!Array.isArray(value)||value.length>500)throw Error('Pantry must have 500 or fewer items.');
 const ids=new Set(),linked=new Set();
 return value.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid pantry item.');
  const id=cleanText(item.id,160,'pantry ID'),name=cleanText(item.name,120,'pantry item name');
  if(ids.has(id))throw Error('Duplicate pantry item ID.');
  ids.add(id);
  const quantity=count(item.quantity,'Pantry quantity');
  const entry={id,name,quantity};
  if(item.sourceFoodId!=null){
   entry.sourceFoodId=cleanText(item.sourceFoodId,160,'pantry ingredient link');
   if(linked.has(entry.sourceFoodId))throw Error('That ingredient is already in the pantry.');
   linked.add(entry.sourceFoodId);
  }
  if(item.servingLabel!=null&&item.servingLabel!==''){
   entry.servingLabel=cleanText(item.servingLabel,120,'pantry serving label');
  }
  return entry;
 });
}
export function pantryCoverage(recipe,pantry){
 const stock=normalizePantry(pantry),bySource=new Map(stock.filter(x=>x.sourceFoodId).map(x=>[x.sourceFoodId,x]));
 const demand=new Map(),untracked=[];
 for(const ingredient of recipe?.ingredients||[]){
  if(!Number.isFinite(ingredient.quantity)||ingredient.quantity<=0)throw Error('Invalid batch ingredient amount.');
  const source=ingredient.sourceFoodId,row=source?bySource.get(source):null;
  if(!row){untracked.push(ingredient.name);continue;}
  const previous=demand.get(source);
  if(previous)previous.needed+=ingredient.quantity;
  else demand.set(source,{pantryId:row.id,sourceFoodId:source,name:row.name,needed:ingredient.quantity,available:row.quantity});
 }
 const rows=[...demand.values()];
 return {rows,matched:rows.length,untracked,shortfalls:rows.filter(x=>x.needed>x.available+1e-8)};
}
export function deductPantryForBatch(recipe,pantry){
 const stock=normalizePantry(pantry),coverage=pantryCoverage(recipe,stock);
 if(!coverage.matched)throw Error('No linked ingredients in this batch match tracked pantry stock.');
 if(coverage.shortfalls.length)throw Error('Not enough '+coverage.shortfalls.map(x=>x.name).join(', ')+'. Adjust the pantry or finish without deduction.');
 const needed=new Map(coverage.rows.map(x=>[x.pantryId,x.needed]));
 const next=stock.map(item=>needed.has(item.id)?{...item,quantity:Math.max(0,Math.round((item.quantity-needed.get(item.id))*1000000)/1000000)}:item);
 return {pantry:normalizePantry(next),deductions:coverage.rows.map(x=>({pantryId:x.pantryId,sourceFoodId:x.sourceFoodId,name:x.name,quantity:x.needed}))};
}
export function exportPortablePantry(pantry){
 return {format:'everyday-pantry-v1',items:normalizePantry(pantry).map(x=>({name:x.name,quantity:x.quantity,...(x.servingLabel?{servingLabel:x.servingLabel}:{})}))};
}
export function importPortablePantry(file,foods,idFactory){
 if(file?.format!=='everyday-pantry-v1'||!Array.isArray(file.items)||file.items.length>500)throw Error('Not an Everyday pantry file.');
 const known=new Map((foods||[]).map(food=>[food.name.trim().toLocaleLowerCase(),food]));
 const seen=new Set();
 const imported=file.items.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid shared pantry item.');
  const name=cleanText(item.name,120,'shared pantry item'),quantity=count(item.quantity,'Shared pantry quantity');
  const label=item.servingLabel?cleanText(item.servingLabel,120,'shared serving label'):'';
  const key=name.toLocaleLowerCase();
  if(seen.has(key))throw Error('Shared pantry contains duplicate item names.');
  seen.add(key);
  const food=known.get(key);
  // Different serving definitions are never automatically considered equivalent.
  const sourceFoodId=food&&(!label||label.toLocaleLowerCase()===(food.serving?.text||'').trim().toLocaleLowerCase())?food.id:null;
  return {id:idFactory(),name,quantity,...(label?{servingLabel:label}:{}),...(sourceFoodId?{sourceFoodId}:{})};
 });
 return normalizePantry(imported);
}
