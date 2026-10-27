// v83: finance entry helpers shared by Quick Log and reviewed transaction CSV imports.
// Amounts are positive integer USD cents. Direction lives in kind, not in the sign.
export const FINANCE_CATEGORIES=[
 'Uncategorized','Groceries','Restaurants','Convenience Food','Protein & Nutrition',
 'Gas & Transportation','Car & Insurance','Household Supplies','Bills & Utilities',
 'Subscriptions','Shopping','Health & Fitness','Entertainment','Income','Transfers','Other'
];
export const FINANCE_KINDS=['expense','income','transfer'];

export function parseFinanceAmount(value){
 const raw=String(value??'').trim();
 const body=raw.replace(/^\$/,'');
 if(!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(body))
   throw Error('Enter a positive amount in dollars, such as 7.19. Use a separate type for income or transfers.');
 const normalized=body.replaceAll(',',''),[whole,fraction='']=normalized.split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Enter a positive amount that fits the supported money range.');
 return cents;
}
export function formatFinanceAmount(cents){
 if(!Number.isSafeInteger(cents)||cents<0)throw Error('Amount must be a nonnegative safe integer in cents.');
 const whole=Math.floor(cents/100),fraction=String(cents%100).padStart(2,'0');
 return '$'+whole.toLocaleString('en-US')+'.'+fraction;
}
// A stable content-based ID means reimporting the identical CSV does not make extra records.
// Indexing identical lines preserves multiple otherwise indistinguishable purchases in one batch.
export function financeCsvId(transaction,occurrence=1){
 const fingerprint=[
  transaction.date,transaction.time||'',transaction.kind,String(transaction.amountCents),
  transaction.description.trim().toLowerCase().replace(/\s+/g,' '),
  (transaction.merchant||'').trim().toLowerCase().replace(/\s+/g,' '),
  (transaction.externalId||'').trim().toLowerCase()
 ].join('\x1f');
 let hash=2166136261;
 for(let i=0;i<fingerprint.length;i++){hash^=fingerprint.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return 'finance-csv-'+(hash>>>0).toString(36)+'-'+occurrence;
}
export function financeDuplicateKey(transaction){
 return [
  transaction.date,transaction.time||'',transaction.kind,transaction.amountCents,
  transaction.description.trim().toLowerCase().replace(/\s+/g,' '),
  (transaction.merchant||'').trim().toLowerCase().replace(/\s+/g,' ')
 ].join('\x1f');
}
