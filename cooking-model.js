// A recipe snapshots the nutrition basis of each ingredient independently of the
// food library. Changing saved foods later must not silently rewrite a recipe.
import {normalizeServing} from './food-portion-model.js?v=149';
const positive=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>100000)throw Error(label+' must be a positive number.');return n;};
const title=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error('Check '+label+'.');return value.trim();};

export const INGREDIENT_CATEGORIES=[
 ['grains','Grains & starches'],['protein','Meat, eggs & proteins'],
 ['produce','Vegetables & fruit'],['dairy','Dairy'],['fats','Fats & oils'],
 ['seasoning','Sauces & seasonings'],['other','Other']
];
const categoryKeys=new Set(INGREDIENT_CATEGORIES.map(([key])=>key));
export const ingredientCategory=food=>{
 const category=(food?.tags||[]).find(tag=>typeof tag==='string'&&tag.startsWith('ingredient-'))?.slice(11);
 return categoryKeys.has(category)?category:'other';
};
export const ingredientLibrary=foods=>(foods||[]).filter(food=>food?.tags?.includes('ingredient'))
 .slice().sort((a,b)=>ingredientCategory(a).localeCompare(ingredientCategory(b))||a.name.localeCompare(b.name));
export const matchingIngredient=(foods,name)=>(foods||[]).find(food=>
 String(food?.name||'').trim().toLocaleLowerCase()===String(name||'').trim().toLocaleLowerCase())||null;
// Linked recipe ingredients always resolve to their current library definition.
// Historical sessions and prepared batches deliberately keep their old snapshots.
export function resolveRecipeIngredients(recipe,foods){
 const copy=structuredClone(recipe);
 const byId=new Map((foods||[]).map(food=>[food.id,food]));
 copy.ingredients=(copy.ingredients||[]).map(item=>{
  const current=byId.get(item.sourceFoodId);
  if(!current)return item;
  const snapshot=ingredientSnapshot(current,item.id,item.quantity);
  return snapshot;
 });
 return copy;
}
export function cookingSteps(instructions){
 const raw=String(instructions||'').trim();
 if(!raw)return [];
 const numbered=raw.replace(/(?:^|\s)(\d{1,2}[.)])\s+(?=\S)/g,(match,label)=>'\n'+label+' ');
 let parts=numbered.split(/\n+/).map(s=>s.trim()).filter(Boolean);
 if(parts.length===1)parts=parts[0].split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
 return parts.map(step=>step.replace(/^(?:\d+[.)]\s*|[-•]\s*)/,'').trim()).filter(Boolean).slice(0,100);
}

export function ingredientSnapshot(food,identity,quantity=1){
 if(!food||typeof food!=='object'||!Number.isFinite(food.calories)||!Number.isFinite(food.protein)||food.calories<0||food.protein<0)throw Error('Choose a saved food with valid nutrition.');
 return {id:title(identity,160,'ingredient ID'),sourceFoodId:title(food.id,160,'food ID'),
  name:title(food.name,120,'ingredient name'),calories:food.calories,protein:food.protein,
  quantity:positive(quantity,'Ingredient servings'),...(food.serving?{serving:normalizeServing(food.serving)}:{})};
}
export function normalizeRecipes(value){
 if(!Array.isArray(value)||value.length>300)throw Error('Recipes must be a list of 300 or fewer.');
 const recipeIds=new Set();
 return value.map(recipe=>{
  if(!recipe||typeof recipe!=='object'||Array.isArray(recipe))throw Error('Invalid recipe.');
  const id=title(recipe.id,160,'recipe ID'),name=title(recipe.name,120,'recipe name'),servings=positive(recipe.servings,'Recipe portions');
  if(recipeIds.has(id))throw Error('Duplicate recipe ID.');recipeIds.add(id);
  if(typeof recipe.instructions!=='string'||recipe.instructions.length>6000)throw Error('Instructions are too long.');
  if(!Array.isArray(recipe.ingredients)||recipe.ingredients.length>100)throw Error('A recipe can contain at most 100 ingredients.');
  const ingredientIds=new Set();
  const ingredients=recipe.ingredients.map(item=>{
   if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid recipe ingredient.');
   const entry={id:title(item.id,160,'ingredient ID'),name:title(item.name,120,'ingredient name'),
    calories:item.calories,protein:item.protein,quantity:positive(item.quantity,'Ingredient servings')};
   if(ingredientIds.has(entry.id))throw Error('Duplicate recipe ingredient.');ingredientIds.add(entry.id);
   if(!Number.isFinite(entry.calories)||entry.calories<0||!Number.isFinite(entry.protein)||entry.protein<0)
    throw Error('Recipe ingredient nutrition must have valid calories and protein.');
   if(item.sourceFoodId!=null)entry.sourceFoodId=title(item.sourceFoodId,160,'food ID');
   if(item.serving!=null)entry.serving=normalizeServing(item.serving);
   return entry;
  });
  return {id,name,servings,instructions:recipe.instructions,ingredients};
 });
}
export function recipeTotals(recipe){
 positive(recipe.servings,'Recipe portions');
 let calories=0,protein=0;
 for(const item of recipe.ingredients||[]){
  positive(item.quantity,'Ingredient servings');
  if(!Number.isFinite(item.calories)||item.calories<0||!Number.isFinite(item.protein)||item.protein<0)throw Error('Recipe ingredient nutrition is invalid.');
  calories+=item.calories*item.quantity;protein+=item.protein*item.quantity;
 }
 if(!Number.isFinite(calories)||!Number.isFinite(protein))throw Error('Recipe totals are too large.');
 return {calories,protein,perPortionCalories:calories/recipe.servings,perPortionProtein:protein/recipe.servings};
}

// A live session is an editable snapshot. Finishing it makes a new prepared
// batch snapshot; neither operation rewrites its source recipe or logs food.
const timestamp=(value,label)=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)||!Number.isFinite(Date.parse(value)))
  throw Error(label+' must be a valid timestamp.');
 return value;
};
const optionalGrams=value=>{
 if(value==null)return undefined;
 const grams=Number(value);
 if(!Number.isFinite(grams)||grams<=0||grams>1000000)throw Error('Finished weight must be a positive number of grams.');
 return grams;
};
export function normalizeCookingSession(value){
 if(value==null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid cooking session.');
 const id=title(value.id,160,'cooking session ID'),recipeId=title(value.recipeId,160,'recipe ID');
 const startedAt=timestamp(value.startedAt,'Cooking start time');
 const recipe=normalizeRecipes([value.recipe])[0];
 if(!recipe.ingredients.length)throw Error('Cooking sessions need an ingredient.');
 const finishedGrams=optionalGrams(value.finishedGrams);
 const completedSteps=value.completedSteps??[];
 if(!Array.isArray(completedSteps)||completedSteps.length>100||completedSteps.some(n=>!Number.isInteger(n)||n<0||n>=100))
  throw Error('Invalid completed cooking steps.');
 return {id,recipeId,startedAt,recipe,completedSteps:[...new Set(completedSteps)].sort((a,b)=>a-b),...(finishedGrams==null?{}:{finishedGrams})};
}
export function normalizePreparedBatches(value){
 if(!Array.isArray(value)||value.length>1500)throw Error('Too many prepared cooking batches.');
 const ids=new Set(),sessions=new Set();
 return value.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid prepared batch.');
  const id=title(item.id,160,'prepared batch ID'),sessionId=title(item.sessionId,160,'cooking session ID');
  if(ids.has(id)||sessions.has(sessionId))throw Error('Duplicate prepared batch or cooking session.');
  ids.add(id);sessions.add(sessionId);
  const recipeId=title(item.recipeId,160,'source recipe ID'),preparedAt=timestamp(item.preparedAt,'Prepared time');
  const recipe=normalizeRecipes([item.recipe])[0];
  if(!recipe.ingredients.length)throw Error('Prepared batches need an ingredient.');
  const finishedGrams=optionalGrams(item.finishedGrams);
  return {id,sessionId,recipeId,preparedAt,recipe,...(finishedGrams==null?{}:{finishedGrams})};
 });
}
export function beginCooking(recipe,sessionId,startedAt=new Date().toISOString()){
 const snapshot=normalizeRecipes([recipe])[0];
 return normalizeCookingSession({id:sessionId,recipeId:snapshot.id,startedAt,recipe:snapshot});
}
export function finishCooking(session,batchId,preparedAt=new Date().toISOString()){
 const active=normalizeCookingSession(session);
 if(!active)throw Error('No cooking session to finish.');
 return normalizePreparedBatches([{id:batchId,sessionId:active.id,recipeId:active.recipeId,
  preparedAt,recipe:structuredClone(active.recipe),
  ...(active.finishedGrams==null?{}:{finishedGrams:active.finishedGrams})}])[0];
}
