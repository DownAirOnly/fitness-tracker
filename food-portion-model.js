// Nutrition always describes one reference serving. No inferred density or state conversions.
const units={serving:['count',1],item:['item',1],g:['mass',1],kg:['mass',1000],oz:['mass',28.349523125],lb:['mass',453.59237],ml:['volume',1],l:['volume',1000]};
const positive=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw Error(label+' must be greater than zero.');return value;};
export function normalizeServing(value){
 if(value==null)return undefined;
 if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid serving details.');
 const amount=positive(value.amount,'Serving amount'),unit=value.unit;
 if(typeof unit!=='string'||!Object.hasOwn(units,unit))throw Error('Choose a supported serving unit.');
 const text=value.text??'',state=value.state??'';
 if(typeof text!=='string'||text.length>120||!['','raw','cooked','drained','as-sold'].includes(state))throw Error('Invalid serving description or food state.');
 const result={amount,unit,text:text.trim(),state};
 for(const key of ['grams','milliliters'])if(value[key]!=null)result[key]=positive(value[key],key==='grams'?'Grams per serving':'Milliliters per serving');
 // Redundant equivalents must agree with the stated reference amount.
 for(const [key,dimension]of [['grams','mass'],['milliliters','volume']])if(result[key]!=null&&units[unit][0]===dimension&&Math.abs(result[key]-amount*units[unit][1])>1e-6)throw Error('Serving equivalent conflicts with its reference amount.');
 return result;
}
export function servingLabel(food){const s=normalizeServing(food.serving);return s?`${s.amount} ${s.unit}${s.text?' · '+s.text:''}${s.state?' · '+s.state:''}`:'1 serving (size unspecified)';}
export function portionFor(food,{mode='quantity',value,unit='serving'}={}){
 positive(value,'Amount');
 const calories=food.calories,protein=food.protein;
 if(!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0)throw Error('Enter both calories and protein; missing nutrition is not zero.');
 const s=normalizeServing(food.serving)||{amount:1,unit:'serving'},basis=units[s.unit];
 let quantity;
 if(mode==='calories'||mode==='protein'){
  const nutrient=mode==='calories'?calories:protein;
  if(nutrient<=0)throw Error('Cannot calculate an amount from zero '+mode+'.');
  quantity=value/nutrient;
 }else if(mode==='quantity'){
  if(typeof unit!=='string'||!Object.hasOwn(units,unit))throw Error('Choose a supported amount unit.');
  if(unit==='serving')quantity=value;
  else if(units[unit][0]===basis[0])quantity=value*units[unit][1]/(s.amount*basis[1]);
  else if(units[unit][0]==='mass'&&s.grams)quantity=value*units[unit][1]/s.grams;
  else if(units[unit][0]==='volume'&&s.milliliters)quantity=value*units[unit][1]/s.milliliters;
  else throw Error('No compatible serving conversion. Add a measured equivalent in Food Library.');
 }else throw Error('Choose a calculation mode.');
 const result={quantity,amount:quantity*s.amount,unit:s.unit,calories:quantity*calories,protein:quantity*protein};
 if(Object.values(result).some(x=>typeof x==='number'&&!Number.isFinite(x)))throw Error('Amount is too large.');
 return result;
}
