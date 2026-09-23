import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function adminApp(): App {
  if (getApps().length) return getApp();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Env files and hosting dashboards store the key's newlines as "\n".
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // The Auth emulator needs only a project id; the Admin SDK finds the
  // emulator through FIREBASE_AUTH_EMULATOR_HOST. Checked first so leftover
  // placeholder credentials are ignored while it is on.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && projectId) {
    return initializeApp({ projectId });
  }

  if (clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from a service account key (see .env.example)."
  );
}

/** Firebase Admin Auth, for verifying ID tokens and session cookies on the server. */
export function adminAuth(): Auth {
  return getAuth(adminApp());
}
