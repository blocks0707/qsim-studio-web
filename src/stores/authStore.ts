"use client";

import { create } from "zustand";
import type { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  email: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const emergencyOpenMode = process.env.NEXT_PUBLIC_PQC_AUTH_MODE !== "strict";

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  email: null,
  isLoading: !emergencyOpenMode,

  signOut: async () => {
    const { pqcSso } = await import("@/lib/pqc-sso");
    await pqcSso.signOut();
    useAuthStore.setState({ user: null, email: null });
  },
}));

if (typeof window !== "undefined" && !emergencyOpenMode) {
  void import("@/lib/pqc-sso").then(({ pqcSso }) => {
    pqcSso.onAuthStateChanged((user) => {
      useAuthStore.setState({ user, email: user?.email ?? null, isLoading: false });
    });
  });
}
