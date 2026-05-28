"use client";

import { GitBranch, AlertCircle, AlertTriangle, Wifi, WifiOff, LogOut } from "lucide-react";
import { useIDEStore, getLanguageFromFilename, getLanguageDisplayName } from "@/stores/ideStore";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/api";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function StatusBar() {
  const cursorPosition = useIDEStore((s) => s.cursorPosition);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const isConnected = useIDEStore((s) => s.isConnected);
  const isRunning = useIDEStore((s) => s.isRunning);
  const apiUrl = useIDEStore((s) => s.apiUrl);
  const apiToken = useIDEStore((s) => s.apiToken);
  const setConnected = useIDEStore((s) => s.setConnected);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { email, signOut } = useAuthStore();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageDisplayName(getLanguageFromFilename(activeTab.title)) : "Plain Text";

  useEffect(() => {
    const check = async () => {
      if (!apiUrl || !apiToken) {
        setConnected(false);
        return;
      }
      const client = createClient(apiUrl, apiToken);
      const ok = await client.checkHealth();
      setConnected(ok);
    };
    check();
    intervalRef.current = setInterval(check, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [apiUrl, apiToken, setConnected]);

  return (
    <div
      className="h-[22px] flex items-center justify-between px-2 text-xs flex-shrink-0 text-white"
      style={{ background: "var(--bg-statusbar)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <AlertCircle size={12} />
            <span>0</span>
          </span>
          <span className="flex items-center gap-0.5">
            <AlertTriangle size={12} />
            <span>0</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <>
              <Wifi size={12} className="text-[#4ec9b0]" />
              <span className="text-[#4ec9b0]">Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-[#f44747]" />
              <span className="text-[#f44747]">Disconnected</span>
            </>
          )}
        </div>
        {isRunning && (
          <span className="text-[#dcdcaa]">⚡ Running...</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
        <span>Spaces: 4</span>
        <span>UTF-8</span>
        <span>{language}</span>
        {email && (
          <>
            <span className="text-[#858585]">{email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1 hover:text-[#cccccc] text-[#858585] transition-colors"
              title="로그아웃"
            >
              <LogOut size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
