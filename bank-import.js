// v84: browser-only Bank of America CSV reader and ID-anchored ChatGPT enrichment.
// Statement identity does not contain the statement label so overlapping exports deduplicate.
// Bank amounts and bank descriptions stay immutable when enrichment CSV is applied.
import {parseCSV,validDate,normalizeData,emptyData} from './data.js?v=84';
import {parseFinanceAmount,formatFinanceAmount,financeDuplicateKey} from './finance-model.js?v=83';

const headerKey=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const dateKeys=['posteddate','postingdate','date'],descriptionKeys=['description','payeedescription','payee','merchant','name'];
const amountKeys=['amount','transactionamount'],referenceKeys=['referencenumber','reference','transactionid','transactionnumber'];
const positiveNumber=/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/;
const cleanText=(text,max=160)=>String(text??'').trim().slice(0,max);
const firstIndex=(keys,names)=>keys.findIndex(k=>names.includes(k));
const cleanLine=value=>String(value??'').trim();
function checkLabel(value,name,max){
 const text=String(value??'').trim();
 if(!text||text.length>max)throw Error(name+' must contain 1–'+max+' characters.');
 return text;
}
function bankDate(value){
 const text=cleanLine(value);
 if(validDate(text))return text;
 const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
 if(!match)throw Error('Invalid bank date "'+text+'"; expected MM/DD/YYYY or YYYY-MM-DD.');
 const result=match[3]+'-'+match[1].padStart(2,'0')+'-'+match[2].padStart(2,'0');
 if(!validDate(result))throw Error('Invalid calendar date "'+text+'".');
 return result;
}
function signedBankCents(value){
 let text=cleanLine(value).replace(/^\$/,'');
 if(!text)throw Error('Amount is missing.');
 let negative=false;
 if(/^\(.*\)$/.test(text)){negative=true;text=text.slice(1,-1);}
 else if(text.startsWith('-')){negative=true;text=text.slice(1);}
 else if(text.startsWith('+'))text=text.slice(1);
 if(text.startsWith('$'))text=text.slice(1);
 if(!positiveNumber.test(text))throw Error('Invalid signed dollar amount "'+value+'".');
 const cents=parseFinanceAmount(text);
 return negative?-cents:cents;
}
function moneyCentsForBalance(value){
 const text=cleanLine(value);
 if(!text)return '';
 // Running balance is identity evidence only; it is not used to calculate the transaction.
 return String(signedBankCents(text));
}
export function bankHash(text){
 let a=2166136261;
 for(let i=0;i<text.length;i++){a^=text.charCodeAt(i);a=Math.imul(a,16777619);}
 return (a>>>0).toString(36);
}
function bankFingerprint({accountLabel,date,description,signedCents,reference,balanceCents}){
 return [accountLabel.toLowerCase(),date,description.toLowerCase().replace(/\s+/g,' '),
  String(signedCents),reference||'',balanceCents||''].join('\u001f');
}
function accountSummaryRow(desc){
 return /^(beginning balance|ending balance|total credits|total debits|summary|balance forward|total activity)\b/i.test(desc);
}
const transferDescription=/(?:\b(?:transfer|xfer)\b|\bcredit card payment\b|\bpayment\s*-\s*thank you\b|\bonline payment\b|\bautopay payment\b)/i;
function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;}
const enrichColumns=[
 'recordType','id','postedDate','kind','amountCents','bankDescription','accountLabel','statementLabel',
 'description','category','subcategory','merchant','note','purchaseDate','time','itemization'
];
export function financeEnrichmentCSV(transactions){
 const rows=[enrichColumns.join(',')];
 for(const tx of [...transactions].sort((a,b)=>b.date.localeCompare(a.date))){
  const values=[
   'enrichment',tx.id,tx.date,tx.kind,tx.amountCents,tx.bankDescription||'',tx.accountLabel||'',
   tx.statementLabel||'',tx.description,tx.category,tx.subcategory||'',tx.merchant||'',
   tx.note||'',tx.purchaseDate||'',tx.time||'',tx.itemization||''
  ];
  rows.push(values.map(csvCell).join(','));
 }
 return rows.join('\r\n')+'\r\n';
}
export function readBofaCSV(text,{accountLabel,statementLabel}={}){
 accountLabel=checkLabel(accountLabel,'Account label',120);
 statementLabel=checkLabel(statementLabel,'Statement label',160);
 const rows=parseCSV(String(text||'').replace(/^\uFEFF/,''));
 let headerIndex=-1,columns;
 for(let i=0;i<Math.min(60,rows.length);i++){
  const keys=rows[i].map(headerKey);
  if(firstIndex(keys,dateKeys)>=0&&firstIndex(keys,descriptionKeys)>=0&&firstIndex(keys,amountKeys)>=0){
   headerIndex=i;columns=keys;break;
  }
 }
 if(headerIndex<0)throw Error('Bank of America header not found. Expected Date, Description, Amount (or Posted Date, Payee, Amount). Check that this is a transaction CSV.');
 const getIndex=(keys)=>firstIndex(columns,keys);
 const dateIndex=getIndex(dateKeys),descriptionIndex=getIndex(descriptionKeys),amountIndex=getIndex(amountKeys),
  referenceIndex=getIndex(referenceKeys),balanceIndex=getIndex(['runningbal','runningbalance','balance']),
  transactionDateIndex=getIndex(['transactiondate','purchasedate']);
 const isCard=columns.includes('posteddate')||referenceIndex>=0;
 const errors=[],warnings=[],records=[],occurrences=new Map(),seenIds=new Set();
 let skipped=0,negative=0,positive=0,transfers=0;
 for(let index=headerIndex+1;index<rows.length;index++){
  const row=rows[index],line=index+1,get=(i)=>i<0?'':cleanLine(row[i]);
  if(!row.some(cell=>cleanLine(cell))){skipped++;continue;}
  const description=get(descriptionIndex),amountText=get(amountIndex),dateText=get(dateIndex);
  if(!amountText){
   if(!description||accountSummaryRow(description)){skipped++;continue;}
   errors.push('Row '+line+': amount is missing for "'+description.slice(0,60)+'".');continue;
  }
  try{
   if(!dateText||!description)throw Error('Date and bank description are required.');
   if(description.length>240)throw Error('Description is longer than 240 characters.');
   const date=bankDate(dateText),signedCents=signedBankCents(amountText);
   let reference=get(referenceIndex);
   if(reference.length>80)throw Error('Bank reference is too long.');
   const balanceCents=moneyCentsForBalance(get(balanceIndex));
   const seed=bankFingerprint({accountLabel,date,description,signedCents,reference,balanceCents});
   const occurrence=(occurrences.get(seed)||0)+1;occurrences.set(seed,occurrence);
   const id='bofa-'+bankHash(seed)+'-'+occurrence;
   if(seenIds.has(id))throw Error('Two unrelated bank rows produced the same identity; import stopped.');
   seenIds.add(id);
   const transfer=transferDescription.test(description),kind=transfer?'transfer':signedCents<0?'expense':'income';
   const record={
    id,date,kind,amountCents:Math.abs(signedCents),description,bankDescription:description,
    category:transfer?'Transfers':'Uncategorized',accountLabel,statementLabel,
    currency:'USD',source:'import',externalId:'bofa:'+bankHash(seed)+':'+occurrence
   };
   if(transfer){transfers++;warnings.push('Row '+line+': "'+description.slice(0,70)+'" was classified as a transfer. Confirm in the preview.');}
   if(signedCents<0)negative++;else positive++;
   if(transactionDateIndex>=0&&get(transactionDateIndex)){
    const purchaseDate=bankDate(get(transactionDateIndex));
    if(purchaseDate!==date)record.purchaseDate=purchaseDate;
   }
   normalizeData({...emptyData(),transactions:[record]});
   records.push({...record,__sourceRow:line});
  }catch(error){errors.push('Row '+line+': '+error.message);}
 }
 if(records.length===0&&!errors.length)errors.push('No posted transaction rows found in this CSV.');
 if(balanceIndex<0&&referenceIndex<0)warnings.push('This bank export has no running balance or reference column. Identical charges are distinguished by row occurrence; check overlapping partial exports carefully.');
 if(isCard)warnings.push('Credit-card payments and refunds may be credits. Review the transaction types before confirming.');
 return {records,errors,warnings,details:{headerLine:headerIndex+1,skipped,negative,positive,transfers,accountLabel,statementLabel,format:isCard?'Credit card':'Checking / Savings'}};
}
const patchFields=['description','category','subcategory','merchant','note','purchaseDate','time','itemization'];
export function readEnrichmentCSV(text,current){
 const rows=parseCSV(String(text||'').replace(/^\uFEFF/,''));
 if(!rows.length)throw Error('Enrichment CSV is empty.');
 const headers=rows.shift().map(headerKey),ix=name=>headers.indexOf(headerKey(name));
 if(ix('id')<0||ix('recordType')<0)throw Error('Enrichment CSV needs recordType and id columns. Export the template from Everyday.');
 const byId=new Map(current.transactions.map(tx=>[tx.id,tx]));
 const errors=[],warnings=[],updates=[],seen=new Set();
 let unchanged=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i],line=i+2,get=key=>ix(key)<0?'':cleanLine(row[ix(key)]);
  if(!row.some(cell=>cleanLine(cell)))continue;
  const id=get('id');
  try{
   if(get('recordType').toLowerCase()!=='enrichment')throw Error('recordType must be enrichment.');
   if(!id||seen.has(id))throw Error('Missing or repeated transaction ID.');
   seen.add(id);
   const existing=byId.get(id);
   if(!existing)throw Error('Transaction ID not found in this notebook. Import the bank statement first.');
   const checks=[['postedDate','date'],['kind','kind'],['amountCents','amountCents'],
    ['bankDescription','bankDescription'],['accountLabel','accountLabel']];
   for(const [col,field] of checks){
    const supplied=get(col);
    if(!supplied)continue;
    if(String(existing[field]??'')!==supplied)throw Error(col+' does not match the saved original. Bank amount, posted date and raw description cannot be changed by enrichment.');
   }
   const changed=structuredClone(existing);
   for(const field of patchFields){
    if(ix(field)<0)continue;
    const value=get(field);
    if(value)changed[field]=value;
   }
   normalizeData({...emptyData(),transactions:[changed]});
   if(JSON.stringify(changed)===JSON.stringify(existing)){unchanged++;continue;}
   updates.push({record:changed,previous:existing,sourceRow:line,badges:['Updates existing']});
  }catch(error){errors.push('Row '+line+': '+error.message);}
 }
 if(!updates.length&&!errors.length&&!unchanged)errors.push('No valid enrichment rows found.');
 return {updates,errors,warnings,unchanged};
}
