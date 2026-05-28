"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { pqcSso, pqcGatewayUrl, pqcAppId } from "@/lib/pqc-sso";

type State = "loading" | "authorized" | "error";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const verified = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // 세션 없음 → Google 로그인 페이지로 리다이렉트
      pqcSso.signInWithRedirect();
      return;
    }

    // 이미 Gateway 검증 완료된 경우 재실행 방지
    if (verified.current) return;
    verified.current = true;

    async function verifyGateway() {
      try {
        const sessionUrl = new URL("/__pqc/session", pqcGatewayUrl);
        sessionUrl.searchParams.set("app_id", pqcAppId);
        const res = await pqcSso.fetchWithAuth(sessionUrl.toString());
        if (res.ok) {
          setState("authorized");
        } else {
          setState("error");
          setErrorMsg(res.status === 403
            ? "접근 권한이 없습니다. 관리자에게 문의하세요."
            : `Gateway 오류: ${res.status}`
          );
        }
      } catch {
        setState("error");
        setErrorMsg("Gateway 연결 실패");
      }
    }

    verifyGateway();
  }, [user, isLoading]);

  if (isLoading || state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
        <div className="text-[#858585] text-sm">세션 확인 중...</div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
        <div className="space-y-4 text-center px-8 py-10 bg-[#252526] border border-[#3e3e42] rounded-lg max-w-sm w-full">
          <p className="text-[#f48771] text-sm">{errorMsg}</p>
          <button
            type="button"
            onClick={async () => {
              verified.current = false;
              await pqcSso.signOut();
              pqcSso.signInWithRedirect();
            }}
            className="w-full px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm rounded transition-colors"
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
