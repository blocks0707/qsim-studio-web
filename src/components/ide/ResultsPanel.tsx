"use client";

import { useIDEStore, type ResultTab } from "@/stores/ideStore";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const HistogramChart = dynamic(() => import("./HistogramChart").then((m) => m.HistogramChart), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
      Loading chart...
    </div>
  ),
});

const tabs: { id: ResultTab; label: string }[] = [
  { id: "histogram", label: "Histogram" },
  { id: "probability", label: "Probability" },
  { id: "statistics", label: "Statistics" },
  { id: "console", label: "Console" },
];

const MOCK_COUNTS: Record<string, number> = {
  "00": 512,
  "11": 498,
  "01": 8,
  "10": 6,
};

function useCounts() {
  const jobResult = useIDEStore((s) => s.jobResult);
  return jobResult?.counts && Object.keys(jobResult.counts).length > 0
    ? jobResult.counts
    : MOCK_COUNTS;
}

function HistogramTab() {
  const counts = useCounts();
  return (
    <div className="flex-1 overflow-hidden p-3">
      <HistogramChart counts={counts} />
    </div>
  );
}

function ProbabilityTab() {
  const counts = useCounts();
  const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(counts)
    .map(([state, count]) => ({ state, count, probability: count / totalShots }))
    .sort((a, b) => b.probability - a.probability);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ color: "var(--text-secondary)" }}>
            <th className="text-left py-1 px-2">State</th>
            <th className="text-right py-1 px-2">Count</th>
            <th className="text-right py-1 px-2">Probability</th>
            <th className="py-1 px-2 w-1/3">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.state} className="hover:bg-white/5">
              <td className="py-1.5 px-2 font-mono" style={{ color: "var(--accent)" }}>
                |{r.state}⟩
              </td>
              <td className="py-1.5 px-2 text-right" style={{ color: "var(--text-primary)" }}>
                {r.count}
              </td>
              <td className="py-1.5 px-2 text-right" style={{ color: "var(--text-primary)" }}>
                {(r.probability * 100).toFixed(2)}%
              </td>
              <td className="py-1.5 px-2">
                <div className="h-3 rounded overflow-hidden" style={{ background: "var(--bg-sidebar)" }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${r.probability * 100}%`, background: "var(--accent)" }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatisticsTab() {
  const jobResult = useIDEStore((s) => s.jobResult);
  const currentJobId = useIDEStore((s) => s.currentJobId);
  const isRunning = useIDEStore((s) => s.isRunning);
  const counts = useCounts();
  const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);
  const meta = jobResult?.metadata;

  const cards: { label: string; value: string }[] = [
    { label: "Total Shots", value: String(totalShots) },
    { label: "Execution Time", value: meta?.executionTime ? `${meta.executionTime.toFixed(2)}s` : "—" },
    { label: "Circuit Depth", value: meta?.circuitDepth ? String(meta.circuitDepth) : "—" },
    { label: "Gate Count", value: meta?.gateCount ? String(meta.gateCount) : "—" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
      <div className="text-xs space-y-1 p-3 rounded" style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}>
        <div><span style={{ color: "var(--text-secondary)" }}>Job ID: </span><span className="font-mono">{currentJobId || "—"}</span></div>
        <div><span style={{ color: "var(--text-secondary)" }}>Backend: </span><span className="font-mono">{meta?.backend || "—"}</span></div>
        <div><span style={{ color: "var(--text-secondary)" }}>Status: </span>
          <span style={{ color: isRunning ? "#dcdcaa" : "#6a9955" }}>
            {isRunning ? "Running..." : jobResult ? "Completed ✓" : "Idle"}
          </span>
        </div>
      </div>
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
      <div className="flex items-center justify-end px-2 py-1 flex-shrink-0">
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
            <div key={i} className={log.includes("ERROR") || log.includes("Failed") ? "text-[#f44747]" : ""}>
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
  statistics: StatisticsTab,
  console: ConsoleTab,
};

export function ResultsPanel() {
  const activeTab = useIDEStore((s) => s.activeResultTab);
  const setActiveTab = useIDEStore((s) => s.setActiveResultTab);
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="h-full flex flex-col">
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
