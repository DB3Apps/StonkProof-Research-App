import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, Timestamp, addDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use a getter to ensure db is initialized correctly and safely
let _db: any;
let _dbInitFailed = false;

export const getDb = () => {
    if (!_db) {
        try {
            _db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
            console.log("Firebase DB initialized successfully:", !!_db, "Type:", typeof _db);
        } catch (e) {
            console.error("Failed to initialize Firestore (likely due to third-party cookies being blocked in iframe):", e);
            throw new Error("Firestore initialization failed");
        }
    }
    return _db;
};

// Export db to maintain compatibility
// Removed export const db = getDb(); to avoid module-level initialization crashes
export const googleProvider = new GoogleAuthProvider();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth Helpers

// Call this on app load to capture redirect results
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const db = getDb();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: Timestamp.now(),
        createdAt: Timestamp.now()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Redirect Auth Error:", error);
  }
};

export const signInWithGoogle = async () => {
  try {
    // Attempt signInWithPopup first as it is more reliable in AI Studio preview domain whitelist
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user profile
    const db = getDb();
    if (db) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: Timestamp.now(),
        createdAt: Timestamp.now()
      }, { merge: true });
    }
    
    return user;
  } catch (error: any) {
    console.warn("Popup authentication failed, showing sandboxed frame / native webview warning", error);
    
    // Do NOT automatically call signInWithRedirect. In browser iframe previews and native Capacitor containers,
    // top-level redirections or frame refreshes wipe out the React SPA memory and return the user back to step 'instructions'.
    // Instead, throw a pristine error instructing the user to enter Guest Mode for 100% capabilities.
    throw new Error(
      "Iframe / Mobile Sandbox detected.\n\n" +
      "Your browser blocks Google Popup cookies inside this sandboxed environment.\n\n" +
      "Please tap 'CONTINUE AS GUEST' below to research stocks immediately with 100% of all features enabled!"
    );
  }
};

export const logout = () => signOut(auth);

// Export firestore methods so they are guaranteed to use the same module instance
export { doc, onSnapshot, setDoc, getDoc, collection, query, where, Timestamp, onAuthStateChanged, addDoc, deleteDoc, getDocs, updateDoc };
