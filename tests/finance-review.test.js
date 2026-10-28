import test from 'node:test';
import assert from 'node:assert/strict';
import {financeReviewFlags} from '../bank-import.js';

test('uncategorized bank purchase is flagged without mutating the transaction',()=>{
 const tx={id:'test-1',kind:'expense',category:'Uncategorized',bankDescription:'365 MARKET'};
 const before=structuredClone(tx);
 assert.deepEqual(financeReviewFlags(tx),['uncategorized']);
 assert.deepEqual(tx,before);
 assert.deepEqual(financeReviewFlags({...tx,category:'Convenience Food'}),[]);
});
test('existing explicit bank debt payments and overdraft credits are review hints',()=>{
 const debt={kind:'expense',category:'Bills & Utilities',bankDirection:'debit',bankDescription:'DISCOVER E-PAYMENT'};
 const overdraft={kind:'income',category:'Income',bankDirection:'credit',bankDescription:'OVERDRAFT PROTECTION FROM SAVINGS'};
 assert.deepEqual(financeReviewFlags(debt),['transfer-check']);
 assert.deepEqual(financeReviewFlags(overdraft),['transfer-check']);
 assert.deepEqual(financeReviewFlags({...debt,kind:'transfer',category:'Transfers'}),[]);
 assert.equal(debt.kind,'expense','review never changes the original');
});
test('person-to-person transfers remain ambiguous and manual records are not guessed',()=>{
 assert.deepEqual(financeReviewFlags({kind:'expense',category:'Uncategorized',bankDescription:'ZELLE PAYMENT TO FRIEND'}),['uncategorized']);
 assert.deepEqual(financeReviewFlags({kind:'expense',category:'Household Supplies',bankDescription:'ZELLE PAYMENT TO FRIEND'}),[]);
 assert.deepEqual(financeReviewFlags({kind:'expense',category:'Uncategorized',description:'ONLINE PAYMENT CREDIT CARD'}),['uncategorized']);
});
