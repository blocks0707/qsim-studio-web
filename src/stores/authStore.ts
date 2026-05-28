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

// Firebase auth state 구독 — 모듈 로드 시 1회 실행
if (typeof window !== "undefined") {
  pqcSso.onAuthStateChanged((user) => {
    useAuthStore.setState({
      user,
      email: user?.email ?? null,
      isLoading: false,
    });
  });
}
