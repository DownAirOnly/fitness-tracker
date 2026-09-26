import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,deleteDoc,serverTimestamp} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-everyday',firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
try {
 const alice=env.authenticatedContext('alice',{email_verified:true}).firestore();
 const bob=env.authenticatedContext('bob',{email_verified:true}).firestore();
 const anon=env.unauthenticatedContext().firestore();
 const unverified=env.authenticatedContext('unverified',{email_verified:false}).firestore();
 const path='users/alice/state/main';
 const state={schemaVersion:1,revision:1,payload:'{}',updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(alice,path),state));
 await assertSucceeds(getDoc(doc(alice,path)));
 await assertFails(getDoc(doc(bob,path)));
 await assertFails(getDoc(doc(anon,path)));
 await assertFails(setDoc(doc(bob,path),{...state,revision:2}));
 await assertFails(setDoc(doc(unverified,'users/unverified/state/main'),state));
 await assertFails(setDoc(doc(alice,path),state));
 await assertFails(setDoc(doc(alice,path),{...state,revision:3}));
 await assertFails(setDoc(doc(alice,path),{...state,revision:2,extra:'unexpected'}));
 await assertFails(setDoc(doc(alice,path),{...state,revision:2,payload:7}));
 await assertSucceeds(setDoc(doc(alice,path),{...state,revision:2}));
 await assertFails(getDocs(collection(alice,'users/alice/state')));
 await assertFails(deleteDoc(doc(alice,path)));
 console.log('Firestore rules passed: owner access, cross-user denial, anonymous denial, schema and revision checks.');
} finally {await env.cleanup();}
