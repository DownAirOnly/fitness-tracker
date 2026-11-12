// A recipe snapshots the nutrition basis of each ingredient independently of the
// food library. Changing saved foods later must not silently rewrite a recipe.
import {normalizeServing} from './food-portion-model.js?v=138';
const positive=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>100000)throw Error(label+' must be a positive number.');return n;};
const title=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error('Check '+label+'.');return value.trim();};
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
