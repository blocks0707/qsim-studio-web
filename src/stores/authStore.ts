"use client";

import { create } from "zustand";
import { getRedirectResult } from "firebase/auth";
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

  // getRedirectResult()를 명시적으로 호출해야 redirect result가 처리됨.
  // 이 Promise가 resolve된 후에야 onAuthStateChanged가 최종 user 상태로 확정되므로
  // isLoading을 그 시점까지 true로 유지해 AuthGuard의 조기 재redirect를 막음.
  getRedirectResult(pqcSso.auth)
    .catch(() => null)
    .finally(() => {
      useAuthStore.setState({ isLoading: false });
    });
}
