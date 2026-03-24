import { create } from "zustand";
import { getAlgorithm } from "@/lib/algorithms";
import type { JobPhase } from "@/lib/api";
import {
  loadFileTree,
  saveFileTree,
  loadFileContent,
  saveFileContent,
  deleteFileContent,
  ensureDefaultFiles,
  createFolder as fsCreateFolder,
  createFile as fsCreateFile,
  renameNode,
  deleteNode,
  moveNode,
  duplicateFile as fsDuplicateFile,
  getChildren,
  getDescendants,
  type FSFile,
  type FSNode,
} from "@/lib/filesystem";

export type SidebarSection = "files" | "algorithms" | "jobs" | "nodes" | "settings";
export type ResultTab = "histogram" | "probability" | "qsphere" | "statecity" | "statistics" | "console";

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
  statevector?: [number, number][];
  metadata?: {
    executionTime?: number;
    circuitDepth?: number;
    gateCount?: number;
    backend?: string;
    shots?: number;
    complexityClass?: string;
  };
}

export interface JobInfo {
  id: string;
  name: string;
  status: string;
  phase?: JobPhase;
  createdAt?: string;
  assignedNode?: string;
  assignedPool?: string;
  qubits?: number;
  estimatedTimeSec?: number;
  startTime?: string;
  completionTime?: string;
  executionTime?: number;
  error?: string;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4;
  minimap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 13,
  tabSize: 2,
  minimap: false,
  wordWrap: true,
  lineNumbers: true,
};

function loadSettings(): { apiUrl: string; apiToken: string; editor: EditorSettings } {
  if (typeof window === "undefined") return { apiUrl: "http://localhost:8080", apiToken: "", editor: { ...DEFAULT_SETTINGS } };
  return {
    apiUrl: localStorage.getItem("qsim-settings:apiUrl") || "http://localhost:8080",
    apiToken: localStorage.getItem("qsim-settings:apiToken") || "",
    editor: {
      fontSize: Number(localStorage.getItem("qsim-settings:fontSize")) || DEFAULT_SETTINGS.fontSize,
      tabSize: (Number(localStorage.getItem("qsim-settings:tabSize")) || DEFAULT_SETTINGS.tabSize) as 2 | 4,
      minimap: localStorage.getItem("qsim-settings:minimap") === "true",
      wordWrap: localStorage.getItem("qsim-settings:wordWrap") !== "false",
      lineNumbers: localStorage.getItem("qsim-settings:lineNumbers") !== "false",
    },
  };
}

function persistSettings(apiUrl: string, apiToken: string, editor: EditorSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("qsim-settings:apiUrl", apiUrl);
  localStorage.setItem("qsim-settings:apiToken", apiToken);
  localStorage.setItem("qsim-settings:fontSize", String(editor.fontSize));
  localStorage.setItem("qsim-settings:tabSize", String(editor.tabSize));
  localStorage.setItem("qsim-settings:minimap", String(editor.minimap));
  localStorage.setItem("qsim-settings:wordWrap", String(editor.wordWrap));
  localStorage.setItem("qsim-settings:lineNumbers", String(editor.lineNumbers));
}

export interface PendingSuggestion {
  /** Original code before suggestion */
  originalCode: string;
  /** Suggested new code */
  suggestedCode: string;
  /** Target tab/file ID */
  tabId: string;
  /** Whether it's a full file replacement or partial */
  isFullReplace: boolean;
}

interface IDEState {
  // Code suggestion (Cursor-style)
  pendingSuggestion: PendingSuggestion | null;
  setPendingSuggestion: (s: PendingSuggestion | null) => void;
  acceptSuggestion: () => void;
  rejectSuggestion: () => void;

  // File system
  files: FSNode[];
  dirtyFiles: Set<string>;
  expandedFolders: Set<string>;
  fileSortMode: "name" | "type" | "modified";
  setFileSortMode: (mode: "name" | "type" | "modified") => void;
  toggleFolder: (folderId: string) => void;
  createFile: (name: string, content?: string, parentId?: string | null) => string;
  createFolder: (name: string, parentId?: string | null) => string;
  renameFile: (id: string, newName: string) => void;
  deleteFile: (id: string) => void;
  moveFile: (id: string, newParentId: string | null) => void;
  duplicateFile: (id: string) => void;
  loadFromStorage: () => void;
  saveFileToStorage: (fileId: string) => void;
  openFileInEditor: (file: FSFile) => void;

  // Jobs
  jobs: JobInfo[];
  setJobs: (jobs: JobInfo[]) => void;
  jobsError: string | null;
  setJobsError: (err: string | null) => void;
  activeSidebarSection: SidebarSection | null;
  sidebarOpen: boolean;
  openTabs: Tab[];
  activeTabId: string | null;
  fileContents: Record<string, string>;
  cursorPosition: CursorPosition;
  editorRef: EditorInstance | null;

  // Job phase tracking
  jobPhase: JobPhase | null;
  setJobPhase: (p: JobPhase | null) => void;
  jobEstimatedTimeSec: number | null;
  setJobEstimatedTimeSec: (t: number | null) => void;
  jobStartTime: string | null;
  setJobStartTime: (t: string | null) => void;
  jobAssignedNode: string | null;
  setJobAssignedNode: (n: string | null) => void;
  jobAssignedPool: string | null;
  setJobAssignedPool: (p: string | null) => void;
  jobQubits: number | null;
  setJobQubits: (q: number | null) => void;
  lastSubmittedCode: string | null;
  setLastSubmittedCode: (c: string | null) => void;
  lastSubmittedLanguage: string | null;
  setLastSubmittedLanguage: (l: string | null) => void;

  // Settings
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  editorSettings: EditorSettings;
  setEditorSettings: (s: EditorSettings) => void;
  saveSettings: () => void;
  resetSettings: () => void;

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

export const useIDEStore = create<IDEState>((set, get) => ({
  // File system
  files: [],
  dirtyFiles: new Set<string>(),
  expandedFolders: new Set<string>(),
  fileSortMode: "name",
  setFileSortMode: (mode) => set({ fileSortMode: mode }),

  toggleFolder: (folderId) => {
    set((s) => {
      const expanded = new Set(s.expandedFolders);
      if (expanded.has(folderId)) expanded.delete(folderId);
      else expanded.add(folderId);
      return { expandedFolders: expanded };
    });
  },

  createFile: (name, content, parentId) => {
    const defaultContent = content ?? "# New quantum circuit\nfrom qiskit import QuantumCircuit\n\nqc = QuantumCircuit(2, 2)\n";
    const file = fsCreateFile(name || "untitled.py", defaultContent, parentId ?? null);

    set((s) => {
      const files = loadFileTree();
      // Auto-expand parent folder
      const expanded = new Set(s.expandedFolders);
      if (parentId) expanded.add(parentId);
      return {
        files,
        expandedFolders: expanded,
        fileContents: { ...s.fileContents, [file.id]: defaultContent },
      };
    });

    get().openFileInEditor(file);
    return file.id;
  },

  createFolder: (name, parentId) => {
    const folder = fsCreateFolder(name || "new-folder", parentId ?? null);
    set((s) => {
      const files = loadFileTree();
      const expanded = new Set(s.expandedFolders);
      if (parentId) expanded.add(parentId);
      return { files, expandedFolders: expanded };
    });
    return folder.id;
  },

  renameFile: (id, newName) => {
    renameNode(id, newName);
    set((s) => {
      const files = loadFileTree();
      const node = files.find((f) => f.id === id);
      const openTabs = node?.type === "file"
        ? s.openTabs.map((t) =>
            t.id === id ? { ...t, title: node.name, language: getLanguageFromFilename(node.name) } : t
          )
        : s.openTabs;
      return { files, openTabs };
    });
  },

  deleteFile: (id) => {
    const s = get();
    const node = s.files.find((f) => f.id === id);
    // Collect all ids to remove (including descendants for folders)
    const idsToRemove = new Set<string>();
    idsToRemove.add(id);
    if (node?.type === "folder") {
      for (const d of getDescendants(s.files, id)) {
        idsToRemove.add(d.id);
      }
    }

    deleteNode(id);

    set((s) => {
      const files = loadFileTree();
      const openTabs = s.openTabs.filter((t) => !idsToRemove.has(t.id));
      const newContents = { ...s.fileContents };
      for (const rid of idsToRemove) delete newContents[rid];
      const activeTabId = idsToRemove.has(s.activeTabId || "")
        ? (openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null)
        : s.activeTabId;
      return { files, openTabs, activeTabId, fileContents: newContents };
    });
  },

  moveFile: (id, newParentId) => {
    moveNode(id, newParentId);
    set(() => {
      const files = loadFileTree();
      return { files };
    });
  },

  duplicateFile: (id) => {
    const dup = fsDuplicateFile(id);
    if (!dup) return;
    set((s) => {
      const files = loadFileTree();
      const content = loadFileContent(dup.path) || "";
      return {
        files,
        fileContents: { ...s.fileContents, [dup.id]: content },
      };
    });
    get().openFileInEditor(dup);
  },

  loadFromStorage: () => {
    const files = ensureDefaultFiles();
    const fileContents: Record<string, string> = {};
    for (const f of files) {
      const content = loadFileContent(f.path);
      if (content !== null) fileContents[f.id] = content;
    }
    const saved = loadSettings();
    set((s) => ({
      files,
      fileContents: { ...defaultContents, ...fileContents, ...s.fileContents },
      openTabs: files.length > 0 && s.openTabs.length === defaultTabs.length
        ? files.map((f) => ({ id: f.id, title: f.name, language: getLanguageFromFilename(f.name) }))
        : s.openTabs,
      activeTabId: files.length > 0 && s.activeTabId === "bell-state" ? files[0].id : s.activeTabId,
      apiUrl: saved.apiUrl,
      apiToken: saved.apiToken,
      editorSettings: saved.editor,
    }));
  },

  saveFileToStorage: (fileId) => {
    const s = get();
    const file = s.files.find((f) => f.id === fileId);
    const content = s.fileContents[fileId];
    if (file && content !== undefined) {
      saveFileContent(file.path, content);
      set((s) => {
        const dirty = new Set(s.dirtyFiles);
        dirty.delete(fileId);
        return { dirtyFiles: dirty };
      });
    }
  },

  openFileInEditor: (file) => {
    const s = get();
    const tab: Tab = {
      id: file.id,
      title: file.name,
      language: getLanguageFromFilename(file.name),
    };
    const exists = s.openTabs.find((t) => t.id === file.id);
    if (exists) {
      set({ activeTabId: file.id });
    } else {
      const content = s.fileContents[file.id] ?? loadFileContent(file.path) ?? "";
      set((s) => ({
        openTabs: [...s.openTabs, tab],
        activeTabId: file.id,
        fileContents: { ...s.fileContents, [file.id]: content },
      }));
    }
  },

  // Code suggestion
  pendingSuggestion: null,
  setPendingSuggestion: (s) => set({ pendingSuggestion: s }),
  acceptSuggestion: () => {
    const { pendingSuggestion } = get();
    if (!pendingSuggestion) return;
    // Code is already in the editor (set during apply preview) — just confirm it
    get().setFileContent(pendingSuggestion.tabId, pendingSuggestion.suggestedCode);
    set({ pendingSuggestion: null });
  },
  rejectSuggestion: () => {
    const { pendingSuggestion, editorRef } = get();
    if (!pendingSuggestion) return;
    // Restore original code — must update Monaco directly
    const editor = editorRef as unknown as {
      getModel: () => { setValue: (v: string) => void } | null;
    } | null;
    if (editor?.getModel) {
      editor.getModel()?.setValue(pendingSuggestion.originalCode);
    }
    get().setFileContent(pendingSuggestion.tabId, pendingSuggestion.originalCode);
    set({ pendingSuggestion: null });
  },

  // Jobs
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  jobsError: null,
  setJobsError: (err) => set({ jobsError: err }),

  activeSidebarSection: "files",
  sidebarOpen: true,
  openTabs: defaultTabs,
  activeTabId: "bell-state",
  fileContents: { ...defaultContents },
  cursorPosition: { lineNumber: 1, column: 1 },
  editorRef: null,

  // Job phase tracking
  jobPhase: null,
  setJobPhase: (p) => set({ jobPhase: p }),
  jobEstimatedTimeSec: null,
  setJobEstimatedTimeSec: (t) => set({ jobEstimatedTimeSec: t }),
  jobStartTime: null,
  setJobStartTime: (t) => set({ jobStartTime: t }),
  jobAssignedNode: null,
  setJobAssignedNode: (n) => set({ jobAssignedNode: n }),
  jobAssignedPool: null,
  setJobAssignedPool: (p) => set({ jobAssignedPool: p }),
  jobQubits: null,
  setJobQubits: (q) => set({ jobQubits: q }),
  lastSubmittedCode: null,
  setLastSubmittedCode: (c) => set({ lastSubmittedCode: c }),
  lastSubmittedLanguage: null,
  setLastSubmittedLanguage: (l) => set({ lastSubmittedLanguage: l }),

  // Settings
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  editorSettings: { ...DEFAULT_SETTINGS },
  setEditorSettings: (s) => set({ editorSettings: s }),
  saveSettings: () => {
    const { apiUrl, apiToken, editorSettings } = get();
    persistSettings(apiUrl, apiToken, editorSettings);
  },
  resetSettings: () => {
    const defaults = { apiUrl: "http://localhost:8080", apiToken: "", editorSettings: { ...DEFAULT_SETTINGS } };
    persistSettings(defaults.apiUrl, defaults.apiToken, defaults.editorSettings);
    set(defaults);
  },

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
  appendLog: (msg) => set((s) => ({ consoleLogs: [...s.consoleLogs, msg] })),
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
    set((state) => {
      const dirty = new Set(state.dirtyFiles);
      if (state.files.some((f) => f.id === tabId)) {
        dirty.add(tabId);
      }
      return {
        fileContents: { ...state.fileContents, [tabId]: content },
        dirtyFiles: dirty,
      };
    }),

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
