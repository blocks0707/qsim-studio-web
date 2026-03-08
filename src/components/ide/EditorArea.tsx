"use client";

import dynamic from "next/dynamic";
import { Play, Square, Loader2, ChevronDown } from "lucide-react";
import { TabBar } from "./TabBar";
import { StudioHome } from "./StudioHome";
import { useIDEStore, getLanguageFromFilename, getLanguageDisplayName } from "@/stores/ideStore";
import { createClient, extractResult } from "@/lib/api";
import { useCallback, useRef, useState } from "react";

const MonacoEditor = dynamic(
  () => import("./MonacoEditor").then((m) => ({ default: m.MonacoEditor })),
  { ssr: false, loading: () => <div className="flex-1" style={{ background: "var(--bg-editor)" }} /> }
);

const SHOTS_OPTIONS = [256, 512, 1024, 2048, 4096];

function EditorToolbar() {
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const isRunning = useIDEStore((s) => s.isRunning);
  const shots = useIDEStore((s) => s.shots);
  const setShots = useIDEStore((s) => s.setShots);
  const [showShotsDropdown, setShowShotsDropdown] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageDisplayName(getLanguageFromFilename(activeTab.title)) : "";

  const handleRun = useCallback(async () => {
    const state = useIDEStore.getState();
    if (state.isRunning || !state.activeTabId) return;

    const code = state.fileContents[state.activeTabId] || "";
    const tab = state.openTabs.find((t) => t.id === state.activeTabId);
    const lang = tab ? getLanguageFromFilename(tab.title) : "python";

    const { setRunning, appendLog, setCurrentJobId, setJobResult, setActiveResultTab } = useIDEStore.getState();

    setRunning(true);
    setActiveResultTab("console");
    appendLog("Submitting job...");

    const { apiUrl, apiToken } = state;
    if (!apiUrl || !apiToken) {
      appendLog("⚠ API not configured. Using mock results.");
      await new Promise((r) => setTimeout(r, 1500));
      appendLog("Mock simulation completed.");
      setJobResult({
        counts: { "00": 512, "11": 498, "01": 8, "10": 6 },
        metadata: { executionTime: 0.34, circuitDepth: 4, gateCount: 3, backend: "mock-simulator", shots: state.shots },
      });
      setCurrentJobId("mock-" + Date.now());
      setRunning(false);
      setActiveResultTab("histogram");
      return;
    }

    try {
      const client = createClient(apiUrl, apiToken);
      const { id } = await client.submitJob({
        code,
        language: lang as "python" | "qasm",
        shots: state.shots,
      });
      setCurrentJobId(id);
      appendLog(`Job submitted: ${id}`);
      appendLog("Polling for results...");

      pollRef.current = setInterval(async () => {
        try {
          const status = await client.getJobStatus(id);
          appendLog(`Status: ${status.status}`);

          if (status.status === "completed") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            const rawResult = await client.getJobResult(id);
            const result = extractResult(rawResult);
            setJobResult(result);
            appendLog("✓ Simulation completed successfully.");
            setRunning(false);
            setActiveResultTab("histogram");
          } else if (status.status === "failed") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            appendLog(`ERROR: Job failed — ${status.error || "Unknown error"}`);
            setRunning(false);
          }
        } catch (err) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          appendLog(`ERROR: Polling failed — ${err instanceof Error ? err.message : String(err)}`);
          setRunning(false);
        }
      }, 2000);
    } catch (err) {
      appendLog(`ERROR: Failed to submit — ${err instanceof Error ? err.message : String(err)}`);
      setRunning(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    const { currentJobId, apiUrl, apiToken, setRunning, appendLog } = useIDEStore.getState();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (currentJobId && apiUrl && apiToken) {
      try {
        const client = createClient(apiUrl, apiToken);
        await client.cancelJob(currentJobId);
        appendLog(`Job ${currentJobId} cancelled.`);
      } catch {
        appendLog("Failed to cancel job on server.");
      }
    }
    setRunning(false);
    appendLog("Stopped.");
  }, []);

  if (!activeTabId) return null;

  return (
    <div
      className="h-[32px] flex items-center justify-between px-3 text-xs border-b flex-shrink-0"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
    >
      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
            style={{ background: "#f4474722", color: "#f44747" }}
            onClick={handleStop}
            title="Stop"
          >
            <Square size={12} />
            <span>Stop</span>
          </button>
        ) : (
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
            style={{ background: "#4ec9b022", color: "#4ec9b0" }}
            onClick={handleRun}
            title="Run simulation"
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            <span>Run</span>
          </button>
        )}

        {/* Shots selector */}
        <div className="relative">
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-white/10"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setShowShotsDropdown(!showShotsDropdown)}
          >
            <span>{shots} shots</span>
            <ChevronDown size={10} />
          </button>
          {showShotsDropdown && (
            <div
              className="absolute top-full left-0 mt-1 rounded shadow-lg z-50 py-1 min-w-[100px]"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
            >
              {SHOTS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className="block w-full text-left px-3 py-1 text-xs hover:bg-white/10"
                  style={{ color: s === shots ? "var(--accent)" : "var(--text-primary)" }}
                  onClick={() => { setShots(s); setShowShotsDropdown(false); }}
                >
                  {s.toLocaleString()} shots
                </button>
              ))}
            </div>
          )}
        </div>

        {isRunning && <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />}
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
