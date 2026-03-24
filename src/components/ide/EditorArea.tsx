"use client";

import dynamic from "next/dynamic";
import { Play, Square, Loader2, ChevronDown } from "lucide-react";
import { TabBar } from "./TabBar";
import { StudioHome } from "./StudioHome";
import { SuggestionOverlay } from "./SuggestionOverlay";
import { useIDEStore, getLanguageFromFilename, getLanguageDisplayName } from "@/stores/ideStore";
import { createClient, extractResult, normalizePhase } from "@/lib/api";
import type { JobPhase } from "@/lib/api";
import { useCallback, useRef, useState, useEffect } from "react";

const MonacoEditor = dynamic(
  () => import("./MonacoEditor").then((m) => ({ default: m.MonacoEditor })),
  { ssr: false, loading: () => <div className="flex-1" style={{ background: "var(--bg-editor)" }} /> }
);

const SHOTS_OPTIONS = [256, 512, 1024, 2048, 4096];

function ts(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function phaseLogMessage(phase: JobPhase, status: Record<string, unknown>): string {
  switch (phase) {
    case "pending":
      return `[${ts()}] 📤 Job submitted: ${status.id || ""}`;
    case "analyzing":
      return `[${ts()}] 🔍 Analyzing circuit complexity...`;
    case "scheduling": {
      const pool = status.assignedPool || "default";
      return `[${ts()}] 📋 Scheduling on ${pool} pool...`;
    }
    case "running": {
      const est = status.estimatedTimeSec ? ` (est. ~${status.estimatedTimeSec}s)` : "";
      return `[${ts()}] ⚡ Running simulation${est}...`;
    }
    case "succeeded": {
      const execTime = status.executionTime ? `${Number(status.executionTime).toFixed(1)}s` : "—";
      return `[${ts()}] ✓ Simulation completed in ${execTime}`;
    }
    case "failed":
      return `[${ts()}] ✗ Job failed — ${status.error || "Unknown error"}`;
    case "cancelled":
      return `[${ts()}] ⊘ Job cancelled`;
    default:
      return `[${ts()}] Status: ${phase}`;
  }
}

function phaseTransitionLog(prev: JobPhase, next: JobPhase, status: Record<string, unknown>): string[] {
  const logs: string[] = [];
  // Add completion message for previous phase
  if (prev === "analyzing" && (next === "scheduling" || next === "running" || next === "succeeded")) {
    const q = status.qubits ? `${status.qubits} qubits` : "";
    const d = status.circuitDepth ? `depth ${status.circuitDepth}` : "";
    const cls = status.complexityClass ? `class ${status.complexityClass}` : "";
    const parts = [q, d, cls].filter(Boolean).join(", ");
    logs.push(`[${ts()}] ✓ Analysis complete${parts ? `: ${parts}` : ""}`);
  }
  if (prev === "scheduling" && (next === "running" || next === "succeeded")) {
    const node = status.assignedNode || "";
    logs.push(`[${ts()}] ✓ Assigned to ${node || "compute node"}`);
  }
  // Add new phase message
  logs.push(phaseLogMessage(next, status));
  return logs;
}

function EditorToolbar() {
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const isRunning = useIDEStore((s) => s.isRunning);
  const shots = useIDEStore((s) => s.shots);
  const setShots = useIDEStore((s) => s.setShots);
  const [showShotsDropdown, setShowShotsDropdown] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPhaseRef = useRef<JobPhase | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageDisplayName(getLanguageFromFilename(activeTab.title)) : "";

  const runJob = useCallback(async () => {
    const state = useIDEStore.getState();
    if (state.isRunning || !state.activeTabId) return;

    const code = state.fileContents[state.activeTabId] || "";
    const tab = state.openTabs.find((t) => t.id === state.activeTabId);
    const lang = tab ? getLanguageFromFilename(tab.title) : "python";

    const {
      setRunning, appendLog, setCurrentJobId, setJobResult, setActiveResultTab,
      setJobPhase, setJobEstimatedTimeSec, setJobStartTime, setJobAssignedNode,
      setJobAssignedPool, setJobQubits, setLastSubmittedCode, setLastSubmittedLanguage,
      clearLogs,
    } = useIDEStore.getState();

    clearLogs();
    setRunning(true);
    setJobResult(null);
    setJobPhase("pending");
    setJobEstimatedTimeSec(null);
    setJobStartTime(null);
    setJobAssignedNode(null);
    setJobAssignedPool(null);
    setJobQubits(null);
    setLastSubmittedCode(code);
    setLastSubmittedLanguage(lang);
    lastPhaseRef.current = null;
    setActiveResultTab("console");
    appendLog(`[${ts()}] 📤 Submitting job...`);

    const { apiUrl, apiToken } = state;
    if (!apiUrl || !apiToken) {
      appendLog(`[${ts()}] ⚠ API not configured. Using mock results.`);
      setJobPhase("analyzing");
      await new Promise((r) => setTimeout(r, 500));
      appendLog(`[${ts()}] 🔍 Analyzing circuit complexity...`);
      setJobPhase("scheduling");
      await new Promise((r) => setTimeout(r, 400));
      appendLog(`[${ts()}] ✓ Analysis complete: 2 qubits, depth 4, class A`);
      appendLog(`[${ts()}] 📋 Scheduling on cpu pool...`);
      setJobPhase("running");
      setJobStartTime(new Date().toISOString());
      setJobEstimatedTimeSec(2);
      setJobAssignedNode("mock-node-01");
      setJobAssignedPool("cpu");
      setJobQubits(2);
      await new Promise((r) => setTimeout(r, 300));
      appendLog(`[${ts()}] ✓ Assigned to mock-node-01`);
      appendLog(`[${ts()}] ⚡ Running simulation (est. ~2s)...`);
      await new Promise((r) => setTimeout(r, 1200));
      appendLog(`[${ts()}] ✓ Simulation completed in 1.2s`);
      setJobPhase("succeeded");
      setJobResult({
        counts: { "00": 512, "11": 498, "01": 8, "10": 6 },
        metadata: { executionTime: 1.2, circuitDepth: 4, gateCount: 3, backend: "mock-simulator", shots: state.shots, complexityClass: "A" },
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
      appendLog(`[${ts()}] 📤 Job submitted: ${id}`);
      lastPhaseRef.current = "pending";

      pollRef.current = setInterval(async () => {
        try {
          const status = await client.getJobStatus(id);
          const phase = normalizePhase(status.status);
          const prev = lastPhaseRef.current;

          // Update state from API
          if (status.estimatedTimeSec) setJobEstimatedTimeSec(status.estimatedTimeSec);
          if (status.startTime) setJobStartTime(status.startTime);
          if (status.assignedNode) setJobAssignedNode(status.assignedNode);
          if (status.assignedPool) setJobAssignedPool(status.assignedPool);
          if (status.qubits) setJobQubits(status.qubits);

          // Only log on phase change
          if (phase !== prev) {
            setJobPhase(phase);
            const statusObj = status as unknown as Record<string, unknown>;
            if (prev) {
              const msgs = phaseTransitionLog(prev, phase, statusObj);
              msgs.forEach((m) => appendLog(m));
            } else {
              appendLog(phaseLogMessage(phase, statusObj));
            }
            lastPhaseRef.current = phase;
          }

          if (phase === "succeeded") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            const rawResult = await client.getJobResult(id);
            const result = extractResult(rawResult);
            // Enrich result metadata from job status
            const enriched = {
              ...result,
              metadata: {
                ...result.metadata,
                executionTime: status.executionTime ? Number(status.executionTime) / 1000 : result.metadata?.executionTime,
                circuitDepth: (status.complexity as Record<string, unknown>)?.depth as number ?? result.metadata?.circuitDepth,
                gateCount: (status.complexity as Record<string, unknown>)?.gateCount as number ?? result.metadata?.gateCount,
                backend: status.assignedNode || result.metadata?.backend,
                complexityClass: (status.complexity as Record<string, unknown>)?.class as string ?? result.metadata?.complexityClass,
                shots: state.shots,
              },
            };
            setJobResult(enriched);
            setRunning(false);
            setActiveResultTab("histogram");
          } else if (phase === "failed" || phase === "cancelled") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRunning(false);
          }
        } catch (err) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          const errMsg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as {message:unknown}).message) : JSON.stringify(err);
          appendLog(`[${ts()}] ✗ ERROR: Polling failed — ${errMsg}`);
          setJobPhase("failed");
          setRunning(false);
        }
      }, 2000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as {message:unknown}).message) : JSON.stringify(err);
      appendLog(`[${ts()}] ✗ ERROR: Failed to submit — ${errMsg}`);
      setJobPhase("failed");
      setRunning(false);
    }
  }, []);

  // Listen for retry events
  useEffect(() => {
    const handler = () => runJob();
    window.addEventListener("qsim-retry-job", handler);
    return () => window.removeEventListener("qsim-retry-job", handler);
  }, [runJob]);

  const handleStop = useCallback(async () => {
    const { currentJobId, apiUrl, apiToken, setRunning, appendLog, setJobPhase } = useIDEStore.getState();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (currentJobId && apiUrl && apiToken) {
      try {
        const client = createClient(apiUrl, apiToken);
        await client.cancelJob(currentJobId);
        appendLog(`[${ts()}] ⊘ Job ${currentJobId} cancelled.`);
      } catch {
        appendLog(`[${ts()}] ⚠ Failed to cancel job on server.`);
      }
    }
    setJobPhase("cancelled");
    setRunning(false);
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
            onClick={runJob}
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
          <div className="flex-1 overflow-hidden relative">
            <SuggestionOverlay />
            <MonacoEditor />
          </div>
        </>
      ) : (
        <StudioHome />
      )}
    </div>
  );
}
