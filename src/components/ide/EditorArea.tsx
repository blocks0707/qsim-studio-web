"use client";

import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { TabBar } from "./TabBar";
import { StudioHome } from "./StudioHome";
import { useIDEStore, getLanguageFromFilename, getLanguageDisplayName } from "@/stores/ideStore";

const MonacoEditor = dynamic(
  () => import("./MonacoEditor").then((m) => ({ default: m.MonacoEditor })),
  { ssr: false, loading: () => <div className="flex-1" style={{ background: "var(--bg-editor)" }} /> }
);

function EditorToolbar() {
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageDisplayName(getLanguageFromFilename(activeTab.title)) : "";

  if (!activeTabId) return null;

  return (
    <div
      className="h-[32px] flex items-center justify-between px-3 text-xs border-b flex-shrink-0"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
    >
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
          style={{ background: "#4ec9b022", color: "#4ec9b0" }}
          title="Run (not yet connected)"
        >
          <Play size={12} />
          <span>Run</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span>{language}</span>
      </div>
    </div>
  );
}

export function EditorArea() {
  const activeTabId = useIDEStore((s) => s.activeTabId);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-editor)" }}>
      <TabBar />
      {activeTabId ? (
        <>
          <EditorToolbar />
          <div className="flex-1 overflow-hidden">
            <MonacoEditor />
          </div>
        </>
      ) : (
        <StudioHome />
      )}
    </div>
  );
}
