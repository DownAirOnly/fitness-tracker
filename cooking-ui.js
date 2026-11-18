// Food > Cooking: a recipe workspace, intentionally separate from eating logs.
import {ingredientSnapshot,normalizeRecipes,recipeTotals,beginCooking,finishCooking,normalizeCookingSession,resolveRecipeIngredients,ingredientLibrary,ingredientCategory,INGREDIENT_CATEGORIES,matchingIngredient,cookingSteps} from './cooking-model.js?v=148';

export function createCookingUI({getData,replaceData,normalizeData,id,esc,fmt,modal,close,render,persist}){
 let tab='summary',draft=null,expandedIngredientId=null;
 const button=(text,action,cls='',extra='')=>'<button type="button" class="'+cls+'" data-action="'+action+'" '+extra+'>'+text+'</button>';
 const attr=s=>esc(s??'');
 const getRecipe=recipeId=>(getData().recipes||[]).find(x=>x.id===recipeId);
 const ingredientFoods=()=>ingredientLibrary(getData().foods);
 const categoryName=food=>INGREDIENT_CATEGORIES.find(([key])=>key===ingredientCategory(food))?.[1]||'Other';
 const categoryOptions=current=>INGREDIENT_CATEGORIES.map(([key,label])=>'<option value="'+key+'" '+(current===key?'selected':'')+'>'+label+'</option>').join('');
 const currentRecipe=recipe=>resolveRecipeIngredients(recipe,getData().foods);
 const totals=recipe=>{
  try{
   const v=recipeTotals(currentRecipe(recipe));
   return fmt(v.perPortionCalories)+' cal · '+fmt(v.perPortionProtein)+'g protein / portion';
  }catch{return 'Nutrition unavailable';}
 };
 function tabs(){
  return '<div class="food-workspace-tabs" role="tablist" aria-label="Food workspace">'+
   [['summary','Summary'],['cooking','Cooking']].map(([key,label])=>'<button type="button" class="'+(tab===key?'selected':'')+
    '" role="tab" aria-selected="'+(tab===key)+'" data-action="food-workspace" data-tab="'+key+'">'+label+'</button>').join('')+'</div>';
 }
 function home(){
  const recipes=getData().recipes||[],active=getData().activeCooking,batches=(getData().preparedBatches||[]).slice().reverse();
  return '<section class="cooking-home"><div class="section-head"><div><h2>Cooking</h2>'+
   '<p class="body-copy cooking-intro">Recipes, shared ingredients, and guided cooking — all in one place.</p></div></div>'+
   '<div class="cooking-actions">'+button('+ New recipe','recipe-new','primary small')+button('Ingredients','ingredient-library-open','outline small')+button('Import JSON','recipe-import-open','outline small')+'</div>'+
   (active?'<div class="cooking-active-banner"><div><strong>Cooking · '+esc(active.recipe.name)+'</strong><small>Session saved separately from your recipe</small></div><div class="cooking-active-actions">'+button('Resume','cooking-resume','primary small')+button('Discard','cooking-discard','outline small')+'</div></div>':'')+
   (recipes.length?'<div class="cooking-recipe-list">'+recipes.map(recipe=>
    '<div class="cooking-recipe-row"><button type="button" class="cooking-recipe-card" data-action="recipe-open" data-id="'+attr(recipe.id)+'"><span><strong>'+esc(recipe.name)+
     '</strong><small>'+fmt(recipe.servings)+' portions · '+recipe.ingredients.length+' ingredients</small>'+
     '<span class="cooking-card-macros">'+totals(recipe)+'</span></span><b aria-hidden="true">›</b></button>'+
     button('Cook','cooking-start','outline small','data-id="'+attr(recipe.id)+'"')+'</div>').join('')+'</div>':
    '<p class="empty">No recipes yet. Add a homemade meal to calculate its nutrition.</p>')+
   (batches.length?'<section class="cooking-prepared"><h3>Prepared batches</h3><div class="cooking-prepared-list">'+batches.slice(0,30).map(batch=>
     '<button type="button" class="cooking-prepared-card" data-action="cooking-view-batch" data-id="'+attr(batch.id)+'"><span><strong>'+esc(batch.recipe.name)+'</strong><small>'+new Date(batch.preparedAt).toLocaleDateString()+' · '+fmt(batch.recipe.servings)+' portions'+(batch.finishedGrams?' · '+fmt(batch.finishedGrams)+' g finished':'')+'</small></span><b>›</b></button>').join('')+'</div></section>':'')+
   '<p class="hint">Linked ingredient nutrition comes from your Ingredient Library. Cooking saves a separate batch; nothing is logged as eaten automatically.</p></section>';
 }
 function items(){
  if(!draft.ingredients.length)return '<p class="hint">No ingredients yet. Choose one from the library or add a new ingredient.</p>';
  return draft.ingredients.map(item=>{
   const food=getData().foods.find(f=>f.id===item.sourceFoodId),info=food||item;
   const linked=Boolean(food),missing=Boolean(item.sourceFoodId&&!food);
   const fields=(key,label,value)=>'<label class="field"><span>'+label+'</span><input type="'+(key==='name'?'text':'number')+
    '" '+(key==='name'?'maxlength="120"':'min="'+(key==='quantity'?'0.01':'0')+'" step="any" inputmode="decimal"')+
    ' data-recipe-item-id="'+attr(item.id)+'" data-recipe-item-key="'+key+'" value="'+attr(value)+'" required></label>';
   const options=ingredientFoods().map(f=>'<option value="'+attr(f.id)+'">'+esc(f.name)+'</option>').join('');
   return '<details class="cooking-ingredient cooking-ingredient--compact" data-recipe-item="'+attr(item.id)+'" '+(expandedIngredientId===item.id?'open':'')+'>'+
    '<summary class="cooking-ingredient-summary"><span><strong data-recipe-summary-name>'+esc(info.name)+'</strong>'+
    '<small>'+(linked?(food.tags?.includes('ingredient')?esc(categoryName(food)):'Linked saved food'):(missing?'Missing library item · saved facts':'Custom · not linked'))+'</small></span>'+
    '<span class="cooking-ingredient-brief"><b data-recipe-summary-amount>'+fmt(item.quantity)+' ×</b>'+
    '<small data-recipe-summary-nutrition>'+fmt(info.calories*item.quantity)+' cal</small></span></summary>'+
    '<div class="cooking-ingredient-body">'+fields('quantity','Amount · servings',item.quantity)+
    (linked?'<p class="cooking-library-facts"><strong>'+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</strong> per library serving'+
       (food.serving?.text?' · '+esc(food.serving.text):'')+'</p>'+
       (!food.tags?.includes('ingredient')?button('Classify as ingredient','recipe-promote-ingredient','outline small','data-id="'+attr(item.id)+'"'):''):
      '<div class="cooking-custom-fields">'+fields('name','Name',item.name)+
        '<div class="cooking-ingredient-fields">'+fields('calories','Cal / serving',item.calories)+fields('protein','Protein (g)',item.protein)+'</div>'+
        '<label class="field"><span>Classify as</span><select data-recipe-category="'+attr(item.id)+'">'+categoryOptions('other')+'</select></label>'+
        button('Add to ingredient library','recipe-save-custom-ingredient','outline small','data-id="'+attr(item.id)+'"')+'</div>')+
    (options?'<div class="cooking-link-picker"><label class="field"><span>'+(linked?'Change linked ingredient':'Link existing ingredient')+
      '</span><select data-recipe-link="'+attr(item.id)+'"><option value="">Choose from library</option>'+options+
      '</select></label>'+button('Link','recipe-link-ingredient','outline small','data-id="'+attr(item.id)+'"')+'</div>':'')+
    '<div class="cooking-ingredient-actions">'+button('Remove from recipe','recipe-remove-ingredient','text-btn','data-id="'+attr(item.id)+'"')+'</div></div></details>';
  }).join('');
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
  const status=form.querySelector('[data-recipe-totals]');
  try{
   const resolved=currentRecipe(draft),t=recipeTotals(resolved);
   if(status)status.textContent=fmt(t.calories)+' cal · '+fmt(t.protein)+'g protein for batch | '+
    fmt(t.perPortionCalories)+' cal · '+fmt(t.perPortionProtein)+'g per portion';
  }catch{if(status)status.textContent='Enter valid portions and ingredient amounts to calculate nutrition.';}
  for(const card of form.querySelectorAll('[data-recipe-item]')){
   const item=draft.ingredients.find(x=>x.id===card.dataset.recipeItem);
   if(!item)continue;
   const info=getData().foods.find(f=>f.id===item.sourceFoodId)||item;
   const label=card.querySelector('[data-recipe-summary-name]');
   const amount=card.querySelector('[data-recipe-summary-amount]');
   const nutrition=card.querySelector('[data-recipe-summary-nutrition]');
   if(label)label.textContent=info.name;
   if(amount)amount.textContent=fmt(item.quantity)+' ×';
   if(nutrition)nutrition.textContent=fmt(info.calories*item.quantity)+' cal';
  }
 }
 function edit(recipe){
  draft=recipe?currentRecipe(recipe):{id:id(),name:'',servings:4,instructions:'',ingredients:[]};
  expandedIngredientId=null;
  const selectedFoods=ingredientFoods();
  modal(recipe?'Edit recipe':'New recipe','<form class="form cooking-editor" data-form="recipe" novalidate>'+
   '<label class="field"><span>Recipe name</span><input name="recipeName" maxlength="120" value="'+attr(draft.name)+'" required></label>'+
   '<label class="field"><span>Portions this batch makes</span><input type="number" name="recipeServings" min="0.01" step="any" inputmode="decimal" value="'+attr(draft.servings)+'" required></label>'+
   '<div class="cooking-totals" data-recipe-totals role="status"></div>'+
   '<section class="cooking-ingredients"><div class="cooking-heading-row"><h3>Ingredients</h3><small>Tap a row to edit</small></div>'+
   '<div data-recipe-items>'+items()+'</div>'+
   '<div class="cooking-add-row"><select name="recipeFoodId" aria-label="Ingredient library choice"><option value="">Choose an ingredient from your library</option>'+
   selectedFoods.map(food=>'<option value="'+attr(food.id)+'">'+esc(food.name)+' · '+esc(categoryName(food))+'</option>').join('')+
   '</select>'+button('Add','recipe-add-saved','outline small')+'</div>'+
   '<details class="cooking-new-library"><summary>+ Create a library ingredient</summary><div class="cooking-new-library-fields">'+
    '<label class="field"><span>Ingredient name</span><input name="newIngredientName" maxlength="120" placeholder="e.g. Unsalted butter"></label>'+
    '<label class="field"><span>Category</span><select name="newIngredientCategory">'+categoryOptions('other')+'</select></label>'+
    '<div class="cooking-ingredient-fields">'+
    '<label class="field"><span>Cal / serving</span><input name="newIngredientCalories" type="number" min="0" step="any" inputmode="decimal"></label>'+
    '<label class="field"><span>Protein (g)</span><input name="newIngredientProtein" type="number" min="0" step="any" inputmode="decimal"></label></div>'+
    '<label class="field"><span>Reference serving (optional)</span><input name="newIngredientServing" maxlength="120" placeholder="e.g. 1 tablespoon"></label>'+
    button('Save to library & recipe','recipe-create-ingredient','primary small')+'</div></details>'+
   '<div class="cooking-minor-action">'+button('+ One-off ingredient','recipe-add-custom','text-btn')+'</div></section>'+
   '<section class="recipe-instructions"><div class="cooking-heading-row"><h3>Instructions</h3><small>Editable steps</small></div>'+
    '<textarea class="recipe-instructions-note" name="recipeInstructions" maxlength="6000" rows="6" placeholder="Write each cooking step on its own line…">'+esc(draft.instructions)+'</textarea></section>'+
   '<p class="hint">Linked ingredients always use the library’s current nutrition. Prepared batches keep their own historical snapshots.</p>'+
   '<div class="form-actions"><button type="submit" class="primary">Save recipe</button>'+
   (recipe?button('Export JSON','recipe-export','outline','data-id="'+attr(recipe.id)+'"')+
    button('Delete recipe','recipe-delete','danger','data-id="'+attr(recipe.id)+'"'):'')+'</div></form>');
  preview(document.querySelector('form[data-form="recipe"]'));
 }

 function refreshItems(form){
  const list=form?.querySelector('[data-recipe-items]');
  if(list)list.innerHTML=items();
  const picker=form?.elements?.recipeFoodId;
  if(picker)picker.innerHTML='<option value="">Choose an ingredient from your library</option>'+ingredientFoods().map(food=>
   '<option value="'+attr(food.id)+'">'+esc(food.name)+' · '+esc(categoryName(food))+'</option>').join('');
  preview(form);
 }


 function ingredientTags(food,category){
  return [...new Set([...(food?.tags||[]).filter(tag=>tag!=='ingredient'&&!tag.startsWith('ingredient-')),
   'ingredient','ingredient-'+category])];
 }
 function ingredientLibraryDialog(){
  const foods=ingredientFoods();
  const categories=INGREDIENT_CATEGORIES.map(([key,label])=>{
   const entries=foods.filter(food=>ingredientCategory(food)===key);
   if(!entries.length)return '';
   return '<section class="cooking-library-group"><h3>'+label+'</h3><div class="cooking-library-rows">'+
    entries.map(food=>'<button type="button" class="cooking-library-row" data-action="ingredient-edit" data-id="'+attr(food.id)+'"><span><strong>'+esc(food.name)+'</strong>'+
     '<small>'+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein / serving'+(food.serving?.text?' · '+esc(food.serving.text):'')+'</small></span><b>›</b></button>').join('')+
    '</div></section>';
  }).filter(Boolean).join('');
  modal('Ingredient library','<div class="cooking-library-screen"><p class="body-copy">One nutrition definition per ingredient. Linked recipes use these facts; past cooked batches stay unchanged.</p>'+
   button('+ New ingredient','ingredient-new','primary small')+
   (categories||'<p class="empty">No saved ingredients yet. Create one here or add ingredients from a recipe.</p>')+'</div>');
 }
 function ingredientEditor(food=null){
  const category=ingredientCategory(food);
  modal(food?'Edit ingredient':'New ingredient','<form class="form cooking-library-editor" data-form="ingredient-definition" novalidate>'+
   '<input type="hidden" name="ingredientId" value="'+attr(food?.id||'')+'">'+
   '<label class="field"><span>Ingredient name</span><input name="ingredientName" maxlength="120" value="'+attr(food?.name||'')+'" required></label>'+
   '<label class="field"><span>Category</span><select name="ingredientCategory">'+categoryOptions(category)+'</select></label>'+
   '<div class="form-grid"><label class="field"><span>Calories per serving</span><input name="ingredientCalories" type="number" step="any" min="0" inputmode="decimal" value="'+attr(food?.calories??'')+'" required></label>'+
   '<label class="field"><span>Protein (g) per serving</span><input name="ingredientProtein" type="number" step="any" min="0" inputmode="decimal" value="'+attr(food?.protein??'')+'" required></label></div>'+
   '<label class="field"><span>Reference serving (optional)</span><input name="ingredientServing" maxlength="120" value="'+attr(food?.serving?.text||'')+'" placeholder="e.g. 1 tablespoon"></label>'+
   '<p class="hint">Nutrition values describe one reference serving. Editing a definition updates linked recipes, not previously prepared batches or logged meals.</p>'+
   '<button class="primary" type="submit">Save ingredient</button></form>');
 }
 function newIngredientPayload(name,calories,protein,category,servingText=''){
  name=String(name||'').trim();
  if(String(calories??'').trim()===''||String(protein??'').trim()==='')throw Error('Enter calories and protein for the reference serving.');
  calories=Number(calories);protein=Number(protein);
  if(!name||name.length>120)throw Error('Enter an ingredient name (120 characters maximum).');
  if(!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0)
   throw Error('Enter valid, nonnegative calories and protein.');
  if(!INGREDIENT_CATEGORIES.some(([key])=>key===category))throw Error('Choose an ingredient category.');
  if(String(servingText).length>120)throw Error('Reference serving is too long.');
  return {name,calories,protein,category,servingText:String(servingText||'').trim()};
 }
 function upsertIngredient(next,payload,existing=null){
  if(!existing){
   const found=matchingIngredient(next.foods,payload.name);
   if(found)return {food:found,created:false,exact:found.calories===payload.calories&&found.protein===payload.protein};
   const food={id:id(),name:payload.name,kind:'food',calories:payload.calories,protein:payload.protein,
    pinned:false,tags:['ingredient','ingredient-'+payload.category],
    ...(payload.servingText?{serving:{amount:1,unit:'serving',text:payload.servingText,state:''}}:{})};
   next.foods.push(food);return {food,created:true,exact:true};
  }
  const conflict=next.foods.some(food=>food.id!==existing.id&&food.name.trim().toLocaleLowerCase()===payload.name.toLocaleLowerCase());
  if(conflict)throw Error('An ingredient or saved food with this name already exists. Link that definition instead.');
  Object.assign(existing,{name:payload.name,calories:payload.calories,protein:payload.protein,
   tags:ingredientTags(existing,payload.category)});
  if(existing.serving)existing.serving={...existing.serving,text:payload.servingText};
  else if(payload.servingText)existing.serving={amount:1,unit:'serving',text:payload.servingText,state:''};
  return {food:existing,created:false,exact:true};
 }

 function cookingSessionForm(){
  const session=getData().activeCooking;
  if(!session)return alert('There is no cooking session to resume.');
  const recipe=session.recipe,steps=cookingSteps(recipe.instructions),completed=session.completedSteps||[];
  const macros=recipeTotals(recipe);
  const fields=recipe.ingredients.map(item=>{
   const field=(key,label,value)=>'<label class="field"><span>'+label+'</span><input '+(key==='name'?'type="text" maxlength="120"':'type="number" min="'+(key==='quantity'?'0.01':'0')+'" step="any" inputmode="decimal"')+
    ' data-cooking-item-id="'+attr(item.id)+'" data-cooking-item-key="'+key+'" value="'+attr(value)+'" required></label>';
   return '<details class="cooking-adjust-ingredient"><summary><strong>'+esc(item.name)+'</strong><small>'+fmt(item.quantity)+' servings</small></summary>'+
    '<div class="cooking-adjust-ingredient-fields">'+field('name','Ingredient',item.name)+
    '<div class="cooking-ingredient-fields">'+field('quantity','Servings',item.quantity)+field('calories','Cal / serving',item.calories)+
    field('protein','Protein (g)',item.protein)+'</div></div></details>';
  }).join('');
  const method=steps.length?steps.map((step,index)=>{
   const done=completed.includes(index);
   return '<button type="button" class="cooking-step'+(done?' done':'')+'" data-action="cooking-toggle-step" data-index="'+index+'" aria-pressed="'+String(done)+'">'+
    '<span class="cooking-step-count">'+(done?'✓':index+1)+'</span><span class="cooking-step-text">'+esc(step)+'</span></button>';
  }).join(''):'<p class="cooking-empty-steps">No instructions saved yet. Add instructions under Adjust batch, then Save progress.</p>';
  modal('Cooking · '+recipe.name,'<form class="form cooking-session-form" data-form="cooking-session" novalidate>'+
   '<div class="cooking-guided-intro"><strong>Cooking in progress</strong><span data-cooking-batch-total>'+fmt(macros.calories)+' cal · '+fmt(macros.protein)+'g protein / batch</span>'+
    '<small>'+fmt(recipe.servings)+' planned portions'+(session.finishedGrams?' · '+fmt(session.finishedGrams)+'g finished weight':'')+'</small></div>'+
   '<section class="cooking-prep"><div class="cooking-heading-row"><h3>Get ready</h3><small>'+recipe.ingredients.length+' ingredients</small></div>'+
    '<div class="cooking-prep-list">'+recipe.ingredients.map(item=>'<div class="cooking-prep-row"><strong>'+esc(item.name)+'</strong>'+
      '<span>'+fmt(item.quantity)+' × '+esc(item.serving?.text||'serving')+'</span></div>').join('')+'</div></section>'+
   '<section class="cooking-method"><div class="cooking-heading-row"><h3>Instructions</h3><small data-cooking-progress>'+
    completed.filter(index=>index<steps.length).length+' / '+steps.length+' complete</small></div>'+
    '<p class="cooking-method-hint">Tap a step when it’s done. Your progress is saved.</p>'+
    '<div class="cooking-step-list">'+method+'</div></section>'+
   '<details class="cooking-adjustments"><summary>Adjust batch details</summary><div class="cooking-adjustments-body">'+
    '<p class="hint">Changes here affect only this cooking session, not the saved recipe or previous batches.</p>'+
    '<label class="field"><span>Portions this batch makes</span><input type="number" name="cookingServings" min="0.01" step="any" inputmode="decimal" value="'+attr(recipe.servings)+'" required></label>'+
    '<label class="field"><span>Finished weight in grams (optional)</span><input type="number" name="finishedGrams" min="0.01" step="any" inputmode="decimal" value="'+attr(session.finishedGrams??'')+'"></label>'+
    '<div class="cooking-totals" data-cooking-totals role="status"></div>'+
    '<section class="cooking-ingredients"><h3>Adjust ingredients</h3>'+fields+'</section>'+
    '<section class="recipe-instructions"><div class="cooking-heading-row"><h3>Edit instructions</h3><small>One step per line</small></div>'+
    '<textarea class="recipe-instructions-note" name="cookingInstructions" maxlength="6000" rows="5">'+esc(recipe.instructions)+'</textarea></section>'+
    '</div></details>'+
   '<div class="form-actions"><button type="submit" class="primary">Save progress</button>'+button('Finish batch','cooking-finish','outline')+
   button('Discard session','cooking-discard','danger')+'</div></form>');
  previewCooking(document.querySelector('form[data-form="cooking-session"]'));
 }

 function captureCooking(form){
  const original=getData().activeCooking;
  if(!original||!form)throw Error('Cooking session unavailable. Reopen Cooking.');
  const session=structuredClone(original);
  session.recipe.servings=form.elements.cookingServings.value.trim()===''?NaN:Number(form.elements.cookingServings.value);
  session.recipe.instructions=form.elements.cookingInstructions.value;
  const weight=form.elements.finishedGrams.value.trim();
  if(weight==='')delete session.finishedGrams;else session.finishedGrams=Number(weight);
  for(const field of form.querySelectorAll('[data-cooking-item-key]')){
   const item=session.recipe.ingredients.find(item=>item.id===field.dataset.cookingItemId);
   if(!item)throw Error('An ingredient was changed. Reopen this session.');
   item[field.dataset.cookingItemKey]=field.dataset.cookingItemKey==='name'?field.value:
    field.value.trim()===''?NaN:Number(field.value);
  }
  return normalizeCookingSession(session);
 }
 function previewCooking(form){
  const status=form?.querySelector('[data-cooking-totals]');
  if(!status)return;
  try{
   const session=captureCooking(form),totals=recipeTotals(session.recipe);
   status.textContent=fmt(totals.calories)+' cal · '+fmt(totals.protein)+'g protein for batch | '+
    fmt(totals.perPortionCalories)+' cal · '+fmt(totals.perPortionProtein)+'g per portion';
  }catch{status.textContent='Enter valid ingredient nutrition, quantities and portions.';}
 }
 function viewBatch(batch){
  const nutrition=recipeTotals(batch.recipe);
  modal('Prepared · '+batch.recipe.name,'<div class="cooking-batch-details"><p class="body-copy">'+
   new Date(batch.preparedAt).toLocaleString()+'</p><div class="cooking-totals">'+
   fmt(nutrition.calories)+' cal · '+fmt(nutrition.protein)+'g protein for batch | '+fmt(nutrition.perPortionCalories)+
   ' cal · '+fmt(nutrition.perPortionProtein)+'g per portion</div>'+
   '<p class="body-copy">'+fmt(batch.recipe.servings)+' portions'+(batch.finishedGrams?' · '+fmt(batch.finishedGrams)+' g finished weight':'')+'</p>'+
   '<h3>Ingredients</h3>'+batch.recipe.ingredients.map(item=>'<p class="cooking-batch-ingredient">'+esc(item.name)+' · '+fmt(item.quantity)+' servings</p>').join('')+
   '<h3>Instructions</h3><p class="body-copy">'+esc(batch.recipe.instructions||'No instructions recorded.')+'</p>'+
   '<p class="hint">This saved batch is a fixed snapshot, not a food log. Portion consumption and leftovers arrive next.</p></div>');
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
  if(action==='ingredient-library-open'){ingredientLibraryDialog();return;}
  if(action==='ingredient-new'){ingredientEditor();return;}
  if(action==='ingredient-edit'){
   const food=ingredientFoods().find(food=>food.id===el.dataset.id);
   if(food)ingredientEditor(food);
   return;
  }
  if(action==='recipe-create-ingredient'||action==='recipe-save-custom-ingredient'){
   const form=el.closest('form[data-form="recipe"]');if(!form||!draft)return;
   try{
    capture(form);
    if(action==='recipe-create-ingredient'&&draft.ingredients.length>=100)throw Error('A recipe can contain at most 100 ingredients.');
    const item=action==='recipe-save-custom-ingredient'?draft.ingredients.find(item=>item.id===el.dataset.id):null;
    if(action==='recipe-save-custom-ingredient'&&!item)throw Error('Ingredient not found.');
    const category=item?form.querySelector('[data-recipe-category="'+CSS.escape(item.id)+'"]')?.value:form.elements.newIngredientCategory.value;
    const payload=item?newIngredientPayload(item.name,item.calories,item.protein,category):
     newIngredientPayload(form.elements.newIngredientName.value,form.elements.newIngredientCalories.value,
      form.elements.newIngredientProtein.value,category,form.elements.newIngredientServing.value);
    const next=structuredClone(getData()),found=matchingIngredient(next.foods,payload.name);
    if(found&&(found.calories!==payload.calories||found.protein!==payload.protein)&&
       !confirm('This ingredient already exists with '+fmt(found.calories)+' calories and '+fmt(found.protein)+'g protein per serving. Link to those existing facts instead?'))return;
    const result=upsertIngredient(next,payload);
    const food=result.food;
    if(!food.tags?.includes('ingredient'))food.tags=ingredientTags(food,payload.category);
    if(item){Object.assign(item,ingredientSnapshot(food,item.id,item.quantity));expandedIngredientId=item.id;}
    else{
     const added=ingredientSnapshot(food,id());draft.ingredients.push(added);expandedIngredientId=added.id;
    }
    replaceData(normalizeData(next));refreshItems(form);
    if(action==='recipe-create-ingredient'){
     for(const key of ['newIngredientName','newIngredientCalories','newIngredientProtein','newIngredientServing'])form.elements[key].value='';
    }
    await persist();
   }catch(error){alert(error?.message||'Unable to add ingredient.');}
   return;
  }
  if(action==='recipe-link-ingredient'){
   const form=el.closest('form[data-form="recipe"]');if(!form||!draft)return;
   capture(form);
   const item=draft.ingredients.find(item=>item.id===el.dataset.id);
   const food=ingredientFoods().find(food=>food.id===form.querySelector('[data-recipe-link="'+CSS.escape(el.dataset.id)+'"]')?.value);
   if(!item||!food){alert('Choose a library ingredient to link.');return;}
   Object.assign(item,ingredientSnapshot(food,item.id,item.quantity));
   expandedIngredientId=item.id;refreshItems(form);return;
  }
  if(action==='recipe-promote-ingredient'){
   const form=el.closest('form[data-form="recipe"]');if(!form||!draft)return;
   capture(form);
   const item=draft.ingredients.find(item=>item.id===el.dataset.id),next=structuredClone(getData());
   const food=next.foods.find(food=>food.id===item?.sourceFoodId);
   if(!food)return alert('The original Food Library definition is missing.');
   food.tags=ingredientTags(food,'other');
   replaceData(normalizeData(next));expandedIngredientId=item.id;refreshItems(form);await persist();return;
  }
  if(action==='cooking-toggle-step'){
   const form=el.closest('form[data-form="cooking-session"]'),index=Number(el.dataset.index);
   if(!form||!Number.isInteger(index)||index<0)return;
   try{
    const session=captureCooking(form),steps=cookingSteps(session.recipe.instructions);
    if(index>=steps.length)return;
    const done=new Set(session.completedSteps||[]);
    if(done.has(index))done.delete(index);else done.add(index);
    session.completedSteps=[...done].sort((a,b)=>a-b);
    const next=structuredClone(getData());next.activeCooking=session;
    replaceData(normalizeData(next));
    el.classList.toggle('done',done.has(index));el.setAttribute('aria-pressed',String(done.has(index)));
    const marker=el.querySelector('.cooking-step-count');if(marker)marker.textContent=done.has(index)?'✓':String(index+1);
    const progress=form.querySelector('[data-cooking-progress]');
    if(progress)progress.textContent=session.completedSteps.length+' / '+steps.length+' complete';
    await persist();
   }catch(error){alert(error?.message||'Unable to save cooking step.');}
   return;
  }
  if(action==='cooking-start'){
   if(getData().activeCooking)return alert('Finish or discard your existing cooking session before starting another.');
   const recipe=getRecipe(el.dataset.id);if(!recipe)return;
   try{const next=structuredClone(getData());next.activeCooking=beginCooking(currentRecipe(recipe),id());
    replaceData(normalizeData(next));tab='cooking';render();cookingSessionForm();await persist();}
   catch(error){alert(error?.message||'Unable to start cooking.');}return;
  }
  if(action==='cooking-resume'){cookingSessionForm();return;}
  if(action==='cooking-discard'){
   if(!getData().activeCooking||!confirm('Discard this cooking session? The saved recipe and finished batches will remain.'))return;
   const next=structuredClone(getData());next.activeCooking=null;
   replaceData(normalizeData(next));close(true);tab='cooking';render();await persist();return;
  }
  if(action==='cooking-finish'){
   const form=el.closest('form[data-form="cooking-session"]');
   try{const session=captureCooking(form),next=structuredClone(getData());
    if(next.preparedBatches.length>=1500)throw Error('Export and archive older prepared batches first.');
    const batch=finishCooking(session,id());next.preparedBatches.push(batch);next.activeCooking=null;
    replaceData(normalizeData(next));close(true);tab='cooking';render();await persist();}
   catch(error){alert(error?.message||'Unable to finish the batch.');}return;
  }
  if(action==='cooking-view-batch'){
   const batch=(getData().preparedBatches||[]).find(item=>item.id===el.dataset.id);
   if(batch)viewBatch(batch);return;
  }
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
    const food=ingredientFoods().find(x=>x.id===form.elements.recipeFoodId.value);
    if(!food){alert('Choose an ingredient from the library first.');return;}
    draft.ingredients.push(ingredientSnapshot(food,id()));
   }
   expandedIngredientId=draft.ingredients.at(-1)?.id;
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
   if(form.dataset.form==='cooking-session'){
    const session=captureCooking(form),next=structuredClone(getData());next.activeCooking=session;
    replaceData(normalizeData(next));close(true);tab='cooking';render();await persist();return;
   }
   if(form.dataset.form==='recipe'){
    if(!draft)return;
    capture(form);
    if(!draft.ingredients.length)throw Error('Add at least one ingredient first.');
    const recipe=normalizeRecipes([currentRecipe(draft)])[0],next=structuredClone(getData());
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
    recipe.id=id();for(const ingredient of recipe.ingredients){
     ingredient.id=id();delete ingredient.sourceFoodId;
     const matched=matchingIngredient(getData().foods,ingredient.name);
     if(matched){Object.assign(ingredient,ingredientSnapshot(matched,ingredient.id,ingredient.quantity));}
    }
    const next=structuredClone(getData());next.recipes.push(recipe);
    replaceData(normalizeData(next));close(true);tab='cooking';render();await persist();
   }
  }catch(error){alert(error?.message||'Unable to save recipe.');}
 }
 return {get tab(){return tab;},tabs,home,onInput:form=>form?.dataset.form==='cooking-session'?previewCooking(form):preview(form),handleAction,onSubmit};
}
