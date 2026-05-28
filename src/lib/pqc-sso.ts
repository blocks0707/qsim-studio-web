import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onIdTokenChanged,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

// Inlined from @blocks/pqc-sso-web (packages/web-client/src/index.js)

function getOrCreateFirebaseApp(config: Record<string, string | undefined>, appName?: string) {
  if (!config || typeof config !== "object") throw new Error("pqc-sso: firebaseConfig is required");
  if (appName) {
    return getApps().some((a) => a.name === appName) ? getApp(appName) : initializeApp(config, appName);
  }
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

function normalizeEmail(email: string | null | undefined): string {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || normalized.includes("/") || !normalized.includes("@")) {
    throw new Error("pqc-sso: invalid email");
  }
  return normalized;
}

function createPqcSsoClient(options: {
  firebaseConfig: Record<string, string | undefined>;
  appName?: string;
  auth?: Auth;
  provider?: GoogleAuthProvider;
}) {
  const app = getOrCreateFirebaseApp(options.firebaseConfig, options.appName);
  const auth = options.auth ?? getAuth(app);
  const provider = options.provider ?? new GoogleAuthProvider();

  return {
    app,
    auth,
    provider,
    onAuthStateChanged(callback: (user: User | null) => void) {
      return onAuthStateChanged(auth, callback);
    },
    onIdTokenChanged(callback: (user: User | null) => void) {
      return onIdTokenChanged(auth, callback);
    },
    async signInWithGoogle() {
      const credential = await signInWithPopup(auth, provider);
      const email = normalizeEmail(credential.user.email);
      const idToken = await credential.user.getIdToken();
      return { user: credential.user, email, idToken };
    },
    async getSession(opts: { forceRefresh?: boolean } = {}) {
      const user = auth.currentUser;
      if (!user) return null;
      const email = normalizeEmail(user.email);
      const idToken = await user.getIdToken(Boolean(opts.forceRefresh));
      return { user, email, idToken };
    },
    async getAuthorizationHeader(opts: { forceRefresh?: boolean } = {}) {
      const session = await this.getSession(opts);
      return session ? `Bearer ${session.idToken}` : null;
    },
    async fetchWithAuth(input: string, init: RequestInit = {}) {
      const authorization = await this.getAuthorizationHeader();
      if (!authorization) throw new Error("pqc-sso: user is not signed in");
      const headers = new Headers(init.headers);
      headers.set("Authorization", authorization);
      return fetch(input, { ...init, headers });
    },
    async signOut() {
      await signOut(auth);
    },
  };
}

export const pqcSso = createPqcSsoClient({
  firebaseConfig: {
    apiKey: process.env.NEXT_PUBLIC_PQC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_PQC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_PQC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_PQC_FIREBASE_APP_ID,
  },
});

export const pqcGatewayUrl = process.env.NEXT_PUBLIC_PQC_GATEWAY_URL ?? "";
export const pqcAppId = process.env.NEXT_PUBLIC_PQC_APP_ID ?? "blockqai";
