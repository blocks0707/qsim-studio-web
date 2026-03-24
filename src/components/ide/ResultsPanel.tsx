"use client";

import { useIDEStore, type ResultTab } from "@/stores/ideStore";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { JobProgress } from "./JobProgress";
import { StatusBadge } from "./StatusBadge";
import type { JobPhase } from "@/lib/api";

const chartLoading = () => (
  <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
    Loading chart...
  </div>
);

const HistogramChart = dynamic(() => import("./HistogramChart").then((m) => m.HistogramChart), {
  ssr: false,
  loading: chartLoading,
});

const ProbabilityChart = dynamic(() => import("./ProbabilityChart").then((m) => m.ProbabilityChart), {
  ssr: false,
  loading: chartLoading,
});

const QSphereView = dynamic(() => import("./QSphereView"), {
  ssr: false,
  loading: chartLoading,
});

const StateCityView = dynamic(() => import("./StateCityView").then((m) => m.StateCityView), {
  ssr: false,
  loading: chartLoading,
});

const tabs: { id: ResultTab; label: string }[] = [
  { id: "histogram", label: "Histogram" },
  { id: "probability", label: "Probability" },
  { id: "qsphere", label: "Q-Sphere" },
  { id: "statecity", label: "State City" },
  { id: "statistics", label: "Statistics" },
  { id: "console", label: "Console" },
];

function useCounts() {
  const jobResult = useIDEStore((s) => s.jobResult);
  return jobResult?.counts && Object.keys(jobResult.counts).length > 0
    ? jobResult.counts
    : null;
}

function HistogramTab() {
  const counts = useCounts();
  if (!counts) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">Run a simulation to see results</p>
      </div>
    );
  }
  // Use a key derived from counts to force Recharts to re-render on data change
  const chartKey = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(',');
  return (
    <div className="flex-1 overflow-hidden p-3">
      <HistogramChart key={chartKey} counts={counts} />
    </div>
  );
}

function ProbabilityTab() {
  const counts = useCounts();
  if (!counts) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">Run a simulation to see results</p>
      </div>
    );
  }
  const chartKey = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(',');
  return (
    <div className="flex-1 overflow-hidden p-3">
      <ProbabilityChart key={chartKey} counts={counts} />
    </div>
  );
}

function QSphereTab() {
  const counts = useCounts();
  const jobResult = useIDEStore((s) => s.jobResult);
  const statevector = jobResult?.statevector;
  // Delay Canvas mount to ensure container has layout dimensions
  // R3F Canvas needs a non-zero container size on mount
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Wait for layout to settle, then mount Canvas
    const id = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => { clearTimeout(id); setMounted(false); };
  }, []);

  if (!counts) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">Run a simulation to see results</p>
      </div>
    );
  }
  return (
    <div ref={containerRef} className="flex-1 overflow-hidden p-3 flex items-center justify-center" style={{ minHeight: 200 }}>
      {mounted && <QSphereView counts={counts} statevector={statevector} />}
    </div>
  );
}

function StateCityTab() {
  const counts = useCounts();
  if (!counts) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">Run a simulation to see results</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-hidden p-3 flex items-center justify-center">
      <StateCityView counts={counts} />
    </div>
  );
}

function ProgressBar() {
  const jobPhase = useIDEStore((s) => s.jobPhase);
  const jobStartTime = useIDEStore((s) => s.jobStartTime);
  const estimatedTimeSec = useIDEStore((s) => s.jobEstimatedTimeSec);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (jobPhase !== "running" || !jobStartTime || !estimatedTimeSec) {
      if (jobPhase === "succeeded") setProgress(100);
      return;
    }

    const iv = setInterval(() => {
      const elapsed = (Date.now() - new Date(jobStartTime).getTime()) / 1000;
      const pct = Math.min(95, (elapsed / estimatedTimeSec) * 100);
      setProgress(pct);
    }, 200);

    return () => clearInterval(iv);
  }, [jobPhase, jobStartTime, estimatedTimeSec]);

  if (!jobPhase || jobPhase === "succeeded" || jobPhase === "failed" || jobPhase === "cancelled") {
    if (jobPhase === "succeeded") {
      return (
        <div className="w-full h-2 rounded overflow-hidden" style={{ background: "var(--bg-sidebar)" }}>
          <div className="h-full rounded transition-all" style={{ width: "100%", background: "#6a9955" }} />
        </div>
      );
    }
    return null;
  }

  const remaining = estimatedTimeSec
    ? Math.max(0, estimatedTimeSec - (Date.now() - new Date(jobStartTime || Date.now()).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded overflow-hidden" style={{ background: "var(--bg-sidebar)" }}>
        <div
          className="h-full rounded transition-all"
          style={{ width: `${progress}%`, background: "#569cd6" }}
        />
      </div>
      {remaining !== null && (
        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          Running... ~{remaining.toFixed(0)}s remaining
        </div>
      )}
    </div>
  );
}

function RetryButton() {
  const jobPhase = useIDEStore((s) => s.jobPhase);
  const lastCode = useIDEStore((s) => s.lastSubmittedCode);

  if (jobPhase !== "failed" || !lastCode) return null;

  const handleRetry = () => {
    // Trigger re-run by dispatching a custom event that EditorArea listens to
    window.dispatchEvent(new CustomEvent("qsim-retry-job"));
  };

  return (
    <button
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
      style={{ background: "#f4474722", color: "#f44747", border: "1px solid #f4474744" }}
      onClick={handleRetry}
    >
      <RotateCcw size={12} />
      Retry
    </button>
  );
}

function StatisticsTab() {
  const jobResult = useIDEStore((s) => s.jobResult);
  const currentJobId = useIDEStore((s) => s.currentJobId);
  const jobPhase = useIDEStore((s) => s.jobPhase);
  const assignedNode = useIDEStore((s) => s.jobAssignedNode);
  const assignedPool = useIDEStore((s) => s.jobAssignedPool);
  const qubits = useIDEStore((s) => s.jobQubits);
  const counts = useCounts();
  const totalShots = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const meta = jobResult?.metadata;

  const cards: { label: string; value: string }[] = [
    { label: "Total Shots", value: String(totalShots) },
    { label: "Execution Time", value: meta?.executionTime ? `${meta.executionTime.toFixed(2)}s` : "—" },
    { label: "Circuit Depth", value: meta?.circuitDepth ? String(meta.circuitDepth) : "—" },
    { label: "Gate Count", value: meta?.gateCount ? String(meta.gateCount) : "—" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Progress bar */}
      <ProgressBar />

      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-3 rounded"
            style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{c.label}</div>
            <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Execution info */}
      <div className="text-xs space-y-1 p-3 rounded" style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}>
        <div><span style={{ color: "var(--text-secondary)" }}>Job ID: </span><span className="font-mono">{currentJobId || "—"}</span></div>
        <div><span style={{ color: "var(--text-secondary)" }}>Backend: </span><span className="font-mono">{meta?.backend || "—"}</span></div>
        <div><span style={{ color: "var(--text-secondary)" }}>Status: </span>
          {jobPhase ? <StatusBadge phase={jobPhase} /> : (
            <span style={{ color: jobResult ? "#6a9955" : "var(--text-secondary)" }}>
              {jobResult ? "Completed ✓" : "Idle"}
            </span>
          )}
        </div>
        {assignedNode && (
          <div><span style={{ color: "var(--text-secondary)" }}>Node: </span><span className="font-mono">{assignedNode}</span></div>
        )}
        {assignedPool && (
          <div><span style={{ color: "var(--text-secondary)" }}>Pool: </span><span className="font-mono">{assignedPool}</span></div>
        )}
        {qubits != null && (
          <div><span style={{ color: "var(--text-secondary)" }}>Qubits: </span><span>{qubits}</span></div>
        )}
        {meta?.complexityClass && (
          <div><span style={{ color: "var(--text-secondary)" }}>Complexity: </span><span>Class {meta.complexityClass}</span></div>
        )}
      </div>

      {/* Retry button */}
      <RetryButton />
    </div>
  );
}

function ConsoleTab() {
  const logs = useIDEStore((s) => s.consoleLogs);
  const clearLogs = useIDEStore((s) => s.clearLogs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 flex-shrink-0">
        <RetryButton />
        <button
          className="text-xs px-2 py-0.5 rounded hover:bg-white/10"
          style={{ color: "var(--text-secondary)" }}
          onClick={clearLogs}
        >
          Clear
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-5"
        style={{ background: "#0d1117", color: "#4ec9b0" }}
      >
        {logs.length === 0 ? (
          <div style={{ color: "#6a9955" }}>{"// Console output will appear here..."}</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={
              log.includes("ERROR") || log.includes("Failed") || log.includes("✗")
                ? "text-[#f44747]"
                : log.includes("✓")
                ? "text-[#6a9955]"
                : ""
            }>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const tabComponents: Record<ResultTab, React.FC> = {
  histogram: HistogramTab,
  probability: ProbabilityTab,
  qsphere: QSphereTab,
  statecity: StateCityTab,
  statistics: StatisticsTab,
  console: ConsoleTab,
};

export function ResultsPanel() {
  const activeTab = useIDEStore((s) => s.activeResultTab);
  const setActiveTab = useIDEStore((s) => s.setActiveResultTab);
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="h-full flex flex-col">
      {/* Job Progress Stepper */}
      <JobProgress />

      <div
        className="flex items-center h-9 flex-shrink-0 border-b"
        style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            className="px-3 h-full text-[11px] font-medium tracking-wide uppercase transition-colors relative"
            style={{
              color: activeTab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
              background: activeTab === t.id ? "var(--bg-editor)" : "transparent",
            }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {activeTab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "var(--accent)" }} />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex flex-col" style={{ background: "var(--bg-editor)" }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
