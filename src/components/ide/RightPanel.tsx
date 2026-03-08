"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { CircuitViewer } from "./CircuitViewer";

function ResultsPanel() {
  const results = [
    { state: "|00⟩", count: 512, probability: 0.5 },
    { state: "|11⟩", count: 498, probability: 0.487 },
    { state: "|01⟩", count: 8, probability: 0.008 },
    { state: "|10⟩", count: 6, probability: 0.006 },
  ];

  const maxCount = Math.max(...results.map((r) => r.count));

  return (
    <div className="h-full flex flex-col">
      <div
        className="h-9 flex items-center px-4 text-[11px] font-semibold tracking-wider flex-shrink-0 uppercase"
        style={{ color: "var(--text-secondary)", background: "var(--bg-sidebar)" }}
      >
        RESULTS
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ background: "var(--bg-editor)" }}>
        <div className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Bell State · 1024 shots · 0.34s
        </div>
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.state} className="flex items-center gap-2">
              <span className="font-mono text-xs w-10 flex-shrink-0" style={{ color: "var(--text-primary)" }}>
                {r.state}
              </span>
              <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--bg-sidebar)" }}>
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${(r.count / maxCount) * 100}%`,
                    background: r.probability > 0.1 ? "var(--accent)" : "#4ec9b0",
                  }}
                />
              </div>
              <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                {r.count}
              </span>
              <span className="text-xs w-12 text-right flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                {(r.probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
        <div
          className="mt-4 p-2 rounded text-xs font-mono"
          style={{ background: "var(--bg-sidebar)", color: "var(--text-secondary)" }}
        >
          <div style={{ color: "#6a9955" }}>// Execution summary</div>
          <div>Backend: qsim-node-01 (32 qubits)</div>
          <div>Transpiled depth: 4</div>
          <div>Total gates: 3 (H: 1, CX: 1, Measure: 2)</div>
          <div style={{ color: "#4ec9b0" }}>Status: completed ✓</div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel() {
  return (
    <div className="h-full" style={{ borderLeft: "1px solid var(--border)" }}>
      <PanelGroup direction="vertical">
        <Panel defaultSize={55} minSize={20} id="circuit">
          <CircuitViewer />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={45} minSize={20} id="results">
          <ResultsPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
