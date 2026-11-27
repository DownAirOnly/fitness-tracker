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
const quaggaURL='https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.13.0/dist/quagga.min.js';
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

function validRetailBarcode(raw){
 const code=String(raw||'').trim();
 if(!/^(?:\d{8}|\d{12}|\d{13})$/.test(code))return false;
 let sum=0;
 for(let i=0;i<code.length-1;i++)
  sum+=Number(code[i])*(((code.length-1-i)%2)===1?3:1);
 return (10-sum%10)%10===Number(code.at(-1));
}
async function nativeBarcode(canvas){
 if(typeof globalThis.BarcodeDetector!=='function')return null;
 try{
  const detector=new globalThis.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
  const matches=await detector.detect(canvas);
  return matches.map(x=>x.rawValue).find(validRetailBarcode)||null;
 }catch{return null;}
}
async function quaggaBarcode(canvas){
 try{
  await load(quaggaURL,'Quagga');
  const result=await new Promise(resolve=>{
   globalThis.Quagga.decodeSingle({
    src:canvas.toDataURL('image/png'),numOfWorkers:0,
    inputStream:{size:0,singleChannel:false},locate:true,
    locator:{patchSize:'medium',halfSample:false},
    decoder:{readers:['ean_reader','upc_reader','ean_8_reader']}
   },decoded=>resolve(decoded?.codeResult?.code||null));
  });
  return validRetailBarcode(result)?result:null;
 }catch{return null;}
}

export async function decodeBarcodeImage(id,file){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose an image.');
 if(file.size>20000000)throw Error('Photo is too large. Use an image under 20 MB.');
 await stopBarcode();await load(barcodeURL,'Html5Qrcode');
 const scanner=new globalThis.Html5Qrcode(id,{formatsToSupport:formats(),verbose:false});
 let source=null;
 try{
  try{
   const detected=await scanner.scanFile(file,false);
   if(validRetailBarcode(detected))return detected;
  }catch{}
  source=await openImage(file);
  // A package barcode can occupy only a tenth of a full photo. First try
  // narrow barcode-friendly crops, with a separate 1D-focused decoder.
  const crops=[
   {x:.37,y:.66,w:.47,h:.28},
   {x:.25,y:.53,w:.72,h:.45},
   {x:.08,y:.46,w:.84,h:.51},
   {x:.08,y:.20,w:.84,h:.60},
   {x:0,y:0,w:.58,h:1},
   {x:.42,y:0,w:.58,h:1}
  ];
  for(const [i,box] of crops.entries()){
   const canvas=cropCanvas(source,box,{minimum:1200});
   try{
    const native=await nativeBarcode(canvas);
    if(native)return native;
    try{
     const decoded=await scanner.scanFile(await canvasFile(canvas),false);
     if(validRetailBarcode(decoded))return decoded;
    }catch{}
    // Quagga specializes in EAN/UPC linear barcodes. Load it only after
    // the existing decoder fails; bound work on large images.
    if(i<4){
     const backup=await quaggaBarcode(canvas);
     if(backup)return backup;
    }
   }finally{canvas.width=0;canvas.height=0;}
  }
  throw Error('Barcode could not be decoded from the image.');
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

function allOcrWords(blocks){
 const words=[];
 for(const block of blocks||[])
  for(const paragraph of block.paragraphs||[])
   for(const line of paragraph.lines||[])
    for(const word of line.words||[])
     if(word?.text&&word.bbox)words.push(word);
 return words;
}
function calorieRowBox(blocks,width,height,panel){
 const words=allOcrWords(blocks);
 const found=words.find(w=>/^calor(?:ies|y)/i.test(w.text));
 const title=words.find(w=>/^nutrition\b/i.test(w.text));
 if(found){
  const b=found.bbox,letterHeight=Math.max(12,b.y1-b.y0);
  const rightEdge=panel?Math.min(width,(panel.x+panel.w)*width):b.x0+(b.x1-b.x0)*3.4;
  const left=Math.max(0,b.x0-letterHeight*.3);
  const top=Math.max(0,b.y0-letterHeight*.55);
  return {x:left/width,y:top/height,w:Math.min(1-left/width,(rightEdge-left)/width),
   h:Math.min(1-top/height,letterHeight*2.25/height)};
 }
 if(title&&panel){
  const b=title.bbox,heightOfTitle=Math.max(20,b.y1-b.y0);
  const top=b.y0+heightOfTitle*2.6;
  return {x:panel.x,y:Math.max(0,top/height),
   w:panel.w,h:Math.min(1-top/height,heightOfTitle*2.15/height)};
 }
 return null;
}
function calorieFromRow(text,confidence){
 // Only use standalone 2–4 digit numbers from a Calories-specific row,
 // never free-floating numbers from the whole photograph.
 if(!Number.isFinite(confidence)||confidence<42)return null;
 const normalized=String(text||'').replace(/[,;]/g,' ').trim();
 const explicit=parseNutritionLabel(normalized);
 if(explicit.calories!==null)return explicit.calories;
 const numeric=normalized.match(/\b\d{2,4}\b/g)||[];
 if(numeric.length!==1)return null;
 const amount=Number(numeric[0]);
 return amount>=20&&amount<=999?amount:null;
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
  let calorieCandidate=null;
  const focusedHasCalories=scored.some(x=>x.focused&&x.parsed.calories!==null);
  if(!focusedHasCalories){
   const row=calorieRowBox(first.data?.blocks,source.width,source.height,detected);
   if(row&&row.w>.05&&row.h>.008){
    const canvas=cropCanvas(source,row,{minimum:1550});
    try{
     for(const mode of ['7','6']){
      if(recognizer!==worker)throw Error('Scan cancelled.');
      await worker.setParameters({tessedit_pageseg_mode:mode});
      const res=await worker.recognize(canvas);
      const amount=calorieFromRow(res.data?.text,res.data?.confidence);
      if(amount!==null){calorieCandidate=amount;break;}
     }
    }finally{canvas.width=0;canvas.height=0;}
   }
  }
  const focused=scored.filter(x=>x.focused&&(x.parsed.calories!==null||x.parsed.protein!==null))
   .sort((a,b)=>b.score-a.score);
  const original=scored[0];
  // If the full package suggests just one isolated number but no cropped
  // Nutrition Facts region confirms it, suppress it. The original cookie
  // example read "2g" as "20g" beside an unrecognized calorie count.
  const best=focused[0]||(original?.parsed.calories!==null&&original?.parsed.protein!==null?original:null);
  return {text:best?.text||'',focused:!!best?.focused,
   calorieCandidate,
   partial:!best||(best.parsed.calories===null&&calorieCandidate===null)||best.parsed.protein===null};
 }finally{
  source?.release();
  if(recognizer===worker)recognizer=null;
  try{await worker.terminate();}catch{}
 }
}
export function cancelNutritionRecognition(){
 if(recognizer){const old=recognizer;recognizer=null;void old.terminate().catch(()=>{});}
}
