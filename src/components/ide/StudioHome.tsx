"use client";

import { algorithms } from "@/lib/algorithms";
import { useIDEStore, getLanguageFromFilename } from "@/stores/ideStore";

function AlgorithmCard({ algo }: { algo: (typeof algorithms)[number] }) {
  const openAlgorithm = useIDEStore((s) => s.openAlgorithm);

  return (
    <button
      onClick={() => openAlgorithm(algo.id)}
      className="group flex flex-col items-start gap-1.5 p-4 rounded-lg border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--bg-sidebar)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-sidebar)";
      }}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-2xl">{algo.emoji}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(78,201,176,0.15)", color: "#4ec9b0" }}
        >
          {algo.qubits}q
        </span>
      </div>
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {algo.name}
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {algo.description}
      </div>
    </button>
  );
}

const mockJobs = [
  { name: "Bell State", status: "done" as const },
  { name: "GHZ 5q", status: "done" as const },
  { name: "VQE opt", status: "running" as const },
];

function RecentJobs() {
  return (
    <div className="flex-1 min-w-[200px]">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Recent Jobs
      </h3>
      <div className="space-y-2">
        {mockJobs.map((job) => (
          <div
            key={job.name}
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            <span>{job.status === "done" ? "✅" : "🔄"}</span>
            <span>{job.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClusterStatus() {
  return (
    <div className="flex-1 min-w-[200px]">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Cluster Status
      </h3>
      <div className="space-y-2 text-sm" style={{ color: "var(--text-primary)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          3 nodes online
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-secondary)" }}>CPU:</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
            <div className="h-full rounded-full" style={{ width: "45%", background: "#4ec9b0" }} />
          </div>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>45%</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-secondary)" }}>Mem:</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
            <div className="h-full rounded-full" style={{ width: "62%", background: "#dcdcaa" }} />
          </div>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>62%</span>
        </div>
      </div>
    </div>
  );
}

export function StudioHome() {
  const openTab = useIDEStore((s) => s.openTab);
  const setFileContent = useIDEStore((s) => s.setFileContent);

  const handleNewFile = () => {
    const id = `untitled-${Date.now()}`;
    openTab({ id, title: "untitled.py", language: "python" });
    setFileContent(id, "# New quantum circuit\nfrom qiskit import QuantumCircuit\n\nqc = QuantumCircuit(2, 2)\n");
  };

  return (
    <div className="h-full overflow-auto" style={{ background: "var(--bg-editor)" }}>
      <div className="max-w-[800px] mx-auto px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">⚛️</div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              background: "linear-gradient(135deg, #4ec9b0, #569cd6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            QSim Studio
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Quantum Computing IDE
          </p>
        </div>

        {/* Quick Start */}
        <div className="mb-10">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Quick Start
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {algorithms.map((algo) => (
              <AlgorithmCard key={algo.id} algo={algo} />
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex gap-8 mb-10">
          <RecentJobs />
          <ClusterStatus />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleNewFile}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "#4ec9b0", color: "#1e1e1e" }}
          >
            + New File
          </button>
          <button
            className="px-4 py-2 rounded text-sm font-medium border transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          >
            📁 Open File
          </button>
        </div>
      </div>
    </div>
  );
}
