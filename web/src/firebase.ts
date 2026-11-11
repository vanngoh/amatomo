import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const env = import.meta.env;
const DEMO_CONFIG = {
  apiKey: "demo-key",
  authDomain: "demo-amatomo.firebaseapp.com",
  projectId: "demo-amatomo",
  appId: "demo-app",
};

const host = location.hostname;
export const usingEmulators = host === "localhost" || host === "127.0.0.1";

/**
 * Config order: VITE_FIREBASE_* env vars, then Firebase Hosting's reserved
 * /__/firebase/init.json (works automatically once deployed), then the
 * demo-amatomo placeholder for the emulators.
 */
async function resolveConfig() {
  if (env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };
  }
  if (!usingEmulators) {
    try {
      const res = await fetch("/__/firebase/init.json");
      if (res.ok) return await res.json();
    } catch {
      /* not on Firebase Hosting */
    }
  }
  return DEMO_CONFIG;
}

const config = await resolveConfig();

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-east1");

if (usingEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export const ROOM_ID = "demo";

let ready: Promise<User> | null = null;
/** Sign in anonymously once; resolves with the user. */
export function ensureSignedIn(): Promise<User> {
  if (!ready) {
    ready = new Promise<User>((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          unsub();
          resolve(u);
        }
      });
      signInAnonymously(auth).catch((e) => {
        unsub();
        ready = null;
        reject(e);
      });
    });
  }
  return ready;
}
