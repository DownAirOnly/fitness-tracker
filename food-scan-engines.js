// Everyday v154.8.2 — bounded, device-only barcode/OCR image preprocessing.
import {parseNutritionLabel} from './food-scan-model.js?v=154.8.2';
const libs=new Map();
function load(src,name){
 if(globalThis[name])return Promise.resolve();
 if(!libs.has(src))libs.set(src,new Promise((resolve,reject)=>{
  const element=document.createElement('script');element.async=true;element.src=src;
  element.onload=()=>globalThis[name]?resolve():reject(Error(name+' unavailable.'));
  element.onerror=()=>reject(Error('Scanner download unavailable. Check your connection.'));
  document.head.appendChild(element);
 }).catch(error=>{libs.delete(src);throw error;}));
 return libs.get(src);
}
const barcodeURL='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const ocrURL='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
let running=null,recognizer=null;
function formats(){
 const f=globalThis.Html5QrcodeSupportedFormats;
 return [f.EAN_13,f.EAN_8,f.UPC_A,f.UPC_E,f.ITF,f.CODE_128];
}
async function openImage(file){
 if(typeof createImageBitmap==='function'){
  try{
   const bitmap=await createImageBitmap(file);
   return {image:bitmap,width:bitmap.width,height:bitmap.height,release:()=>bitmap.close?.()};
  }catch{}
 }
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not open the photo.'));img.src=url;});
  return {image:img,width:img.naturalWidth,height:img.naturalHeight,release:()=>{}};
 }finally{URL.revokeObjectURL(url);}
}
function cropCanvas(source,box,{threshold=false,minimum=1000}={}){
 const x=Math.round(source.width*box.x),y=Math.round(source.height*box.y);
 const w=Math.max(1,Math.min(source.width-x,Math.round(source.width*box.w)));
 const h=Math.max(1,Math.min(source.height-y,Math.round(source.height*box.h)));
 const width=Math.min(1800,Math.max(w,minimum)),scale=width/w;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(h*scale);
 const context=canvas.getContext('2d',{willReadFrequently:threshold});
 if(!context)throw Error('Could not process this image.');
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 context.drawImage(source.image,x,y,w,h,0,0,canvas.width,canvas.height);
 if(threshold){
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){
   const brightness=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2];
   const color=brightness>150?255:0;
   pixels.data[i]=color;pixels.data[i+1]=color;pixels.data[i+2]=color;
  }
  context.putImageData(pixels,0,0);
 }
 return canvas;
}
function canvasFile(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'barcode-crop.png',{type:'image/png'})):reject(Error('Unable to process photo.')),'image/png'));
}
export async function stopBarcode(){
 const previous=running;running=null;if(!previous)return;
 try{if(previous.running)await previous.scanner.stop();}catch{}
 try{previous.scanner.clear();}catch{}
}
export async function startBarcodeCamera(id,onCode){
 await stopBarcode();await load(barcodeURL,'Html5Qrcode');
 const scanner=new globalThis.Html5Qrcode(id,{formatsToSupport:formats(),verbose:false});
 const session={scanner,running:false};running=session;
 try{
  await scanner.start({facingMode:'environment'},{fps:10},value=>{if(running===session)onCode(value);},()=>{});
  session.running=true;
 }catch(error){await stopBarcode();throw error;}
}
export async function decodeBarcodeImage(id,file){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose an image.');
 if(file.size>20000000)throw Error('Photo is too large. Use an image under 20 MB.');
 await stopBarcode();await load(barcodeURL,'Html5Qrcode');
 const scanner=new globalThis.Html5Qrcode(id,{formatsToSupport:formats(),verbose:false});
 let source=null;
 try{
  // Full-photo decoding can reduce an otherwise legible barcode to a tiny
  // fraction of the picture. Retry centered and edge crops at useful scale.
  try{return await scanner.scanFile(file,false);}catch{}
  source=await openImage(file);
  const crops=[
   {x:.25,y:.48,w:.72,h:.50}, // common lower-right package barcode
   {x:.0,y:.48,w:1,h:.50},
   {x:.08,y:.20,w:.84,h:.60},
   {x:.0,y:.0,w:.58,h:1},
   {x:.42,y:.0,w:.58,h:1}
  ];
  for(const box of crops){
   const canvas=cropCanvas(source,box,{minimum:1100});
   try{return await scanner.scanFile(await canvasFile(canvas),false);}catch{}
   finally{canvas.width=0;canvas.height=0;}
  }
  throw Error('No barcode found in the photo, including closer image regions.');
 }finally{
  source?.release();
  try{scanner.clear();}catch{}
 }
}
function findPanelRect(blocks,width,height){
 const words=[];
 for(const block of blocks||[])
  for(const p of block.paragraphs||[])
   for(const l of p.lines||[])
    for(const w of l.words||[])if(w?.text&&w.bbox)words.push(w);
 const heading=words.find(w=>/^nutrition\b/i.test(w.text));
 const calories=words.find(w=>/^calor(?:ies|y)/i.test(w.text));
 const word=heading||calories;
 if(!word)return null;
 const box=word.bbox,wordWidth=Math.max(20,box.x1-box.x0);
 const imageWidth=heading?wordWidth*2.8:wordWidth*3.2;
 const x=Math.max(0,(box.x0-wordWidth*.17)/width);
 const y=Math.max(0,(box.y0-(heading?wordWidth*.18:wordWidth*1.2))/height);
 return {x,y,w:Math.min(1-x,imageWidth/width),
  h:Math.min(1-y,(heading?imageWidth*2.65:imageWidth*2.3)/height)};
}
export async function recognizeNutritionImage(file,onProgress=()=>{}){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose a photo of Nutrition Facts.');
 if(file.size>20000000)throw Error('Photo is too large. Use an image under 20 MB.');
 await load(ocrURL,'Tesseract');
 const worker=await globalThis.Tesseract.createWorker('eng',1,{logger:message=>{
  if(message.status==='recognizing text')onProgress(Math.round((message.progress||0)*100));
 }});
 recognizer=worker;
 let source=null;
 const scored=[];
 const add=(text,focused)=>{
  const parsed=parseNutritionLabel(text);
  const score=(parsed.calories!==null?3:0)+(parsed.protein!==null?3:0)+(focused?2:0);
  scored.push({text,score,focused,parsed});
 };
 try{
  onProgress(0);
  const first=await worker.recognize(file,{}, {blocks:true});
  add(first.data?.text||'',false);
  if(recognizer!==worker)throw Error('Scan cancelled.');
  source=await openImage(file);
  const detected=findPanelRect(first.data?.blocks,source.width,source.height);
  // The first fallback isolates the most common label positions in a photo.
  // If a full image already produced good data, one focused second opinion
  // is still required to avoid trusting numbers from adjacent columns.
  const boxes=detected?[detected,{x:.16,y:.18,w:.36,h:.53}]:
   [{x:.16,y:.18,w:.36,h:.53},{x:.39,y:.12,w:.55,h:.73}];
  await worker.setParameters({tessedit_pageseg_mode:'6'});
  for(const [i,box] of boxes.entries()){
   if(recognizer!==worker)throw Error('Scan cancelled.');
   const canvas=cropCanvas(source,box,{minimum:950,threshold:i===1});
   try{
    const result=await worker.recognize(canvas);
    add(result.data?.text||'',true);
   }finally{canvas.width=0;canvas.height=0;}
   const last=scored.at(-1);
   if(last?.parsed.calories!==null&&last?.parsed.protein!==null)break;
  }
  const ranked=scored.slice().sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  // Do not manufacture a value from other image regions if a field
  // cannot be reliably read from the selected Nutrition Facts panel.
  return {text:best?.text||'',focused:!!best?.focused,
   partial:best?.parsed?.calories===null||best?.parsed?.protein===null};
 }finally{
  source?.release();
  if(recognizer===worker)recognizer=null;
  try{await worker.terminate();}catch{}
 }
}
export function cancelNutritionRecognition(){
 if(recognizer){const old=recognizer;recognizer=null;void old.terminate().catch(()=>{});}
}
