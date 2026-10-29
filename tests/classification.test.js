import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {classificationRuleProposals,applyClassificationRuleProposals} from '../classification-model.js';
import {financeEnrichmentCSV,readEnrichmentCSV} from '../bank-import.js';

const transaction=(more={})=>({
 id:'bank-001',date:'2026-10-20',kind:'expense',amountCents:719,
 description:'WAWA STORE 123',bankDescription:'WAWA STORE 123',bankDirection:'debit',
 accountLabel:'Checking',category:'Uncategorized',currency:'USD',note:'My own note',...more
});
const rule=(more={})=>({
 id:'r1',name:'Water',matchText:'WAWA',matchField:'bankDescription',
 amountCents:719,category:'Household Supplies',subcategory:'Bottled water',merchant:'Wawa',enabled:true,...more
});

test('legacy backups acquire empty rules and new backups round-trip without losing bank facts',()=>{
 const legacy=emptyData();delete legacy.classificationRules;
 const restored=normalizeData(legacy);
 assert.deepEqual(restored.classificationRules,[]);
 const doc=normalizeData({...restored,transactions:[transaction()],classificationRules:[rule()]});
 const roundtrip=normalizeData(encodeData(doc));
 assert.deepEqual(roundtrip.classificationRules,[rule()]);
 assert.equal(roundtrip.transactions[0].bankDescription,'WAWA STORE 123');
 assert.equal(roundtrip.transactions[0].note,'My own note');
});

test('merchant rules propose only; approval changes editable fields and never bank facts',()=>{
 const doc=normalizeData({...emptyData(),transactions:[transaction()]});
 const proposals=classificationRuleProposals(doc.transactions,[rule()]);
 assert.equal(proposals.length,1);
 assert.equal(doc.transactions[0].category,'Uncategorized');
 const candidate=applyClassificationRuleProposals(doc,proposals,['bank-001']);
 assert.equal(candidate.transactions[0].category,'Household Supplies');
 assert.equal(candidate.transactions[0].subcategory,'Bottled water');
 assert.equal(candidate.transactions[0].merchant,'Wawa');
 assert.equal(candidate.transactions[0].kind,'expense');
 assert.equal(candidate.transactions[0].bankDescription,'WAWA STORE 123');
 assert.equal(candidate.transactions[0].note,'My own note');
 assert.equal(doc.transactions[0].category,'Uncategorized');
 assert.equal(applyClassificationRuleProposals(doc,proposals,[]).transactions[0].category,'Uncategorized');
});

test('conflicting rules are never applied; exact amount prevents a broad false match',()=>{
 const doc=normalizeData({...emptyData(),transactions:[transaction(),transaction({id:'bank-002',amountCents:1999})]});
 const all=classificationRuleProposals(doc.transactions,[rule(),rule({id:'r2',name:'Other',category:'Restaurants'})]);
 assert.equal(all.length,1);
 assert.deepEqual(all[0].conflicts,['category']);
 assert.throws(()=>applyClassificationRuleProposals(doc,all,['bank-001']),/ambiguous/);
});

test('enrichment expected values protect later personal edits while permitting targeted changes',()=>{
 const doc=normalizeData({...emptyData(),transactions:[transaction()]});
 const csv=financeEnrichmentCSV(doc.transactions);
 const lines=csv.trim().split('\r\n').map(line=>line.split(','));
 const headers=lines[0];const idx=name=>headers.indexOf(name);
 assert.notEqual(idx('expectedCategory'),-1);
 lines[1][idx('category')]='Household Supplies';
 const proposal=lines.map(line=>line.join(',')).join('\r\n')+'\r\n';
 const live=normalizeData({...doc,transactions:[{...transaction(),note:'Changed after export'}]});
 const parsed=readEnrichmentCSV(proposal,live);
 assert.equal(parsed.errors.length,0);
 assert.equal(parsed.updates.length,1);
 assert.equal(parsed.updates[0].record.note,'Changed after export');
 assert.equal(parsed.updates[0].record.category,'Household Supplies');
 const changed=normalizeData({...doc,transactions:[{...transaction(),category:'Restaurants'}]});
 const conflicting=readEnrichmentCSV(proposal,changed);
 assert.equal(conflicting.updates.length,0);
 assert.match(conflicting.errors[0],/changed since export/);
});

test('legacy enrichment cannot replace an existing personal note without an expected baseline',()=>{
 const doc=normalizeData({...emptyData(),transactions:[transaction()]});
 const input='recordType,id,kind,note\n'+'enrichment,bank-001,expense,Overwritten\n';
 const result=readEnrichmentCSV(input,doc);
 assert.match(result.errors[0],/fresh export/);
});
