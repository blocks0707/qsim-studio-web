"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { pqcSso, pqcGatewayUrl, pqcAppId } from "@/lib/pqc-sso";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [status, setStatus] = useState<"idle" | "signing-in" | "verifying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // 이미 로그인 + Gateway 권한 있으면 바로 이동
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    verifyAndRedirect();
  }, [user, isLoading]);

  async function verifyAndRedirect() {
    setStatus("verifying");
    try {
      const sessionUrl = new URL("/__pqc/session", pqcGatewayUrl);
      sessionUrl.searchParams.set("app_id", pqcAppId);
      const res = await pqcSso.fetchWithAuth(sessionUrl.toString());
      if (res.ok) {
        router.replace("/");
      } else {
        setStatus("error");
        setErrorMsg(res.status === 403
          ? "접근 권한이 없습니다. 관리자에게 문의하세요."
          : `Gateway 오류: ${res.status}`
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg("Gateway 연결 실패");
    }
  }

  async function handleLogin() {
    setStatus("signing-in");
    setErrorMsg("");
    try {
      await pqcSso.signInWithGoogle();
      // onAuthStateChanged가 user를 업데이트 → useEffect가 verifyAndRedirect 호출
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "로그인 실패");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
        <div className="text-[#858585] text-sm">세션 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
      <div className="w-full max-w-sm space-y-6 px-8 py-10 bg-[#252526] border border-[#3e3e42] rounded-lg">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[#cccccc]">QSim Studio</h1>
          <p className="text-sm text-[#858585]">Google 계정으로 로그인하세요.</p>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={status === "signing-in" || status === "verifying"}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
        >
          {status === "signing-in" ? "로그인 중..." : status === "verifying" ? "권한 확인 중..." : "Google로 로그인"}
        </button>

        {status === "error" && (
          <p className="text-sm text-[#f48771]">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
