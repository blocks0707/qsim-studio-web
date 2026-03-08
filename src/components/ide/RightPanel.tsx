"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

function CircuitViewer() {
  return (
    <div className="h-full flex flex-col" style={{ borderBottom: "1px solid var(--border)" }}>
      <div
        className="h-9 flex items-center px-4 text-[11px] font-semibold tracking-wider flex-shrink-0 uppercase"
        style={{ color: "var(--text-secondary)", background: "var(--bg-sidebar)" }}
      >
        CIRCUIT VIEWER
      </div>
      <div className="flex-1 flex items-center justify-center p-4" style={{ background: "var(--bg-editor)" }}>
        <svg viewBox="0 0 400 160" className="w-full max-w-[380px]" style={{ opacity: 0.8 }}>
          {/* Qubit lines */}
          <line x1="60" y1="40" x2="360" y2="40" stroke="#858585" strokeWidth="1" />
          <line x1="60" y1="80" x2="360" y2="80" stroke="#858585" strokeWidth="1" />
          <line x1="60" y1="120" x2="360" y2="120" stroke="#858585" strokeWidth="1" />

          {/* Labels */}
          <text x="10" y="44" fill="#cccccc" fontSize="12" fontFamily="monospace">q₀</text>
          <text x="10" y="84" fill="#cccccc" fontSize="12" fontFamily="monospace">q₁</text>
          <text x="10" y="124" fill="#cccccc" fontSize="12" fontFamily="monospace">q₂</text>

          {/* H gate */}
          <rect x="80" y="22" width="36" height="36" fill="none" stroke="#4ec9b0" strokeWidth="1.5" rx="2" />
          <text x="98" y="45" fill="#4ec9b0" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="bold">H</text>

          {/* CNOT gate */}
          <line x1="160" y1="40" x2="160" y2="80" stroke="#569cd6" strokeWidth="1.5" />
          <circle cx="160" cy="40" r="5" fill="#569cd6" />
          <circle cx="160" cy="80" r="12" fill="none" stroke="#569cd6" strokeWidth="1.5" />
          <line x1="148" y1="80" x2="172" y2="80" stroke="#569cd6" strokeWidth="1.5" />
          <line x1="160" y1="68" x2="160" y2="92" stroke="#569cd6" strokeWidth="1.5" />

          {/* X gate */}
          <rect x="220" y="102" width="36" height="36" fill="none" stroke="#ce9178" strokeWidth="1.5" rx="2" />
          <text x="238" y="125" fill="#ce9178" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="bold">X</text>

          {/* Measurement */}
          <rect x="300" y="22" width="36" height="36" fill="none" stroke="#dcdcaa" strokeWidth="1.5" rx="2" />
          <path d="M308 48 Q318 32 328 48" fill="none" stroke="#dcdcaa" strokeWidth="1.2" />
          <line x1="318" y1="46" x2="326" y2="30" stroke="#dcdcaa" strokeWidth="1.2" />

          <rect x="300" y="62" width="36" height="36" fill="none" stroke="#dcdcaa" strokeWidth="1.5" rx="2" />
          <path d="M308 88 Q318 72 328 88" fill="none" stroke="#dcdcaa" strokeWidth="1.2" />
          <line x1="318" y1="86" x2="326" y2="70" stroke="#dcdcaa" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}

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
