import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {readBofaCSV,readEnrichmentCSV,financeEnrichmentCSV,inferBofaStatementLabel} from '../bank-import.js';
import {prepareBankImport,prepareEnrichmentImport} from '../import-model.js';

const options={accountLabel:'BofA Checking',statementLabel:'January–October 2026'};
const statement=[
 'Description,,Summary Amt.',
 'Beginning balance as of 09/01/2026,,"1,000.00"',
 'Total credits,,"1,500.00"',
 'Total debits,,"-300.00"',
 '',
 'Date,Description,Amount,Running Bal.',
 '09/02/2026,Beginning balance as of 09/02/2026,,"1,000.00"',
 '09/03/2026,"365 MARKET 10994",-8.55,991.45',
 '09/04/2026,"WAWA STORE 44",-7.19,984.26',
 '09/05/2026,"DIRECT DEPOSIT PAYROLL","1,500.00","2,484.26"',
 '09/06/2026,"ONLINE TRANSFER TO SAVINGS",-100.00,"2,384.26"'
].join('\n');

test('v84: BofA checking CSV skips summary preamble and blank balance row',()=>{
 const result=readBofaCSV(statement,options);
 assert.equal(result.details.headerLine,5,'CSV parser omits blank preamble lines');
 assert.equal(result.details.skipped,1);
 assert.equal(result.records.length,4);
 assert.equal(result.errors.length,0);
 assert.deepEqual(result.records.map(r=>r.amountCents),[855,719,150000,10000]);
 assert.deepEqual(result.records.map(r=>r.kind),['expense','expense','income','transfer']);
 assert.equal(result.records[0].date,'2026-09-03');
 assert.equal(result.records[0].bankDescription,'365 MARKET 10994');
 assert.equal(result.records[0].bankDirection,'debit','immutable bank statement sign is preserved');
 assert.equal(result.records[0].description,result.records[0].bankDescription,'initial friendly name can be replaced later');
 assert.equal(result.records[0].accountLabel,'BofA Checking');
 assert.equal(result.records[0].statementLabel,'January–October 2026');
 assert.match(result.warnings.join(' '),/transfer/i);
});

test('v84: overlapping account exports are idempotent even with a new statement label',()=>{
 const first=prepareBankImport(statement,emptyData(),options);
 assert.equal(first.errors.length,0);
 assert.equal(first.changeCount,4);
 assert.deepEqual(first.candidate.transactions.map(r=>r.id).length,4);
 const renamed=prepareBankImport(statement,first.candidate,{...options,statementLabel:'September reexport'});
 assert.equal(renamed.errors.length,0);
 assert.equal(renamed.changeCount,0);
 assert.equal(renamed.unchanged,4);
 assert.deepEqual(renamed.candidate,first.candidate);
});

test('v84: distinct accounts keep distinct transaction identities even for identical rows',()=>{
 const a=readBofaCSV(statement,options);
 const b=readBofaCSV(statement,{...options,accountLabel:'BofA Savings'});
 assert.notEqual(a.records[0].id,b.records[0].id);
 assert.notEqual(a.records[0].externalId,b.records[0].externalId);
});

test('v84: two identical bank charges with differing running balances are preserved separately',()=>{
 const csv='Date,Description,Amount,Running Bal.\n10/01/2026,COFFEE,-5.00,95.00\n10/01/2026,COFFEE,-5.00,90.00';
 const result=prepareBankImport(csv,emptyData(),options);
 assert.equal(result.changeCount,2);
 assert.notEqual(result.candidate.transactions[0].id,result.candidate.transactions[1].id);
 const repeated=prepareBankImport(csv,result.candidate,options);
 assert.equal(repeated.changeCount,0);
});

test('v84: card CSV supports Posted Date, Payee and Reference Number, including a purchase date',()=>{
 const csv='Posted Date,Transaction Date,Reference Number,Payee,Address,Amount\n10/02/2026,10/01/2026,REF3322,RETAILER,Orlando FL,-45.29\n10/05/2026,10/05/2026,REF3323,ONLINE PAYMENT - THANK YOU,,250.00';
 const result=readBofaCSV(csv,{accountLabel:'BofA Credit',statementLabel:'October card'});
 assert.equal(result.errors.length,0);
 assert.equal(result.details.format,'Credit card');
 assert.equal(result.records[0].kind,'expense');
 assert.equal(result.records[0].purchaseDate,'2026-10-01');
 assert.equal(result.records[1].kind,'transfer');
 assert.equal(result.records[0].amountCents,4529);
});

test('v84: unknown format, invalid dates, amounts and malformed account metadata cannot be saved',()=>{
 const broken='Date,Description,Amount,Running Bal.\n09/31/2026,Invalid Date,-5.00,95.00\n10/01/2026,Bad Amount,-1.235,94.00';
 const result=prepareBankImport(broken,emptyData(),options);
 assert.equal(result.candidate,null);
 assert.equal(result.errors.length,2);
 assert.match(result.errors.join(' '),/Row 2/);
 assert.match(result.errors.join(' '),/Row 3/);
 assert.throws(()=>readBofaCSV('Account,Activity,Value\nA,X,3',options),/header not found/);
 assert.throws(()=>readBofaCSV(statement,{...options,accountLabel:'  '}),/Account label/);
 assert.throws(()=>readBofaCSV(statement,{...options,statementLabel:''}),/Statement label/);
});

test('v84: older notebooks and JSON backups safely retain optional bank fields',()=>{
 const data=emptyData();
 const bank=readBofaCSV(statement,options).records[0];
 const {__sourceRow,...tx}=bank;
 data.transactions=[{...tx,description:'Monster and chips',category:'Convenience Food',subcategory:'Work snacks',
  itemization:'1 Monster — $3.20\n1 protein snack — $5.35',purchaseDate:'2026-09-02',time:'15:10'}];
 const restored=normalizeData(encodeData(data));
 assert.deepEqual(restored.transactions,data.transactions);
 assert.equal(restored.transactions[0].bankDescription,'365 MARKET 10994');
 assert.equal(restored.transactions[0].itemization.split('\n').length,2);
});

test('v84: enrichment CSV changes personal fields without replacing bank facts or adding transactions',()=>{
 const imported=prepareBankImport(statement,emptyData(),options).candidate;
 const original=structuredClone(imported.transactions[0]);
 let csv=financeEnrichmentCSV(imported.transactions);
 assert.match(csv,/recordType,id,postedDate,kind,amountCents,bankDescription,accountLabel/);
 csv=csv.replace('365 MARKET 10994,Uncategorized', '365 MARKET 10994,Uncategorized'); // preserve exported bank facts
 const lines=csv.trim().split(/\r?\n/);
 const ix=lines.findIndex(line=>line.includes(original.id));
 const columns=lines[0].split(',');
 const cells=lines[ix].split(',');
 cells[columns.indexOf('description')]='Energy drink and protein snack';
 cells[columns.indexOf('category')]='Convenience Food';
 cells[columns.indexOf('subcategory')]='365 Market';
 cells[columns.indexOf('purchaseDate')]='2026-09-02';
 cells[columns.indexOf('time')]='15:30';
 cells[columns.indexOf('itemization')]='Monster 3.00; protein snack 5.55';
 lines[ix]=cells.join(',');
 const patch=prepareEnrichmentImport(lines.join('\n'),imported);
 assert.equal(patch.errors.length,0);
 assert.equal(patch.changeCount,1);
 assert.equal(patch.candidate.transactions.length,4);
 const enriched=patch.candidate.transactions[0];
 assert.equal(enriched.description,'Energy drink and protein snack');
 assert.equal(enriched.category,'Convenience Food');
 assert.equal(enriched.subcategory,'365 Market');
 assert.equal(enriched.itemization,'Monster 3.00; protein snack 5.55');
 assert.equal(enriched.time,'15:30');
 assert.equal(enriched.bankDescription,original.bankDescription);
 assert.equal(enriched.amountCents,original.amountCents);
 assert.equal(enriched.date,original.date);
 assert.equal(enriched.id,original.id);
 const noChanges=prepareEnrichmentImport(lines.join('\n'),patch.candidate);
 assert.equal(noChanges.changeCount,0);
 assert.deepEqual(noChanges.candidate,patch.candidate);
 assert.deepEqual(imported.transactions[0],original,'source notebook unchanged');
});

test('v84: mismatched bank facts, unknown IDs and duplicate enrichment IDs block entire patch',()=>{
 const imported=prepareBankImport(statement,emptyData(),options).candidate;
 const target=imported.transactions[0];
 const head='recordType,id,postedDate,kind,amountCents,bankDescription,accountLabel,description,category';
 const good='enrichment,'+target.id+','+target.date+','+target.kind+','+target.amountCents+','+target.bankDescription+','+target.accountLabel+',Snack,Convenience Food';
 for(const bad of [
  good.replace(','+target.amountCents+',',',1,'),
  good.replace(','+target.date+',',',2020-01-01,'),
  good.replace(','+target.bankDescription+',',',FAKE BANK TEXT,'),
  good.replace(target.id,'wrong-id'),
  good+'\n'+good
 ]){
  const before=JSON.stringify(imported),plan=prepareEnrichmentImport(head+'\n'+bad,imported);
  assert.equal(plan.candidate,null,bad);
  assert.ok(plan.errors.length);
  assert.equal(JSON.stringify(imported),before,'invalid patch never mutates notebook');
 }
});

test('v84: quoted receipt itemization survives CSV export and re-import',()=>{
 const imported=prepareBankImport(statement,emptyData(),options).candidate;
 const t=imported.transactions[0];
 let exportCsv=financeEnrichmentCSV(imported.transactions);
 const rows=exportCsv.trim().split(/\r?\n/),header=rows[0].split(','),i=rows.findIndex(x=>x.includes(t.id));
 const cells=rows[i].split(',');
 cells[header.indexOf('itemization')]='\"Monster, 16 oz — $3.00; protein chips — $5.55\"';
 rows[i]=cells.join(',');
 const plan=prepareEnrichmentImport(rows.join('\n'),imported);
 assert.equal(plan.errors.length,0);
 assert.equal(plan.candidate.transactions[0].itemization,'Monster, 16 oz — $3.00; protein chips — $5.55');
 const restored=financeEnrichmentCSV(plan.candidate.transactions);
 assert.match(restored,/"Monster, 16 oz — \$3\.00; protein chips — \$5\.55"/);
});

test('v84: manually logged duplicates are warned about, never silently overwritten',()=>{
 const current=emptyData();
 current.transactions=[{id:'manual',date:'2026-09-04',kind:'expense',amountCents:719,
  description:'WAWA STORE 44',category:'Household Supplies',currency:'USD',source:'manual'}];
 const plan=prepareBankImport(statement,current,options);
 assert.equal(plan.errors.length,0);
 assert.match(plan.warnings.join(' '),/similar to an already logged transaction/);
 assert.ok(plan.groups[0].rows.some(r=>r.badges.includes('Possible duplicate')));
 assert.equal(current.transactions.length,1);
 assert.equal(plan.candidate.transactions.length,5);
});


test('v85: transaction type is an editable classification while original debit direction remains fixed',()=>{
 const imported=prepareBankImport(statement,emptyData(),options).candidate;
 const row=imported.transactions.find(tx=>tx.bankDescription==='ONLINE TRANSFER TO SAVINGS');
 assert.equal(row.bankDirection,'debit');
 const changed=structuredClone(imported);
 changed.transactions.find(tx=>tx.id===row.id).kind='expense';
 const again=prepareBankImport(statement,changed,{...options,statementLabel:'overlapping reexport'});
 assert.equal(again.errors.length,0);
 assert.equal(again.changeCount,0);
 assert.equal(again.candidate.transactions.find(tx=>tx.id===row.id).kind,'expense');
 assert.equal(again.candidate.transactions.find(tx=>tx.id===row.id).bankDirection,'debit');
 const csv=financeEnrichmentCSV(changed.transactions);
 const updated=csv.replace('expense,10000','transfer,10000');
 const preview=prepareEnrichmentImport(updated,changed);
 assert.equal(preview.errors.length,0);
 assert.equal(preview.candidate.transactions.find(tx=>tx.id===row.id).kind,'transfer');
 assert.equal(preview.candidate.transactions.find(tx=>tx.id===row.id).bankDirection,'debit');
});

test('v85: zero running balances and Post Date aliases import cleanly',()=>{
 const csv='Post Date,Payee / Description,Amount,Running Bal.\n10/23/2026,ATM WITHDRAWAL,-20.00,0.00';
 const plan=prepareBankImport(csv,emptyData(),options);
 assert.equal(plan.errors.length,0);
 assert.equal(plan.candidate.transactions[0].amountCents,2000);
 assert.equal(plan.candidate.transactions[0].bankDirection,'debit');
});


test('v86: BofA 478 transactions with 3 canceled $0.00 Keep the Change notices import cleanly',()=>{
 const lines=[
  'Description,,Summary Amt.',
  'Beginning balance as of 08/03/2026,,559.96',
  'Total credits,,"8,360.38"',
  'Total debits,,"-8,716.84"',
  '',
  'Date,Description,Amount,Running Bal.',
  '08/03/2026,Beginning balance as of 08/03/2026,,559.96'
 ];
 // Mirrors the user's statement: 478 money-moving rows + 3 canceled zero-dollar notices.
 const notices=new Set([43,329,480]);
 for(let i=0;i<481;i++){
  if(notices.has(i))lines.push('10/16/2026,KEEP THE CHANGE TRANSFER CANCELED-LOW ACCT BALANCE,0.00,-101.33');
  else lines.push('10/16/2026,TEST PURCHASE '+i+',-'+(i+1)+'.19,-101.33');
 }
 const csv=lines.join('\n'),result=readBofaCSV(csv,options);
 assert.equal(result.errors.length,0);
 assert.equal(result.records.length,478);
 assert.equal(result.details.zeroAmountSkipped,3);
 assert.equal(result.details.canceledZeroNotices,3);
 assert.equal(result.details.skipped,4,'balance-only row plus three zero-dollar notices');
 assert.equal(result.warnings.filter(w=>w.includes('$0.00')).length,1,'one clear zero status summary');
 assert.equal(result.records.some(x=>x.amountCents===0),false);
 const plan=prepareBankImport(csv,emptyData(),options);
 assert.equal(plan.errors.length,0);
 assert.equal(plan.changeCount,478);
 assert.equal(plan.candidate.transactions.length,478);
 assert.equal(plan.bankDetails.zeroAmountSkipped,3);
 const repeat=prepareBankImport(csv,plan.candidate,options);
 assert.equal(repeat.errors.length,0);
 assert.equal(repeat.changeCount,0);
 assert.equal(repeat.unchanged,478,'a second import cannot duplicate purchases');
});

test('v86: ambiguous $0.00 bank records skip with a clear warning, not a silent drop',()=>{
 const csv=[
  'Date,Description,Amount,Running Bal.',
  '10/02/2026,COFFEE SHOP,-5.00,95.00',
  '10/03/2026,ADJUSTMENT PENDING,0.00,95.00',
  '10/04/2026,ONLINE TRANSFER TO SAVINGS,-10.00,85.00',
  '10/05/2026,KEEP THE CHANGE TRANSFER CANCELED-LOW ACCT BALANCE,0.00,85.00'
 ].join('\n');
 const result=readBofaCSV(csv,options);
 assert.equal(result.errors.length,0);
 assert.equal(result.records.length,2);
 assert.equal(result.details.zeroAmountSkipped,2);
 assert.equal(result.details.canceledZeroNotices,1);
 assert.match(result.warnings.join(' '),/Review zero-dollar rows/);
 assert.equal(result.warnings.filter(w=>/classified as transfers/i.test(w)).length,1,'transfer classification warnings are grouped');
 assert.equal(result.records[1].kind,'transfer');
});

test('v86: zero-dollar bank notices do not make manual $0 transactions valid',()=>{
 const state=emptyData();
 state.transactions=[{id:'zero',date:'2026-10-27',kind:'expense',amountCents:0,description:'Zero',currency:'USD'}];
 assert.throws(()=>normalizeData(state),/invalid financial transaction/);
});


test('v87: infer a statement name from Bank of America balance-summary dates',()=>{
 const csv=[
  'Description,,Summary Amt.',
  'Beginning balance as of 08/03/2026,,559.96',
  'Total credits,,"8,360.38"',
  'Total debits,,"-8,716.84"',
  'Ending balance as of 10/27/2026,,203.50',
  '',
  'Date,Description,Amount,Running Bal.',
  '08/03/2026,Beginning balance as of 08/03/2026,,559.96',
  '08/03/2026,COFFEE,-5.00,554.96',
  '10/27/2026,KEEP THE CHANGE TRANSFER CANCELED-LOW ACCT BALANCE,0.00,203.50'
 ].join('\n');
 assert.equal(inferBofaStatementLabel(csv),'Aug 3 – Oct 27, 2026');
 assert.equal(inferBofaStatementLabel('\uFEFF'+csv),'Aug 3 – Oct 27, 2026','BOM does not prevent inference');
});

test('v87: infer date range from posted transactions when bank summary is absent',()=>{
 const csv=[
  'Posted Date,Payee,Amount,Reference Number',
  '10/25/2026,Lunch,-9.44,123',
  '10/24/2026,Coffee,-4.25,124',
  '10/25/2026,Breakfast,-5.00,125'
 ].join('\n');
 assert.equal(inferBofaStatementLabel(csv),'Oct 24–25, 2026');
 assert.equal(inferBofaStatementLabel('Date,Description,Amount\n10/27/2026,Food,-6.00'),'Oct 27, 2026');
 assert.equal(inferBofaStatementLabel('Date,Description,Amount\n12/31/2025,Food,-6.00\n01/02/2026,Drink,-3.00'),
  'Dec 31, 2025 – Jan 2, 2026');
});

test('v87: malformed exports cannot invent a date range and date-only balance rows do not extend it',()=>{
 assert.equal(inferBofaStatementLabel('Not,a,bank,CSV\nhello,world'), '');
 assert.equal(inferBofaStatementLabel('Date,Description,Amount\n10/99/2026,Bad,-3.00'), '');
 assert.equal(inferBofaStatementLabel('Date,Description,Amount\n10/01/2026,Beginning balance as of 10/01/2026,\n10/20/2026,COFFEE,-3.00'),
  'Oct 20, 2026');
});

test('v88: account payments and overdraft protection are transfers, but Zelle stays reviewable',()=>{
 const csv=[
  'Date,Description,Amount,Running Bal.',
  '10/03/2026,DISCOVER DES:E-PAYMENT ID:1234,-100.00,400.00',
  '10/04/2026,Online Scheduled Payment to ACCT# 4468 Confirmation# 1234,-103.00,297.00',
  '10/05/2026,OVERDRAFT PROTECTION FROM 00000012345,10.70,307.70',
  '10/06/2026,Zelle payment to friend for lunch,-10.00,297.70',
  '10/06/2026,Zelle payment from friend,20.00,317.70',
  '10/07/2026,OVERDRAFT ITEM FEE,-10.00,307.70',
  '10/08/2026,Online Banking transfer from SAV 3207 Confirmation# 12345,55.84,363.54'
 ].join('\n');
 const result=readBofaCSV(csv,options);
 assert.equal(result.errors.length,0);
 assert.deepEqual(result.records.map(tx=>tx.kind),
  ['transfer','transfer','transfer','expense','income','expense','transfer']);
 assert.equal(result.records[0].subcategory,'Debt payments');
 assert.equal(result.records[1].subcategory,'Debt payments');
 assert.equal(result.records[2].subcategory,'Overdraft protection');
 assert.equal(result.records[6].subcategory,'Savings transfers');
 assert.equal(result.details.debtPayments,2);
 assert.equal(result.details.overdraftProtection,1);
 assert.equal(result.details.peerPayments,2);
 assert.match(result.warnings.join(' '),/person-to-person/);
 const plan=prepareBankImport(csv,emptyData(),options);
 assert.equal(plan.errors.length,0);
 assert.equal(plan.candidate.transactions.length,7);
 assert.equal(plan.candidate.transactions[2].bankDirection,'credit');
 assert.equal(plan.candidate.transactions[2].category,'Transfers');
});

test('v88: quoted bank descriptions survive CSV decoding and ID-safe reimport',()=>{
 const csv=[
  'Date,Description,Amount,Running Bal.',
  '10/02/2026,"Zelle payment from ""Jordan"", shared dinner",20.00,200.00'
 ].join('\n');
 const first=prepareBankImport(csv,emptyData(),options);
 assert.equal(first.errors.length,0);
 assert.equal(first.candidate.transactions[0].bankDescription,'Zelle payment from "Jordan", shared dinner');
 const second=prepareBankImport(csv,first.candidate,options);
 assert.equal(second.errors.length,0);
 assert.equal(second.changeCount,0);
 assert.equal(second.unchanged,1);
});

test('v88: similar bank rows remain visible even after classification edits or label changes',()=>{
 const firstCsv='Date,Description,Amount,Running Bal.\n10/01/2026,COFFEE SHOP,-5.00,95.00';
 const first=prepareBankImport(firstCsv,emptyData(),options);
 const modified=structuredClone(first.candidate);
 modified.transactions[0].kind='transfer'; // classification is editable, original debit remains fixed
 const shifted='Date,Description,Amount,Running Bal.\n10/01/2026,COFFEE SHOP,-5.00,94.00';
 const overlap=prepareBankImport(shifted,modified,options);
 assert.equal(overlap.errors.length,0);
 assert.equal(overlap.changeCount,1,'running balance change generates a different identity');
 assert.equal(overlap.duplicates,1,'kind edit cannot hide a similar transaction');
 assert.match(overlap.warnings.join(' '),/similar to an already logged transaction/);
 const renamed=prepareBankImport(firstCsv,modified,{...options,accountLabel:'Alternate BofA label'});
 assert.equal(renamed.errors.length,0);
 assert.equal(renamed.changeCount,1,'different real accounts are not automatically merged');
 assert.equal(renamed.duplicates,1);
 assert.ok(renamed.groups[0].rows[0].badges.includes('Different account label'));
 assert.match(renamed.warnings.join(' '),/different account label/);
 assert.equal(modified.transactions.length,1,'original notebook remains unchanged');
});
