import {healthBridge} from './health-cloud.js?v=49';
import {firebaseConfig} from './firebase-config.js';
import {nextRecord, CloudSession} from './cloud-model.js?v=49';

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
  const ref=uid=>dbSDK.doc(db,'users',uid,'state','main');
  const store={
    async read(uid) {
      const snapshot=await dbSDK.getDocFromServer(ref(uid));
      return snapshot.exists()?snapshot.data():null;
    },
    async write(uid,expected,payload) {
      return dbSDK.runTransaction(db,async transaction=>{
        if(auth.currentUser?.uid!==uid) throw new Error('Account changed.');
        const snapshot=await transaction.get(ref(uid));
        const record=nextRecord(snapshot.exists()?snapshot.data():null,expected,payload);
        transaction.set(ref(uid),{...record,updatedAt:dbSDK.serverTimestamp()});
        return record;
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
