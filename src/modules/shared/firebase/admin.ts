import admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { createLogger } from "../logger/logger.js";

const log = createLogger("firebase-admin");

let firestoreInstance: Firestore | undefined;

export type FirebaseAdminCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export function initFirebaseAdmin(credentials: FirebaseAdminCredentials): void {
  if (admin.apps.length > 0) {
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
  });
  log.info("Firebase Admin initialized");
}

export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance;
}
