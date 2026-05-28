"use client";

import { create } from "zustand";
import type { User } from "firebase/auth";
import { pqcSso } from "@/lib/pqc-sso";

interface AuthState {
  user: User | null;
  email: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  email: null,
  isLoading: true,

  signOut: async () => {
    await pqcSso.signOut();
    useAuthStore.setState({ user: null, email: null });
  },
}));

if (typeof window !== "undefined") {
  pqcSso.onAuthStateChanged((user) => {
    useAuthStore.setState({ user, email: user?.email ?? null });
  });

  // authStateReady()는 signInWithRedirect 결과 처리까지 완료된 후 resolve됨.
  // isLoading을 true로 유지하다가 여기서 false로 전환해야
  // redirect 복귀 직후의 null 상태에서 AuthGuard가 재redirect하는 것을 방지함.
  pqcSso.auth.authStateReady().then(() => {
    useAuthStore.setState({ isLoading: false });
  });
}
