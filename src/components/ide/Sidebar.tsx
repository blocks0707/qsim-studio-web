"use client";

import { useIDEStore } from "@/stores/ideStore";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Atom,
  Play,
  Circle,
  Monitor,
  Wifi,
  WifiOff,
  Settings,
  ToggleLeft,
} from "lucide-react";
import { useState } from "react";

function FilesPanel() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    src: true,
    algorithms: true,
  });

  const toggle = (name: string) =>
    setExpanded((p) => ({ ...p, [name]: !p[name] }));

  return (
    <div className="text-sm">
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/5"
        onClick={() => toggle("src")}
      >
        {expanded.src ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Folder size={16} className="text-[#dcb67a]" />
        <span>src</span>
      </div>
      {expanded.src && (
        <div className="ml-4">
          <div
            className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/5"
            onClick={() => toggle("algorithms")}
          >
            {expanded.algorithms ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Folder size={16} className="text-[#dcb67a]" />
            <span>algorithms</span>
          </div>
          {expanded.algorithms && (
            <div className="ml-4">
              {["bell_state.py", "grover.py", "qft.py", "vqe.py", "qaoa.py", "teleport.py"].map(
                (f) => (
                  <div
                    key={f}
                    className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-white/5"
                  >
                    <FileText size={14} className="text-[#519aba]" />
                    <span style={{ color: "var(--text-primary)" }}>{f}</span>
                  </div>
                )
              )}
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-white/5">
            <FileText size={14} className="text-[#519aba]" />
            <span>main.py</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-white/5">
            <FileText size={14} className="text-[#e37933]" />
            <span>config.json</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-white/5">
        <FileText size={14} className="text-[#cbcb41]" />
        <span>README.md</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-white/5">
        <FileText size={14} className="text-[#a074c4]" />
        <span>requirements.txt</span>
      </div>
    </div>
  );
}

function AlgorithmsPanel() {
  const algorithms = [
    { name: "Bell State", desc: "2-qubit entanglement", icon: "🔔" },
    { name: "GHZ State", desc: "Multi-qubit entanglement", icon: "👻" },
    { name: "QFT", desc: "Quantum Fourier Transform", icon: "📊" },
    { name: "Grover", desc: "Quantum search", icon: "🔍" },
    { name: "VQE", desc: "Variational Quantum Eigensolver", icon: "⚡" },
    { name: "QAOA", desc: "Quantum optimization", icon: "🌀" },
    { name: "Teleportation", desc: "Quantum state transfer", icon: "🚀" },
    { name: "Deutsch-Jozsa", desc: "Oracle problem", icon: "🎯" },
    { name: "Bernstein-Vazirani", desc: "Hidden string", icon: "🔑" },
    { name: "Simon", desc: "Period finding", icon: "🔄" },
    { name: "Shor", desc: "Integer factoring", icon: "🔢" },
    { name: "QPE", desc: "Phase estimation", icon: "📐" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {algorithms.map((a) => (
        <div
          key={a.name}
          className="p-2 rounded cursor-pointer hover:bg-white/10 transition-colors"
          style={{ background: "var(--bg-editor)", border: "1px solid var(--border)" }}
        >
          <div className="text-lg mb-1">{a.icon}</div>
          <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {a.name}
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {a.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

function JobsPanel() {
  const jobs = [
    { id: "job-001", name: "Bell State Sim", status: "running", time: "2m ago" },
    { id: "job-002", name: "Grover 8-qubit", status: "completed", time: "15m ago" },
    { id: "job-003", name: "VQE H2 molecule", status: "completed", time: "1h ago" },
    { id: "job-004", name: "QAOA MaxCut", status: "failed", time: "2h ago" },
    { id: "job-005", name: "QFT 16-qubit", status: "queued", time: "just now" },
  ];

  const statusColor: Record<string, string> = {
    running: "#4ec9b0",
    completed: "#6a9955",
    failed: "#f44747",
    queued: "#dcdcaa",
  };

  return (
    <div className="text-sm">
      {jobs.map((j) => (
        <div
          key={j.id}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5"
        >
          {j.status === "running" ? (
            <Play size={14} style={{ color: statusColor[j.status] }} />
          ) : (
            <Circle size={8} fill={statusColor[j.status]} style={{ color: statusColor[j.status] }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ color: "var(--text-primary)" }}>{j.name}</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {j.id} · {j.time}
            </div>
          </div>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              color: statusColor[j.status],
              background: `${statusColor[j.status]}20`,
            }}
          >
            {j.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function NodesPanel() {
  const nodes = [
    { name: "qsim-node-01", status: "online", qubits: 32, load: "45%" },
    { name: "qsim-node-02", status: "online", qubits: 16, load: "78%" },
    { name: "qsim-node-03", status: "online", qubits: 64, load: "12%" },
    { name: "qsim-node-04", status: "offline", qubits: 32, load: "—" },
  ];

  return (
    <div className="text-sm">
      {nodes.map((n) => (
        <div
          key={n.name}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5"
        >
          {n.status === "online" ? (
            <Wifi size={14} className="text-[#4ec9b0]" />
          ) : (
            <WifiOff size={14} className="text-[#f44747]" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span className="truncate">{n.name}</span>
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {n.qubits} qubits · Load: {n.load}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="text-sm p-3 space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Theme
        </label>
        <select
          className="w-full mt-1 px-2 py-1 rounded text-sm"
          style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          defaultValue="dark"
        >
          <option value="dark">Dark (VS Code)</option>
          <option value="light">Light</option>
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Font Size
        </label>
        <input
          type="number"
          defaultValue={14}
          className="w-full mt-1 px-2 py-1 rounded text-sm"
          style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Cluster URL
        </label>
        <input
          type="text"
          defaultValue="http://localhost:8080"
          className="w-full mt-1 px-2 py-1 rounded text-sm"
          style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Auto-save</span>
        <ToggleLeft size={20} className="text-[var(--accent)] cursor-pointer" />
      </div>
      <div className="flex items-center justify-between">
        <span>Line Numbers</span>
        <ToggleLeft size={20} className="text-[var(--accent)] cursor-pointer" />
      </div>
    </div>
  );
}

const panels: Record<string, { title: string; component: React.FC }> = {
  files: { title: "EXPLORER", component: FilesPanel },
  algorithms: { title: "ALGORITHMS", component: AlgorithmsPanel },
  jobs: { title: "JOBS", component: JobsPanel },
  nodes: { title: "NODES", component: NodesPanel },
  settings: { title: "SETTINGS", component: SettingsPanel },
};

export function Sidebar() {
  const activeSidebarSection = useIDEStore((s) => s.activeSidebarSection);
  const panel = activeSidebarSection ? panels[activeSidebarSection] : null;

  if (!panel) return null;

  const PanelComponent = panel.component;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div
        className="h-9 flex items-center px-4 text-[11px] font-semibold tracking-wider flex-shrink-0 uppercase"
        style={{ color: "var(--text-secondary)" }}
      >
        {panel.title}
      </div>
      <div className="flex-1 overflow-y-auto">
        <PanelComponent />
      </div>
    </div>
  );
}
