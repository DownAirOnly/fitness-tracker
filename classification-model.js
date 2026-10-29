// v96: reviewed merchant-based classification suggestions; never writes a ledger implicitly.
// Rules are private notebook data. Bank facts and editable transaction types stay untouched.
const allowedFields=['category','subcategory','merchant'];
const matchFields=['any','merchant','bankDescription'];

export function normalizeClassificationRules(input){
 if(input==null)return [];
 if(!Array.isArray(input)||input.length>300)throw Error('Invalid classification rules section.');
 const seen=new Set();
 return input.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid classification rule.');
  const id=String(raw.id||''),name=String(raw.name||''),matchText=String(raw.matchText||'').trim(),
   matchField=String(raw.matchField||'any'),category=String(raw.category||'').trim(),
   subcategory=String(raw.subcategory||'').trim(),merchant=String(raw.merchant||'').trim();
  const amountCents=raw.amountCents==null||raw.amountCents===''?null:raw.amountCents;
  if(!id.trim()||id.length>160||seen.has(id)||!name.trim()||name.length>100||
    matchText.length<2||matchText.length>120||!matchFields.includes(matchField)||
    !category||category.length>80||subcategory.length>80||merchant.length>160||
    (amountCents!==null&&(!Number.isSafeInteger(amountCents)||amountCents<=0)))
    throw Error('Invalid or repeated classification rule.');
  seen.add(id);
  return {id,name:name.trim(),matchText,matchField,category,subcategory,merchant,
   enabled:raw.enabled!==false,...(amountCents===null?{}:{amountCents})};
 });
}
function matchesRule(tx,rule){
 if(rule.enabled===false||(rule.amountCents!=null&&rule.amountCents!==tx.amountCents))return false;
 const fields=rule.matchField==='bankDescription'?[tx.bankDescription]:
  rule.matchField==='merchant'?[tx.merchant||(!tx.bankDescription?tx.description:'')]:
  [tx.merchant,tx.bankDescription,tx.description];
 const wanted=rule.matchText.trim().toLocaleLowerCase();
 return fields.some(value=>String(value||'').toLocaleLowerCase().includes(wanted));
}
export function classificationRuleProposals(transactions,rules){
 const active=normalizeClassificationRules(rules);
 return transactions.map(tx=>{
  const matching=active.filter(rule=>matchesRule(tx,rule));
  if(!matching.length)return null;
  const changes={},conflicts=[];
  for(const field of allowedFields){
   const targets=[...new Set(matching.map(r=>r[field]).filter(Boolean))];
   if(targets.length>1){conflicts.push(field);continue;}
   const previous=String(tx[field]||'');
   if(targets.length===1&&targets[0]!==previous)changes[field]={before:previous,after:targets[0]};
  }
  return {id:tx.id,transaction:tx,ruleNames:matching.map(r=>r.name),
   changes:conflicts.length?{}:changes,conflicts};
 }).filter(Boolean);
}
// Recheck original field values at commit, even when selecting from an old preview.
export function applyClassificationRuleProposals(notebook,proposals,selectedIds){
 const selected=new Set(selectedIds),candidate=structuredClone(notebook),byId=new Map(proposals.map(p=>[p.id,p]));
 for(const tx of candidate.transactions){
  if(!selected.has(tx.id))continue;
  const proposal=byId.get(tx.id);
  if(!proposal||proposal.conflicts.length)throw Error('Cannot apply an ambiguous rule suggestion.');
  for(const [field,change]of Object.entries(proposal.changes)){
   if(!allowedFields.includes(field))throw Error('Rule attempted to edit a protected field.');
   if(String(tx[field]||'')!==change.before)throw Error('Transaction changed since preview. Refresh classification review.');
   if(change.after)tx[field]=change.after;
  }
 }
 return candidate;
}
