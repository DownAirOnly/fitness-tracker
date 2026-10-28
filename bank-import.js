// v84: browser-only Bank of America CSV reader and ID-anchored ChatGPT enrichment.
// Statement identity does not contain the statement label so overlapping exports deduplicate.
// Bank amounts and bank descriptions stay immutable when enrichment CSV is applied.
import {parseCSV,validDate,normalizeData,emptyData} from './data.js?v=85';
import {parseFinanceAmount,formatFinanceAmount,financeDuplicateKey} from './finance-model.js?v=83';

const headerKey=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const dateKeys=['posteddate','postingdate','postdate','date'],descriptionKeys=['description','payeedescription','payee','merchant','name'];
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
 // BofA exports may contain $0.00 canceled/failed status notices, which are
 // not valid saved transactions. Parse zero here so the reader can skip them.
 const cents=/^0(?:\.0{1,2})?$/.test(text)?0:parseFinanceAmount(text);
 return cents===0?0:(negative?-cents:cents);
}
function moneyCentsForBalance(value){
 const text=cleanLine(value);
 if(!text)return '';
 if(/^[-+]?(?:\$)?0(?:\.0{1,2})?$/.test(text))return '0';
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
// Classify only explicit bank-to-bank movements and recognizable account payments
// as transfers. These remain editable: the bank's debit/credit direction never changes.
// Do not treat all Zelle/Venmo payments as transfers: many represent real spending.
const debtPaymentDescription=/^(?:discover\b.*\be-payment\b|online scheduled payment to acct#?\s*\d+\b)/i;
const overdraftProtectionDescription=/^overdraft protection from\b/i;
const savingsTransferDescription=/^(?:keep the change transfer to acct\b|online (?:banking |scheduled )?transfer (?:from|to) sav\b)/i;
const peerPaymentDescription=/\b(?:zelle|venmo|cash app|paypal)\b/i;
function classifyBankRow(description,signedCents){
 if(overdraftProtectionDescription.test(description))return {kind:'transfer',subcategory:'Overdraft protection'};
 if(debtPaymentDescription.test(description))return {kind:'transfer',subcategory:'Debt payments'};
 if(savingsTransferDescription.test(description))return {kind:'transfer',subcategory:'Savings transfers'};
 if(transferDescription.test(description))return {kind:'transfer',subcategory:'Other transfers'};
 return {kind:signedCents<0?'expense':'income',subcategory:''};
}
// Read-only review hints based on the existing Bank of America classifier.
// Do not infer P2P payments or change any saved transaction automatically.
export function financeReviewFlags(transaction){
 const flags=[],category=String(transaction?.category||'').trim().toLowerCase();
 if(!category||category==='uncategorized')flags.push('uncategorized');
 const bankDescription=String(transaction?.bankDescription||'').trim();
 if(bankDescription&&transaction?.kind!=='transfer'&&
  classifyBankRow(bankDescription,transaction?.bankDirection==='credit'?1:-1).kind==='transfer'){
  flags.push('transfer-check');
 }
 return flags;
}
function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;}
const enrichColumns=[
 'recordType','id','postedDate','kind','amountCents','bankDescription','accountLabel','statementLabel','bankDirection',
 'description','category','subcategory','merchant','note','purchaseDate','time','itemization'
];
export function financeEnrichmentCSV(transactions){
 const rows=[enrichColumns.join(',')];
 for(const tx of [...transactions].sort((a,b)=>b.date.localeCompare(a.date))){
  const values=[
   'enrichment',tx.id,tx.date,tx.kind,tx.amountCents,tx.bankDescription||'',tx.accountLabel||'',
   tx.statementLabel||'',tx.bankDirection||'',tx.description,tx.category,tx.subcategory||'',tx.merchant||'',
   tx.note||'',tx.purchaseDate||'',tx.time||'',tx.itemization||''
  ];
  rows.push(values.map(csvCell).join(','));
 }
 return rows.join('\r\n')+'\r\n';
}
// Infer a human-readable batch name from the bank statement itself, never from
// the upload date. Prefer the statement's beginning/ending balance dates; use
// the posted transaction range for exports that omit a statement summary.
// This label is display metadata only and does not affect transaction IDs.
export function inferBofaStatementLabel(text){
 const rows=parseCSV(String(text||'').replace(/^\uFEFF/,''));
 let headerIndex=-1,columns;
 let startingSummary=null,endingSummary=null;
 for(let i=0;i<Math.min(60,rows.length);i++){
  const row=rows[i],keys=row.map(headerKey);
  if(firstIndex(keys,dateKeys)>=0&&firstIndex(keys,descriptionKeys)>=0&&firstIndex(keys,amountKeys)>=0){
   headerIndex=i;columns=keys;break;
  }
  const description=String(row[0]||'').trim();
  const summaryMatch=/^(beginning|ending)\s+balance\s+as\s+of\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/i.exec(description);
  if(summaryMatch){
   try{
    const date=bankDate(summaryMatch[2]);
    if(summaryMatch[1].toLowerCase()==='beginning')startingSummary=date;
    else endingSummary=date;
   }catch{/* A malformed statement summary is not a valid date hint. */}
  }
 }
 if(headerIndex<0)return '';
 const index=firstIndex(columns,dateKeys),amountIndex=firstIndex(columns,amountKeys);
 const dates=[];
 for(let i=headerIndex+1;i<rows.length;i++){
  const row=rows[i],posted=String(row[index]||'').trim();
  // Exclude balance-only rows, which have no transaction amount.
  if(!posted||!String(row[amountIndex]||'').trim())continue;
  try{dates.push(bankDate(posted));}catch{/* Invalid posted dates are reported during the full import review. */}
 }
 dates.sort();
 const first=startingSummary&&(!dates.length||startingSummary<=dates[0])?startingSummary:dates[0];
 const last=endingSummary&&(!dates.length||endingSummary>=dates[dates.length-1])?endingSummary:dates[dates.length-1];
 if(!first||!last||first>last)return '';
 const parsed=date=>{
  const [year,month,day]=date.split('-').map(Number);
  return {year,month,day,label:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)))};
 };
 const a=parsed(first),b=parsed(last);
 if(first===last)return a.label+' '+a.day+', '+a.year;
 if(a.year===b.year){
  if(a.month===b.month)return a.label+' '+a.day+'–'+b.day+', '+a.year;
  return a.label+' '+a.day+' – '+b.label+' '+b.day+', '+a.year;
 }
 return a.label+' '+a.day+', '+a.year+' – '+b.label+' '+b.day+', '+b.year;
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
 let skipped=0,negative=0,positive=0,transfers=0,zeroAmountSkipped=0,canceledZeroNotices=0;
 let debtPayments=0,overdraftProtection=0,peerPayments=0;
 const unrecognizedZeroRows=[];
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
   if(signedCents===0){
    // Status entries do not move money and must not create ledger transactions.
    skipped++;zeroAmountSkipped++;
    if(/\b(?:cancel(?:ed|led)?|failed|rejected|declined|void(?:ed)?)\b/i.test(description))canceledZeroNotices++;
    else unrecognizedZeroRows.push(line);
    continue;
   }
   let reference=get(referenceIndex);
   if(reference.length>80)throw Error('Bank reference is too long.');
   const balanceCents=moneyCentsForBalance(get(balanceIndex));
   const seed=bankFingerprint({accountLabel,date,description,signedCents,reference,balanceCents});
   const occurrence=(occurrences.get(seed)||0)+1;occurrences.set(seed,occurrence);
   const id='bofa-'+bankHash(seed)+'-'+occurrence;
   if(seenIds.has(id))throw Error('Two unrelated bank rows produced the same identity; import stopped.');
   seenIds.add(id);
   const classification=classifyBankRow(description,signedCents),kind=classification.kind;
   if(classification.subcategory==='Debt payments')debtPayments++;
   if(classification.subcategory==='Overdraft protection')overdraftProtection++;
   if(peerPaymentDescription.test(description))peerPayments++;
   const record={
    id,date,kind,bankDirection:signedCents<0?'debit':'credit',amountCents:Math.abs(signedCents),description,bankDescription:description,
    category:kind==='transfer'?'Transfers':'Uncategorized',
    ...(classification.subcategory?{subcategory:classification.subcategory}:{}),accountLabel,statementLabel,
    currency:'USD',source:'import',externalId:'bofa:'+bankHash(seed)+':'+occurrence
   };
   if(kind==='transfer')transfers++;
   if(signedCents<0)negative++;else positive++;
   if(transactionDateIndex>=0&&get(transactionDateIndex)){
    const purchaseDate=bankDate(get(transactionDateIndex));
    if(purchaseDate!==date)record.purchaseDate=purchaseDate;
   }
   normalizeData({...emptyData(),transactions:[record]});
   records.push({...record,__sourceRow:line});
  }catch(error){errors.push('Row '+line+': '+error.message);}
 }
 if(zeroAmountSkipped){
  const explanation=unrecognizedZeroRows.length?
   ' Review zero-dollar rows '+unrecognizedZeroRows.join(', ')+': no debit or credit was recorded.':
   ' These are canceled/failed bank notices, not transactions.';
  warnings.unshift('Skipped '+zeroAmountSkipped+' $0.00 bank row'+(zeroAmountSkipped===1?'':'s')+
   ' because no money moved.'+explanation);
 }
 if(transfers)warnings.push(transfers+' transaction'+(transfers===1?' was':'s were')+
  ' classified as transfers using the bank wording, including '+debtPayments+
  ' account/debt payment'+(debtPayments===1?'':'s')+' and '+overdraftProtection+
  ' overdraft-protection credit'+(overdraftProtection===1?'':'s')+
  '. These change cash flow, but should not count as consumption or earned income. Review before confirming.');
 if(peerPayments)warnings.push(peerPayments+' Zelle/Venmo/other person-to-person row'+(peerPayments===1?' needs':'s need')+
  ' review: the bank description alone cannot determine whether each is a purchase, shared expense, gift, reimbursement or transfer. The original debit/credit is preserved.');
 if(records.length===0&&!errors.length)errors.push('No posted transaction rows found in this CSV.');
 if(balanceIndex<0&&referenceIndex<0)warnings.push('This bank export has no running balance or reference column. Identical charges are distinguished by row occurrence; check overlapping partial exports carefully.');
 if(isCard)warnings.push('Credit-card payments and refunds may be credits. Review the transaction types before confirming.');
 return {records,errors,warnings,details:{headerLine:headerIndex+1,skipped,zeroAmountSkipped,canceledZeroNotices,negative,positive,transfers,debtPayments,overdraftProtection,peerPayments,accountLabel,statementLabel,format:isCard?'Credit card':'Checking / Savings'}};
}
const patchFields=['kind','description','category','subcategory','merchant','note','purchaseDate','time','itemization'];
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
   const checks=[['postedDate','date'],['amountCents','amountCents'],
    ['bankDescription','bankDescription'],['accountLabel','accountLabel'],['bankDirection','bankDirection']];
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
