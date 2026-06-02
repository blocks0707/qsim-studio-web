"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { pqcSso, pqcGatewayUrl, pqcAppId } from "@/lib/pqc-sso";

type State = "loading" | "signing-in" | "verifying" | "authorized" | "error";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const verified = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setState("signing-in");
      return;
    }

    if (verified.current) return;
    verified.current = true;

    async function verifyGateway() {
      setState("verifying");
      try {
        const sessionUrl = new URL("/__pqc/session", pqcGatewayUrl);
        sessionUrl.searchParams.set("app_id", pqcAppId);
        const res = await pqcSso.fetchWithAuth(sessionUrl.toString());
        if (res.ok) {
          setState("authorized");
        } else {
          verified.current = false;
          setState("error");
          setErrorMsg(res.status === 403
            ? "접근 권한이 없습니다. 관리자에게 문의하세요."
            : `Gateway 오류: ${res.status}`
          );
        }
      } catch {
        verified.current = false;
        setState("error");
        setErrorMsg("Gateway 연결 실패");
      }
    }

    verifyGateway();
  }, [user, isLoading]);

  async function handleSignIn() {
    setState("loading");
    setErrorMsg("");
    try {
      await pqcSso.signInWithGoogle();
    } catch {
      setState("signing-in");
    }
  }

  async function handleSignOut() {
    verified.current = false;
    await pqcSso.signOut();
    setState("signing-in");
  }

  if (state === "authorized") {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
      {state === "loading" || state === "verifying" ? (
        <div className="text-[#858585] text-sm">
          {state === "verifying" ? "권한 확인 중..." : "세션 확인 중..."}
        </div>
      ) : state === "error" ? (
        <div className="space-y-4 text-center px-8 py-10 bg-[#252526] border border-[#3e3e42] rounded-lg max-w-sm w-full">
          <p className="text-[#f48771] text-sm">{errorMsg}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm rounded transition-colors"
          >
            다른 계정으로 로그인
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-center px-8 py-10 bg-[#252526] border border-[#3e3e42] rounded-lg max-w-sm w-full">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-[#cccccc]">QSim Studio</h1>
            <p className="text-sm text-[#858585]">Google 계정으로 로그인하세요.</p>
          </div>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full px-4 py-2.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm rounded transition-colors"
          >
            Google로 로그인
          </button>
          {errorMsg && <p className="text-[#f48771] text-sm">{errorMsg}</p>}
        </div>
      )}
    </div>
  );
}
