// Food > Cooking: a recipe workspace, intentionally separate from eating logs.
import {ingredientSnapshot,normalizeRecipes,recipeTotals} from './cooking-model.js?v=136';

export function createCookingUI({getData,replaceData,normalizeData,id,esc,fmt,modal,close,render,persist}){
 let tab='summary',draft=null;
 const button=(text,action,cls='',extra='')=>'<button type="button" class="'+cls+'" data-action="'+action+'" '+extra+'>'+text+'</button>';
 const attr=s=>esc(s??'');
 const getRecipe=recipeId=>(getData().recipes||[]).find(x=>x.id===recipeId);
 const totals=recipe=>{
  try{
   const v=recipeTotals(recipe);
   return fmt(v.perPortionCalories)+' cal · '+fmt(v.perPortionProtein)+'g protein / portion';
  }catch{return 'Nutrition unavailable';}
 };
 function tabs(){
  return '<div class="food-workspace-tabs" role="tablist" aria-label="Food workspace">'+
   [['summary','Summary'],['cooking','Cooking']].map(([key,label])=>'<button type="button" class="'+(tab===key?'selected':'')+
    '" role="tab" aria-selected="'+(tab===key)+'" data-action="food-workspace" data-tab="'+key+'">'+label+'</button>').join('')+'</div>';
 }
 function home(){
  const recipes=getData().recipes||[];
  return '<section class="cooking-home"><div class="section-head"><div><h2>Cooking</h2>'+
   '<p class="body-copy cooking-intro">Build recipes with measured ingredients and see nutrition for the whole batch or each portion.</p></div></div>'+
   '<div class="cooking-actions">'+button('+ New recipe','recipe-new','primary small')+button('Import JSON','recipe-import-open','outline small')+'</div>'+
   (recipes.length?'<div class="cooking-recipe-list">'+recipes.map(recipe=>
    '<button type="button" class="cooking-recipe-card" data-action="recipe-open" data-id="'+attr(recipe.id)+'"><span><strong>'+esc(recipe.name)+
     '</strong><small>'+fmt(recipe.servings)+' portions · '+recipe.ingredients.length+' ingredients</small>'+
     '<span class="cooking-card-macros">'+totals(recipe)+'</span></span><b aria-hidden="true">›</b></button>').join('')+'</div>':
    '<p class="empty">No recipes yet. Add a homemade meal to calculate its nutrition.</p>')+
   '<p class="hint">Saving a recipe does not log any food. Cooking sessions, prepared batches and pantry management come afterward.</p></section>';
 }
 function items(){
  return draft.ingredients.length?draft.ingredients.map(item=>{
   const serving=item.serving?' · '+attr(item.serving.amount+' '+item.serving.unit):'';
   const field=(key,label,value)=>'<label class="field"><span>'+label+'</span><input type="'+(key==='name'?'text':'number')+
    '" '+(key==='name'?'maxlength="120"':'min="'+(key==='quantity'?'0.01':'0')+'" step="any" inputmode="decimal"')+
    ' data-recipe-item-id="'+attr(item.id)+'" data-recipe-item-key="'+key+'" value="'+attr(value)+'" required></label>';
   return '<div class="cooking-ingredient"><div class="cooking-ingredient-heading"><strong>Ingredient</strong>'+
    button('Remove','recipe-remove-ingredient','text-btn','data-id="'+attr(item.id)+'"')+'</div>'+
    field('name','Name'+serving,item.name)+'<div class="cooking-ingredient-fields">'+
    field('quantity','Servings',item.quantity)+field('calories','Cal / serving',item.calories)+
    field('protein','Protein (g)',item.protein)+'</div></div>';
  }).join(''):'<p class="hint">Add at least one ingredient below.</p>';
 }
 function capture(form){
  if(!form||!draft)return;
  draft.name=form.elements.recipeName.value;
  draft.servings=form.elements.recipeServings.value.trim()===''?NaN:Number(form.elements.recipeServings.value);
  draft.instructions=form.elements.recipeInstructions.value;
  for(const field of form.querySelectorAll('[data-recipe-item-key]')){
   const item=draft.ingredients.find(x=>x.id===field.dataset.recipeItemId);
   if(!item)continue;
   item[field.dataset.recipeItemKey]=field.dataset.recipeItemKey==='name'?field.value:
    field.value.trim()===''?NaN:Number(field.value);
  }
 }
 function preview(form){
  if(!form||!draft)return;
  capture(form);
  const status=form.querySelector('[data-recipe-totals]');if(!status)return;
  try{
   const t=recipeTotals(draft);
   status.textContent=fmt(t.calories)+' cal · '+fmt(t.protein)+'g protein for batch | '+
    fmt(t.perPortionCalories)+' cal · '+fmt(t.perPortionProtein)+'g per portion';
  }catch{status.textContent='Enter valid portions and ingredient amounts to calculate nutrition.';}
 }
 function edit(recipe){
  draft=recipe?structuredClone(recipe):{id:id(),name:'',servings:4,instructions:'',ingredients:[]};
  const selectedFoods=getData().foods.slice().sort((a,b)=>a.name.localeCompare(b.name));
  modal(recipe?'Edit recipe':'New recipe','<form class="form cooking-editor" data-form="recipe">'+
   '<label class="field"><span>Recipe name</span><input name="recipeName" maxlength="120" value="'+attr(draft.name)+'" required></label>'+
   '<label class="field"><span>Portions this batch makes</span><input type="number" name="recipeServings" min="0.01" step="any" inputmode="decimal" value="'+attr(draft.servings)+'" required></label>'+
   '<div class="cooking-totals" data-recipe-totals role="status"></div>'+
   '<section class="cooking-ingredients"><h3>Ingredients</h3><div data-recipe-items>'+items()+'</div>'+
   '<div class="cooking-add-row"><select name="recipeFoodId" aria-label="Saved food to add">'+
   '<option value="">Choose a saved food</option>'+
   selectedFoods.map(f=>'<option value="'+attr(f.id)+'">'+esc(f.name)+'</option>').join('')+
   '</select>'+button('Add saved food','recipe-add-saved','outline small')+'</div>'+
   button('+ Custom ingredient','recipe-add-custom','outline small')+'</section>'+
   '<label class="field"><span>Instructions (optional)</span><textarea name="recipeInstructions" maxlength="6000" rows="4" placeholder="Cooking steps and notes">'+esc(draft.instructions)+'</textarea></label>'+
   '<p class="hint">Each ingredient keeps its own nutrition snapshot. Food Library edits cannot silently alter this recipe.</p>'+
   '<div class="form-actions"><button type="submit" class="primary">Save recipe</button>'+
   (recipe?button('Export JSON','recipe-export','outline','data-id="'+attr(recipe.id)+'"')+
    button('Delete recipe','recipe-delete','danger','data-id="'+attr(recipe.id)+'"'):'')+'</div></form>');
  preview(document.querySelector('form[data-form="recipe"]'));
 }
 function refreshItems(form){
  const list=form?.querySelector('[data-recipe-items]');
  if(list)list.innerHTML=items();
  preview(form);
 }
 function importDialog(){
  modal('Import recipe','<form class="form" data-form="recipe-import"><p class="body-copy">Import a portable Everyday recipe. This does not change existing foods or your food log.</p>'+
   '<label class="field"><span>Recipe JSON file</span><input type="file" name="file" accept=".json,application/json" required></label>'+
   '<button type="submit" class="primary">Import recipe</button></form>');
 }
 function exportRecipe(recipe){
  const copy=structuredClone(recipe);
  for(const ingredient of copy.ingredients)delete ingredient.sourceFoodId;
  const blob=new Blob([JSON.stringify({format:'everyday-recipe-v1',recipe:copy},null,2)],{type:'application/json'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download='everyday-recipe-'+recipe.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'.json';
  link.click();setTimeout(()=>URL.revokeObjectURL?.(link.href),1000);
 }
 async function handleAction(action,el){
  if(action==='food-workspace'){if(['summary','cooking'].includes(el.dataset.tab)){tab=el.dataset.tab;render();}return;}
  if(action==='recipe-new'){edit();return;}
  if(action==='recipe-open'){const recipe=getRecipe(el.dataset.id);if(recipe)edit(recipe);return;}
  if(action==='recipe-import-open'){importDialog();return;}
  if(action==='recipe-add-custom'||action==='recipe-add-saved'){
   const form=el.closest('form[data-form="recipe"]');if(!form||!draft)return;
   capture(form);
   if(draft.ingredients.length>=100){alert('A recipe can have up to 100 ingredients.');return;}
   if(action==='recipe-add-custom')draft.ingredients.push({id:id(),name:'New ingredient',calories:0,protein:0,quantity:1});
   else{
    const food=getData().foods.find(x=>x.id===form.elements.recipeFoodId.value);
    if(!food){alert('Choose a saved food first.');return;}
    draft.ingredients.push(ingredientSnapshot(food,id()));
   }
   refreshItems(form);form.elements.recipeFoodId.value='';return;
  }
  if(action==='recipe-remove-ingredient'){
   const form=el.closest('form[data-form="recipe"]');if(!form||!draft)return;
   capture(form);draft.ingredients=draft.ingredients.filter(x=>x.id!==el.dataset.id);refreshItems(form);return;
  }
  if(action==='recipe-export'){const recipe=getRecipe(el.dataset.id);if(recipe)exportRecipe(recipe);return;}
  if(action==='recipe-delete'){
   const recipe=getRecipe(el.dataset.id);
   if(!recipe||!confirm('Delete recipe "'+recipe.name+'"? Food logs will remain unchanged.'))return;
   const next=structuredClone(getData());next.recipes=next.recipes.filter(x=>x.id!==recipe.id);
   replaceData(normalizeData(next));draft=null;close(true);render();await persist();return;
  }
 }
 async function onSubmit(form,v){
  try{
   if(form.dataset.form==='recipe'){
    if(!draft)return;
    capture(form);
    if(!draft.ingredients.length)throw Error('Add at least one ingredient first.');
    const recipe=normalizeRecipes([draft])[0],next=structuredClone(getData());
    recipeTotals(recipe);
    const index=next.recipes.findIndex(x=>x.id===recipe.id);
    if(index<0)next.recipes.push(recipe);else next.recipes[index]=recipe;
    replaceData(normalizeData(next));draft=null;close(true);tab='cooking';render();await persist();
   }else if(form.dataset.form==='recipe-import'){
    const file=v.file;
    if(!file||typeof file.text!=='function')throw Error('Choose a JSON file.');
    if(file.size>200000)throw Error('Recipe file is too large.');
    const parsed=JSON.parse(await file.text());
    if(parsed?.format!=='everyday-recipe-v1')throw Error('Not an Everyday recipe file.');
    const recipe=normalizeRecipes([parsed.recipe])[0];
    recipe.id=id();for(const ingredient of recipe.ingredients){ingredient.id=id();delete ingredient.sourceFoodId;}
    const next=structuredClone(getData());next.recipes.push(recipe);
    replaceData(normalizeData(next));close(true);tab='cooking';render();await persist();
   }
  }catch(error){alert(error?.message||'Unable to save recipe.');}
 }
 return {get tab(){return tab;},tabs,home,onInput:preview,handleAction,onSubmit};
}
