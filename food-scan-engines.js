// Everyday v154.8: dynamically load camera/OCR libraries only when requested.
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
export async function stopBarcode(){
 const previous=running;running=null;if(!previous)return;
 try{if(previous.running)await previous.scanner.stop();}catch{}
 try{previous.scanner.clear();}catch{}
}
export async function startBarcodeCamera(id,onCode){
 await stopBarcode();
 await load(barcodeURL,'Html5Qrcode');
 const scanner=new globalThis.Html5Qrcode(id,{formatsToSupport:formats(),verbose:false});
 const session={scanner,running:false};running=session;
 try{
  await scanner.start({facingMode:'environment'},{fps:10},value=>{if(running===session)onCode(value);},()=>{});
  session.running=true;
 }catch(error){await stopBarcode();throw error;}
}
export async function decodeBarcodeImage(id,file){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose an image.');
 await stopBarcode();await load(barcodeURL,'Html5Qrcode');
 const scanner=new globalThis.Html5Qrcode(id,{formatsToSupport:formats(),verbose:false});
 try{return await scanner.scanFile(file,false);}
 finally{try{scanner.clear();}catch{}}
}
export async function recognizeNutritionImage(file,onProgress=()=>{}){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose a photo of Nutrition Facts.');
 if(file.size>20000000)throw Error('Photo is too large. Use an image under 20 MB.');
 await load(ocrURL,'Tesseract');
 const worker=await globalThis.Tesseract.createWorker('eng',1,{logger:message=>{
  if(message.status==='recognizing text')onProgress(Math.round((message.progress||0)*100));
 }});
 recognizer=worker;
 try{const result=await worker.recognize(file);return result.data?.text||'';}
 finally{if(recognizer===worker)recognizer=null;await worker.terminate();}
}
export function cancelNutritionRecognition(){
 if(recognizer){const old=recognizer;recognizer=null;void old.terminate().catch(()=>{});}
}
