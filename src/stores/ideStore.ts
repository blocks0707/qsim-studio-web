import { create } from "zustand";
import { getAlgorithm } from "@/lib/algorithms";

export type SidebarSection = "files" | "algorithms" | "jobs" | "nodes" | "settings";
export type ResultTab = "histogram" | "probability" | "statistics" | "console";

export interface Tab {
  id: string;
  title: string;
  language: string;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

interface EditorInstance {
  executeEdits: (source: string, edits: Array<{
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    text: string;
    forceMoveMarkers?: boolean;
  }>) => void;
}

export interface JobResultData {
  counts: Record<string, number>;
  metadata?: {
    executionTime?: number;
    circuitDepth?: number;
    gateCount?: number;
    backend?: string;
    shots?: number;
  };
}

interface IDEState {
  activeSidebarSection: SidebarSection | null;
  sidebarOpen: boolean;
  openTabs: Tab[];
  activeTabId: string | null;
  fileContents: Record<string, string>;
  cursorPosition: CursorPosition;
  editorRef: EditorInstance | null;

  // API config
  apiUrl: string;
  apiToken: string;
  setApiConfig: (url: string, token: string) => void;

  // Connection
  isConnected: boolean;
  setConnected: (v: boolean) => void;

  // Simulation state
  isRunning: boolean;
  setRunning: (v: boolean) => void;
  currentJobId: string | null;
  setCurrentJobId: (id: string | null) => void;
  jobResult: JobResultData | null;
  setJobResult: (r: JobResultData | null) => void;
  consoleLogs: string[];
  appendLog: (msg: string) => void;
  clearLogs: () => void;
  shots: number;
  setShots: (s: number) => void;
  activeResultTab: ResultTab;
  setActiveResultTab: (t: ResultTab) => void;

  toggleSidebar: (section: SidebarSection) => void;
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setFileContent: (tabId: string, content: string) => void;
  setCursorPosition: (pos: CursorPosition) => void;
  setEditorRef: (ref: EditorInstance | null) => void;
  openAlgorithm: (algorithmId: string) => void;
}

const defaultContents: Record<string, string> = {
  "bell-state": `import qiskit
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Create Bell State circuit
qc = QuantumCircuit(2, 2)
qc.h(0)          # Hadamard on qubit 0
qc.cx(0, 1)      # CNOT: qubit 0 → qubit 1
qc.measure([0, 1], [0, 1])

# Simulate
simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()

counts = result.get_counts(qc)
print("Bell State results:", counts)
# Expected: ~50% |00⟩, ~50% |11⟩`,

  grover: `import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def grover_oracle(n_qubits: int, target: int) -> QuantumCircuit:
    """Create Grover oracle for target state."""
    qc = QuantumCircuit(n_qubits)
    # Mark target state
    target_bin = format(target, f'0{n_qubits}b')
    for i, bit in enumerate(reversed(target_bin)):
        if bit == '0':
            qc.x(i)
    qc.h(n_qubits - 1)
    qc.mcx(list(range(n_qubits - 1)), n_qubits - 1)
    qc.h(n_qubits - 1)
    for i, bit in enumerate(reversed(target_bin)):
        if bit == '0':
            qc.x(i)
    return qc

# Grover search for |101⟩ (target = 5)
n = 3
grover = QuantumCircuit(n, n)
grover.h(range(n))  # Superposition`,

  qft: `from qiskit import QuantumCircuit
import numpy as np

def qft_circuit(n: int) -> QuantumCircuit:
    """Create Quantum Fourier Transform circuit."""
    qc = QuantumCircuit(n, name="QFT")
    
    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            angle = np.pi / (2 ** (j - i))
            qc.cp(angle, j, i)
    
    # Swap qubits
    for i in range(n // 2):
        qc.swap(i, n - i - 1)
    
    return qc

# Create 4-qubit QFT
qft = qft_circuit(4)
print(qft.draw())`,
};

const defaultTabs: Tab[] = [
  { id: "bell-state", title: "bell_state.py", language: "Python" },
  { id: "grover", title: "grover.py", language: "Python" },
  { id: "qft", title: "qft.py", language: "Python" },
];

export function getLanguageFromFilename(filename: string): string {
  if (filename.endsWith(".qasm")) return "qasm";
  if (filename.endsWith(".py")) return "python";
  if (filename.endsWith(".json")) return "json";
  return "plaintext";
}

export function getLanguageDisplayName(lang: string): string {
  const map: Record<string, string> = { python: "Python", qasm: "OpenQASM", json: "JSON", plaintext: "Plain Text" };
  return map[lang] || lang;
}

export const useIDEStore = create<IDEState>((set) => ({
  activeSidebarSection: "files",
  sidebarOpen: true,
  openTabs: defaultTabs,
  activeTabId: "bell-state",
  fileContents: { ...defaultContents },
  cursorPosition: { lineNumber: 1, column: 1 },
  editorRef: null,

  // API config
  apiUrl: "http://localhost:8080",
  apiToken: "",
  setApiConfig: (url, token) => set({ apiUrl: url, apiToken: token }),

  // Connection
  isConnected: false,
  setConnected: (v) => set({ isConnected: v }),

  // Simulation
  isRunning: false,
  setRunning: (v) => set({ isRunning: v }),
  currentJobId: null,
  setCurrentJobId: (id) => set({ currentJobId: id }),
  jobResult: null,
  setJobResult: (r) => set({ jobResult: r }),
  consoleLogs: [],
  appendLog: (msg) => set((s) => ({ consoleLogs: [...s.consoleLogs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  clearLogs: () => set({ consoleLogs: [] }),
  shots: 1024,
  setShots: (s) => set({ shots: s }),
  activeResultTab: "histogram",
  setActiveResultTab: (t) => set({ activeResultTab: t }),

  toggleSidebar: (section) =>
    set((state) => {
      if (state.activeSidebarSection === section && state.sidebarOpen) {
        return { sidebarOpen: false };
      }
      return { activeSidebarSection: section, sidebarOpen: true };
    }),

  openTab: (tab) =>
    set((state) => {
      const exists = state.openTabs.find((t) => t.id === tab.id);
      if (exists) return { activeTabId: tab.id };
      return { openTabs: [...state.openTabs, tab], activeTabId: tab.id };
    }),

  closeTab: (tabId) =>
    set((state) => {
      const tabs = state.openTabs.filter((t) => t.id !== tabId);
      const activeTabId =
        state.activeTabId === tabId
          ? tabs.length > 0
            ? tabs[tabs.length - 1].id
            : null
          : state.activeTabId;
      return { openTabs: tabs, activeTabId };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  setFileContent: (tabId, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [tabId]: content },
    })),

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  setEditorRef: (ref) => set({ editorRef: ref }),

  openAlgorithm: (algorithmId) =>
    set((state) => {
      const algo = getAlgorithm(algorithmId);
      if (!algo) return state;
      const tabId = `algo-${algo.id}`;
      const exists = state.openTabs.find((t) => t.id === tabId);
      if (exists) return { activeTabId: tabId };
      const tab: Tab = {
        id: tabId,
        title: `${algo.id.replace(/-/g, "_")}.py`,
        language: "python",
      };
      return {
        openTabs: [...state.openTabs, tab],
        activeTabId: tabId,
        fileContents: { ...state.fileContents, [tabId]: algo.code },
      };
    }),
}));
