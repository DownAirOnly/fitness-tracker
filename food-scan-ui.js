// Everyday v154.8: scanner sheet. All values are reviewed before normal Save.
import {normalizeBarcodeProduct,parseNutritionLabel} from './food-scan-model.js?v=154.8.3';
import {startBarcodeCamera,stopBarcode,decodeBarcodeImage,recognizeNutritionImage,cancelNutritionRecognition} from './food-scan-engines.js?v=154.8.3';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isInteger(v)?String(v):Number(v).toFixed(1).replace(/\.0$/,'');
let seq=0;
export function createFoodScanner(onImport){
 let active=null;
 function live(s){return active===s&&!s.closed;}
 function status(s,message,error=false){
  if(!live(s))return;
  const el=s.root.querySelector('[data-scan-status]');
  if(el){el.textContent=message;el.dataset.error=error?'true':'false';}
 }
 function busy(s,value){
  if(!live(s))return;
  s.busy=value;
  s.root.querySelectorAll('input[type=file],[data-scan-kind="camera"],[data-scan-kind="lookup"],[data-scan-kind="apply"]').forEach(el=>{el.disabled=value;});
 }
 function close(){
  const s=active;if(!s)return;
  s.closed=true;active=null;
  s.abort?.abort();cancelNutritionRecognition();void stopBarcode();
  s.root.remove();document.body.classList.remove('food-scan-open');
 }
 function preview(s,result){
  if(!live(s))return;
  s.result=result;
  const complete=result.calories!==null&&result.protein!==null;
  const root=s.root.querySelector('[data-scan-result]');
  root.hidden=false;
  root.innerHTML='<h3>Review imported values</h3>'+
   (result.name?'<strong>'+esc(result.name)+'</strong>':'<small>Your existing food name will be kept.</small>')+
   '<div class="food-scan-values"><span>Calories<b>'+(result.calories===null?'Not found':fmt(result.calories))+'</b></span>'+
   '<span>Protein<b>'+(result.protein===null?'Not found':fmt(result.protein)+' g')+'</b></span></div>'+
   '<p class="food-scan-basis">'+esc(result.basis)+'</p>'+
   (result.note?'<p class="food-scan-warning">'+esc(result.note)+'</p>':'')+
   '<small>Source: '+esc(result.source)+(s.code?' · <a href="https://world.openfoodfacts.org/product/'+encodeURIComponent(s.code)+'" target="_blank" rel="noopener noreferrer">View product</a>':'')+'</small>'+
   '<button type="button" class="food-scan-primary" data-scan-kind="apply">Import into food form</button>';
  status(s,complete?'Review the values before importing.':'One or more values are missing. Enter them manually after importing.');
 }
 async function lookup(s,raw){
  if(!live(s)||s.busy)return;
  const code=String(raw||'').replace(/[\s-]/g,'');
  if(!/^\d{8,14}$/.test(code)){status(s,'Use a numeric barcode with 8 to 14 digits.',true);return;}
  s.code=code.length===13&&code.startsWith('0')?code.slice(1):code;
  busy(s,true);status(s,'Barcode '+s.code+' recognized. Looking up its product…');
  await stopBarcode();
  const controller=new AbortController();s.abort=controller;
  try{
   // UPC-A is sometimes detected as EAN-13 with an extra leading zero.
   // Query both common representations without confusing "not in database"
   // with "could not scan the photo".
   const candidates=code.length===13&&code.startsWith('0')?[code.slice(1),code]:
    code.length===12?[code,'0'+code]:[code];
   let data=null;
   for(const candidate of candidates){
    const url='https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(candidate)+'.json?fields=product_name,product_name_en,brands,nutriments,serving_size,serving_quantity';
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Product lookup failed (HTTP '+response.status+').');
    data=await response.json();if(!live(s))return;
    if(data.status===1&&data.product)break;
   }
   if(!data||data.status!==1||!data.product){
    status(s,'Barcode '+s.code+' was read successfully, but no product details were found in Open Food Facts. Scan its Nutrition Facts label instead.',true);
    return;
   }
   const result=normalizeBarcodeProduct(data.product);
   if(!result.name&&result.calories===null&&result.protein===null){status(s,'Product has no usable details. Try the nutrition label.',true);return;}
   preview(s,result);
  }catch(error){if(live(s)&&error.name!=='AbortError')status(s,error.message||'Barcode lookup unavailable.',true);}
  finally{if(live(s))busy(s,false);}
 }
 async function camera(s){
  if(!live(s)||s.busy)return;
  s.detected=false;busy(s,true);status(s,'Opening rear camera…');
  try{
   await startBarcodeCamera(s.cameraId,code=>{
    if(!live(s)||s.busy||s.detected)return;
    s.detected=true;void lookup(s,code);
   });
   if(live(s))status(s,'Aim the camera at the barcode.');
   else void stopBarcode();
  }catch(error){if(live(s))status(s,'Camera unavailable. Use a barcode photo or enter its digits. '+(error.message||''),true);}
  finally{if(live(s))busy(s,false);}
 }
 async function barcodePhoto(s,file){
  if(!live(s)||s.busy)return;
  busy(s,true);status(s,'Reading barcode photo and checking closer image regions…');let code=null;
  try{code=await decodeBarcodeImage(s.cameraId,file);}
  catch{status(s,'No barcode detected after trying several closer regions. Take a sharper barcode photo or enter the printed digits.',true);}
  finally{if(live(s))busy(s,false);}
  if(code&&live(s))void lookup(s,code);
 }
 async function labelPhoto(s,file){
  if(!live(s)||s.busy)return;
  busy(s,true);status(s,'Preparing label recognition. The first use downloads an OCR engine…');
  try{
   const recognition=await recognizeNutritionImage(file,pct=>status(s,'Reading the Nutrition Facts label… '+pct+'%'));
   if(!live(s))return;
   const result=parseNutritionLabel(recognition.text);
   if(result.calories===null&&Number.isFinite(recognition.calorieCandidate)){
    result.calories=recognition.calorieCandidate;
    result.note+=' Calories were extracted from a close-up of the calorie line; confirm the number before importing.';
   }
   if(result.calories===null&&result.protein===null){
    status(s,'Could not confidently read Calories or Protein. Try a closer photo of only the Nutrition Facts box.',true);return;
   }
   if(recognition.partial||!recognition.focused)
    result.note+=' Some values could not be confirmed from a focused label region. Compare carefully with the package.';
   preview(s,result);
  }catch(error){if(live(s))status(s,'Label scan failed: '+(error.message||'Unknown error'),true);}
  finally{if(live(s))busy(s,false);}
 }
 function open(mode='barcode'){
  close();
  const s={mode,closed:false,busy:false,detected:false,code:'',result:null,cameraId:'everyday-barcode-camera-'+(++seq)};
  const root=document.createElement('div');root.className='food-scan-overlay';
  root.innerHTML='<div class="food-scan-shade" data-scan-kind="close"></div>'+
   '<section class="food-scan-dialog" role="dialog" aria-modal="true" aria-label="'+(mode==='barcode'?'Barcode scanner':'Nutrition label scanner')+'">'+
   '<div class="food-scan-header"><h2>'+(mode==='barcode'?'Scan barcode':'Scan nutrition label')+'</h2><button type="button" data-scan-kind="close" aria-label="Close scan">✕</button></div>'+
   (mode==='barcode'?
    '<p>Look up calories and protein from a package barcode.</p>'+
    '<div class="food-scan-camera" id="'+s.cameraId+'"></div>'+
    '<button type="button" class="food-scan-primary" data-scan-kind="camera">Start camera</button>'+
    '<label class="food-scan-file">Use barcode photo<input type="file" accept="image/*" data-scan-file="barcode"></label>'+
    '<form class="food-scan-manual" data-scan-manual><label>Or enter barcode<input type="text" name="barcode" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="UPC / EAN digits"></label><button type="submit" data-scan-kind="lookup">Find</button></form>'+
    '<button type="button" class="food-scan-switch" data-scan-kind="label">Scan label instead</button>':
    '<p>Take a clear photo of the Nutrition Facts panel. Text is recognized on your device.</p>'+
    '<label class="food-scan-file">Take or choose label photo<input type="file" accept="image/*" data-scan-file="label"></label>'+
    '<button type="button" class="food-scan-switch" data-scan-kind="barcode">Scan barcode instead</button>')+
   '<div class="food-scan-status" data-scan-status role="status" aria-live="polite">Nothing will be saved automatically.</div>'+
   '<div class="food-scan-result" data-scan-result hidden></div>'+
   '<small class="food-scan-privacy">'+(mode==='barcode'?'Barcode digits are sent to Open Food Facts for lookup.':'Nutrition Facts photos are processed on this device, not uploaded.')+'</small>'+
   '</section>';
  s.root=root;active=s;document.body.appendChild(root);document.body.classList.add('food-scan-open');
  root.addEventListener('click',event=>{
   const el=event.target.closest('[data-scan-kind]');if(!el||!live(s))return;
   const action=el.dataset.scanKind;
   if(action==='close'){close();return;}
   if(action==='barcode'||action==='label'){open(action);return;}
   if(action==='camera'){void camera(s);return;}
   if(action==='apply'&&s.result){
    try{onImport(s.result);close();}catch(error){status(s,error.message||'Could not import values.',true);}
   }
  });
  root.addEventListener('submit',event=>{
   if(!event.target.matches('[data-scan-manual]'))return;
   event.preventDefault();if(live(s))void lookup(s,event.target.elements.barcode.value);
  });
  root.addEventListener('change',event=>{
   const field=event.target.closest('[data-scan-file]');if(!field||!field.files?.[0]||!live(s))return;
   const file=field.files[0];field.value='';
   if(field.dataset.scanFile==='barcode')void barcodePhoto(s,file);else void labelPhoto(s,file);
  });
 }
 return {open,close};
}
