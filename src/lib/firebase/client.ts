import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";

// Written out in full so Next.js inlines each NEXT_PUBLIC_ value at build time.
const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Sign-in is not configured yet. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
    this.name = "FirebaseNotConfiguredError";
  }
}

/**
 * Browser-side Firebase Auth, used only to sign in and obtain an ID token.
 * The server's session cookie is the real session, so the browser keeps
 * nothing: persistence is in-memory and the user is signed out of the client
 * SDK straight after the cookie is issued.
 */
export async function firebaseAuth(): Promise<Auth> {
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    throw new FirebaseNotConfiguredError();
  }

  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  if (emulatorHost && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
  }
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}
