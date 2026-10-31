import {healthBridge} from './health-cloud.js?v=98.2';
import {firebaseConfig} from './firebase-config.js';
import {CloudSession,encodeState} from './cloud-model.js?v=99.7.4';
import {sectionRefs,readAccountServer,readAccountTransaction,commitAccountTransaction} from './account-cloud-store.js?v=99.7.4';

export async function connectCloud(onUser) {
  const [appSDK,authSDK,dbSDK]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]);
  const app=appSDK.initializeApp(firebaseConfig);
  const auth=authSDK.getAuth(app);
  // Firebase's own document cache stays memory-only; app.js maintains the explicit account-scoped recovery/confirmed device copies.
  await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
  const db=dbSDK.initializeFirestore(app,{localCache:dbSDK.memoryLocalCache()});
  const store={
    async read(uid) {
      const result=await readAccountServer(dbSDK,db,uid);
      return result.revision?{schemaVersion:1,revision:result.revision,payload:encodeState(result.data)}:null;
    },
    async write(uid,expected,payload) {
      return dbSDK.runTransaction(db,async tx=>{
        if(auth.currentUser?.uid!==uid)throw Error('Account changed.');
        const refs=sectionRefs(dbSDK,db,uid),current=await readAccountTransaction(tx,refs);
        return commitAccountTransaction(tx,refs,current,expected,payload,dbSDK);
      });
    }
  };
  const provider=new authSDK.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  authSDK.onAuthStateChanged(auth,user=>onUser(user,user?new CloudSession(user.uid,store):null));
  return {health:healthBridge({db,auth,sdk:dbSDK,projectId:firebaseConfig.projectId}),signIn:()=>authSDK.signInWithPopup(auth,provider),signOut:()=>authSDK.signOut(auth)};
}
export function cloudError(error) {
  const messages={
    'auth/popup-blocked':'Allow the Google sign-in window, then tap Sign in again. On iPhone, try opening the site in Safari.',
    'auth/popup-closed-by-user':'Google sign-in was closed. Your data has not changed.',
    'auth/unauthorized-domain':'This website must be added to Firebase Authentication’s authorized domains.',
    'auth/operation-not-allowed':'Google sign-in is not enabled in Firebase yet.',
    'auth/network-request-failed':'Cannot reach Google. Check your connection and try again.',
    'permission-denied':'Cloud access was denied. The project owner needs to publish the private Firestore rules.',
    'unavailable':'Cloud storage is unavailable. Check your connection and retry.',
    'not-found':'The Firestore database has not been created yet.'
  };
  return messages[error?.code]||error?.message||'Cloud connection failed. Please try again.';
}
