"use client";

import { useIDEStore, type JobInfo } from "@/stores/ideStore";
import { FileContextMenu } from "./FileContextMenu";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Plus,
  FolderPlus,
  Play,
  Circle,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { normalizePhase, createClient, type JobPhase } from "@/lib/api";
import { getChildren, type FSNode } from "@/lib/filesystem";
import { StatusBadge } from "./StatusBadge";
import { JobStepper } from "./JobStepper";
import { useState, useEffect, useCallback, useRef } from "react";

/* ───────── File icon helper ───────── */

function FileIcon({ name }: { name: string }) {
  if (name.endsWith(".qasm")) return <FileCode size={14} className="text-[#e37933] flex-shrink-0" />;
  if (name.endsWith(".py")) return <FileCode size={14} className="text-[#519aba] flex-shrink-0" />;
  if (name.endsWith(".json")) return <FileText size={14} className="text-[#cbcb41] flex-shrink-0" />;
  if (name.endsWith(".md")) return <FileText size={14} className="text-[#519aba] flex-shrink-0" />;
  if (name.endsWith(".txt")) return <FileText size={14} className="text-[#a0a0a0] flex-shrink-0" />;
  return <FileText size={14} className="text-[#a0a0a0] flex-shrink-0" />;
}

/* ───────── Inline name input ───────── */

function InlineInput({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  onSubmit: (val: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const submit = () => {
    const v = value.trim();
    if (v) onSubmit(v);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      className="w-full px-1.5 py-0.5 text-xs rounded"
      style={{
        background: "var(--bg-editor)",
        border: "1px solid var(--accent)",
        color: "var(--text-primary)",
        outline: "none",
      }}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={submit}
    />
  );
}

/* ───────── Tree node component ───────── */

function TreeNode({
  node,
  allFiles,
  depth,
  renamingId,
  setRenamingId,
  onContextMenu,
}: {
  node: FSNode;
  allFiles: FSNode[];
  depth: number;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  onContextMenu: (e: React.MouseEvent, node: FSNode) => void;
}) {
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const dirtyFiles = useIDEStore((s) => s.dirtyFiles);
  const expandedFolders = useIDEStore((s) => s.expandedFolders);
  const toggleFolder = useIDEStore((s) => s.toggleFolder);
  const openFileInEditor = useIDEStore((s) => s.openFileInEditor);
  const renameFile = useIDEStore((s) => s.renameFile);

  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.id);
  const isActive = node.id === activeTabId;
  const isDirty = dirtyFiles.has(node.id);
  const children = isFolder ? getChildren(allFiles, node.id) : [];
  const paddingLeft = 8 + depth * 16;

  // Renaming
  if (renamingId === node.id) {
    return (
      <div style={{ paddingLeft }} className="py-0.5 pr-2">
        <InlineInput
          defaultValue={node.name}
          onSubmit={(val) => { renameFile(node.id, val); setRenamingId(null); }}
          onCancel={() => setRenamingId(null)}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="flex items-center gap-1 py-0.5 pr-2 cursor-pointer hover:bg-white/5"
        style={{
          paddingLeft,
          background: isActive ? "rgba(255,255,255,0.08)" : undefined,
        }}
        onClick={() => {
          if (isFolder) toggleFolder(node.id);
          else openFileInEditor(node);
        }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {isFolder ? (
          <>
            {isExpanded ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />}
            {isExpanded
              ? <FolderOpen size={14} className="text-[#dcb67a] flex-shrink-0" />
              : <Folder size={14} className="text-[#dcb67a] flex-shrink-0" />
            }
          </>
        ) : (
          <>
            <span className="w-[14px] flex-shrink-0" /> {/* indent spacer for files */}
            <FileIcon name={node.name} />
          </>
        )}
        <span
          className="flex-1 truncate text-[13px]"
          style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {node.name}
        </span>
        {isDirty && (
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: "var(--accent)" }} />
        )}
      </div>

      {/* Render children if folder is expanded */}
      {isFolder && isExpanded && children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          allFiles={allFiles}
          depth={depth + 1}
          renamingId={renamingId}
          setRenamingId={setRenamingId}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
}

/* ───────── FilesPanel ───────── */

function FilesPanel() {
  const files = useIDEStore((s) => s.files);
  const createFile = useIDEStore((s) => s.createFile);
  const createFolder = useIDEStore((s) => s.createFolder);
  const deleteFile = useIDEStore((s) => s.deleteFile);
  const duplicateFile = useIDEStore((s) => s.duplicateFile);

  const [projectExpanded, setProjectExpanded] = useState(true);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FSNode } | null>(null);

  const handleCreate = (name: string) => {
    if (creating === "folder") {
      createFolder(name, creatingParentId);
    } else {
      createFile(name, undefined, creatingParentId);
    }
    setCreating(null);
    setCreatingParentId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, node: FSNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const rootNodes = getChildren(files, null);

  return (
    <div className="text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Files
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className="p-0.5 rounded hover:bg-white/10"
            title="New File"
            onClick={() => { setCreating("file"); setCreatingParentId(null); }}
          >
            <Plus size={14} style={{ color: "var(--text-secondary)" }} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-white/10"
            title="New Folder"
            onClick={() => { setCreating("folder"); setCreatingParentId(null); }}
          >
            <FolderPlus size={14} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Project root */}
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/5"
        onClick={() => setProjectExpanded(!projectExpanded)}
      >
        {projectExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {projectExpanded
          ? <FolderOpen size={16} className="text-[#dcb67a]" />
          : <Folder size={16} className="text-[#dcb67a]" />
        }
        <span>project</span>
      </div>

      {projectExpanded && (
        <div>
          {/* Creating new item at root */}
          {creating && creatingParentId === null && (
            <div style={{ paddingLeft: 24 }} className="py-0.5 pr-2">
              <InlineInput
                defaultValue={creating === "folder" ? "new-folder" : "untitled.py"}
                onSubmit={handleCreate}
                onCancel={() => setCreating(null)}
              />
            </div>
          )}

          {/* Tree nodes */}
          {rootNodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              allFiles={files}
              depth={1}
              renamingId={renamingId}
              setRenamingId={setRenamingId}
              onContextMenu={handleContextMenu}
            />
          ))}

          {rootNodes.length === 0 && !creating && (
            <div className="px-6 py-3 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
              <p className="mb-2">No files yet</p>
              <button
                className="text-[11px] px-2 py-1 rounded hover:bg-white/10"
                style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
                onClick={() => { setCreating("file"); setCreatingParentId(null); }}
              >
                + Create a file
              </button>
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isFolder={contextMenu.node.type === "folder"}
          onRename={() => {
            setRenamingId(contextMenu.node.id);
          }}
          onDelete={() => {
            deleteFile(contextMenu.node.id);
          }}
          onDuplicate={contextMenu.node.type === "file" ? () => {
            duplicateFile(contextMenu.node.id);
          } : undefined}
          onNewFile={contextMenu.node.type === "folder" ? () => {
            setCreating("file");
            setCreatingParentId(contextMenu.node.id);
          } : undefined}
          onNewFolder={contextMenu.node.type === "folder" ? () => {
            setCreating("folder");
            setCreatingParentId(contextMenu.node.id);
          } : undefined}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

/* ───────── AlgorithmsPanel ───────── */

function AlgorithmsPanel() {
  const openAlgorithm = useIDEStore((s) => s.openAlgorithm);

  const algorithms = [
    { id: "bell-state", name: "Bell State", desc: "2-qubit entanglement", icon: "🔔" },
    { id: "ghz-state", name: "GHZ State", desc: "Multi-qubit entanglement", icon: "👻" },
    { id: "qft", name: "QFT", desc: "Quantum Fourier Transform", icon: "📊" },
    { id: "grover", name: "Grover", desc: "Quantum search", icon: "🔍" },
    { id: "vqe", name: "VQE", desc: "Variational Quantum Eigensolver", icon: "⚡" },
    { id: "qaoa", name: "QAOA", desc: "Quantum optimization", icon: "🌀" },
    { id: "teleportation", name: "Teleportation", desc: "Quantum state transfer", icon: "🚀" },
    { id: "deutsch-jozsa", name: "Deutsch-Jozsa", desc: "Oracle problem", icon: "🎯" },
    { id: "bernstein-vazirani", name: "Bernstein-Vazirani", desc: "Hidden string", icon: "🔑" },
    { id: "simon", name: "Simon", desc: "Period finding", icon: "🔄" },
    { id: "shor", name: "Shor", desc: "Integer factoring", icon: "🔢" },
    { id: "qpe", name: "QPE", desc: "Phase estimation", icon: "📐" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {algorithms.map((a) => (
        <div
          key={a.name}
          className="p-2 rounded cursor-pointer hover:bg-white/10 transition-colors"
          style={{ background: "var(--bg-editor)", border: "1px solid var(--border)" }}
          onClick={() => openAlgorithm(a.id)}
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

/* ───────── JobsPanel ───────── */

const mockJobs: JobInfo[] = [
  { id: "job-001", name: "Bell State Sim", status: "running", phase: "running", createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: "job-002", name: "Grover 8-qubit", status: "succeeded", phase: "succeeded", createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: "job-003", name: "VQE H2 molecule", status: "succeeded", phase: "succeeded", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "job-004", name: "QAOA MaxCut", status: "failed", phase: "failed", createdAt: new Date(Date.now() - 7200000).toISOString(), error: "OutOfMemoryError: Circuit requires 4.2GB but node has 2GB available" },
  { id: "job-005", name: "QFT 16-qubit", status: "pending", phase: "pending", createdAt: new Date().toISOString() },
  { id: "job-006", name: "QPE 4-qubit", status: "pending", phase: "pending", createdAt: new Date(Date.now() - 30000).toISOString() },
  { id: "job-007", name: "Shor Factoring", status: "analyzing", phase: "analyzing", createdAt: new Date(Date.now() - 15000).toISOString() },
];

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/** Pending/queued job의 대기 순서를 계산 (생성시간 순) */
function computeQueuePositions(jobs: JobInfo[]): Map<string, number> {
  const pendingJobs = jobs
    .filter((j) => {
      const phase = j.phase || normalizePhase(j.status);
      return phase === "pending";
    })
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });

  const map = new Map<string, number>();
  pendingJobs.forEach((j, i) => map.set(j.id, i + 1));
  return map;
}

function JobsPanel() {
  const jobs = useIDEStore((s) => s.jobs);
  const setJobs = useIDEStore((s) => s.setJobs);
  const jobsError = useIDEStore((s) => s.jobsError);
  const setJobsError = useIDEStore((s) => s.setJobsError);
  const apiUrl = useIDEStore((s) => s.apiUrl);
  const apiToken = useIDEStore((s) => s.apiToken);
  const setJobResult = useIDEStore((s) => s.setJobResult);
  const setActiveResultTab = useIDEStore((s) => s.setActiveResultTab);
  const setRunning = useIDEStore((s) => s.setRunning);
  const setCurrentJobId = useIDEStore((s) => s.setCurrentJobId);
  const appendLog = useIDEStore((s) => s.appendLog);
  const shots = useIDEStore((s) => s.shots);
  const lastSubmittedCode = useIDEStore((s) => s.lastSubmittedCode);
  const lastSubmittedLanguage = useIDEStore((s) => s.lastSubmittedLanguage);

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!apiUrl || !apiToken) {
      setJobs(mockJobs);
      setJobsError("No API configured — showing mock data");
      return;
    }
    try {
      const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/v1/jobs`, {
        headers: { Authorization: `Bearer ${apiToken}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: JobInfo[] = (Array.isArray(data) ? data : data.jobs || []).map((j: Record<string, unknown>) => ({
        id: j.id || j.job_id,
        name: j.name || j.id || "Untitled",
        status: j.status || "queued",
        phase: j.phase ? (j.phase as JobPhase) : undefined,
        createdAt: j.created_at || j.createdAt,
        error: j.error || j.error_message,
      }));
      setJobs(list);
      setJobsError(null);
    } catch {
      if (jobs.length === 0) setJobs(mockJobs);
      setJobsError("No API connection");
    }
  }, [apiUrl, apiToken, setJobs, setJobsError, jobs.length]);

  useEffect(() => {
    fetchJobs();
    const iv = setInterval(fetchJobs, 10000);
    return () => clearInterval(iv);
  }, [fetchJobs]);

  const handleClickJob = async (job: JobInfo) => {
    // 토글 확장
    setExpandedJobId((prev) => (prev === job.id ? null : job.id));

    const phase = job.phase || normalizePhase(job.status);
    if (phase !== "succeeded") return;
    if (!apiUrl || !apiToken) return;
    try {
      const client = createClient(apiUrl, apiToken);
      const raw = await client.getJobResult(job.id);
      const { extractResult } = await import("@/lib/api");
      setJobResult(extractResult(raw));
      setActiveResultTab("histogram");
    } catch {
      // ignore
    }
  };

  // 재시도: 같은 코드/설정으로 새 job 제출
  const handleRetry = async (job: JobInfo) => {
    if (!apiUrl || !apiToken || !lastSubmittedCode) {
      appendLog("[Retry] No API config or no previous code to retry");
      return;
    }
    setRetrying(job.id);
    try {
      const client = createClient(apiUrl, apiToken);
      const result = await client.submitJob({
        code: lastSubmittedCode,
        language: (lastSubmittedLanguage as "python" | "qasm") || "python",
        shots,
      });
      setCurrentJobId(result.id);
      setRunning(true);
      appendLog(`[Retry] New job submitted: ${result.id}`);
      fetchJobs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog(`[Retry] Failed: ${msg}`);
    } finally {
      setRetrying(null);
    }
  };

  const displayJobs = jobs.length > 0 ? jobs : mockJobs;
  const queuePositions = computeQueuePositions(displayJobs);

  return (
    <div className="text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1">
        {jobsError && (
          <span className="text-[10px]" style={{ color: "#dcdcaa" }}>
            {jobsError}
          </span>
        )}
        <button className="p-0.5 rounded hover:bg-white/10 ml-auto" onClick={fetchJobs} title="Refresh">
          <RefreshCw size={12} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {displayJobs.map((j) => {
        const phase = (j.phase || normalizePhase(j.status)) as JobPhase;
        const isExpanded = expandedJobId === j.id;
        const queuePos = queuePositions.get(j.id);

        return (
          <div key={j.id}>
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5"
              style={{ background: isExpanded ? "rgba(255,255,255,0.03)" : undefined }}
              onClick={() => handleClickJob(j)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate" style={{ color: "var(--text-primary)" }}>{j.name}</span>
                  {/* Queue Position Indicator */}
                  {queuePos !== undefined && (
                    <span
                      className="inline-flex items-center text-[10px] px-1.5 py-0 rounded font-mono flex-shrink-0"
                      style={{ background: "#88888830", color: "#cccccc", border: "1px solid #88888840" }}
                    >
                      Queue: #{queuePos}
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {j.id} · {timeAgo(j.createdAt)}
                </div>
              </div>
              <StatusBadge phase={phase} />
            </div>

            {/* 확장 뷰: 단계별 타임라인 + 에러 상세 + 재시도 */}
            {isExpanded && (
              <div
                className="px-3 pb-2"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                {/* Stepper 타임라인 */}
                <JobStepper phase={phase} />

                {/* Failed: 에러 상세 + 재시도 버튼 */}
                {phase === "failed" && (
                  <div className="mt-1 space-y-2">
                    <div
                      className="flex items-start gap-2 px-2 py-1.5 rounded text-xs"
                      style={{ background: "#f4474715", border: "1px solid #f4474730" }}
                    >
                      <AlertTriangle size={12} className="text-[#f44747] flex-shrink-0 mt-0.5" />
                      <span style={{ color: "#f44747" }}>
                        {j.error || "Unknown error — no details available"}
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium hover:brightness-110 transition-all disabled:opacity-50"
                      style={{ background: "#007acc", color: "#ffffff" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetry(j);
                      }}
                      disabled={retrying === j.id}
                    >
                      <RotateCcw size={11} className={retrying === j.id ? "animate-spin" : ""} />
                      {retrying === j.id ? "Retrying..." : "Retry"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── NodesPanel ───────── */

interface NodeDisplay {
  name: string;
  status: string;
  qubits: number;
  load: string;
}

const mockNodes: NodeDisplay[] = [
  { name: "qsim-node-01", status: "online", qubits: 32, load: "45%" },
  { name: "qsim-node-02", status: "online", qubits: 16, load: "78%" },
  { name: "qsim-node-03", status: "online", qubits: 64, load: "12%" },
  { name: "qsim-node-04", status: "offline", qubits: 32, load: "—" },
];

function NodesPanel() {
  const apiUrl = useIDEStore((s) => s.apiUrl);
  const apiToken = useIDEStore((s) => s.apiToken);
  const [nodes, setNodes] = useState<NodeDisplay[]>(mockNodes);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    if (!apiUrl || !apiToken) {
      setNodes(mockNodes);
      setError("No API configured — showing mock data");
      return;
    }
    try {
      const client = createClient(apiUrl, apiToken);
      const data = await client.getNodes();
      const list = Array.isArray(data) ? data : (data as { nodes: Array<{ name?: string; id?: string; status?: string; qubits?: number; load?: number }> }).nodes || [];
      setNodes(list.map((n: { name?: string; id?: string; status?: string; qubits?: number; load?: number }) => ({
        name: n.name || n.id || "unknown",
        status: n.status || "unknown",
        qubits: n.qubits || 0,
        load: n.load !== undefined ? `${Math.round(n.load * 100)}%` : "—",
      })));
      setError(null);
    } catch {
      setNodes(mockNodes);
      setError("No API connection — showing mock data");
    }
  }, [apiUrl, apiToken]);

  useEffect(() => {
    fetchNodes();
    const iv = setInterval(fetchNodes, 15000);
    return () => clearInterval(iv);
  }, [fetchNodes]);

  return (
    <div className="text-sm">
      {error && (
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[10px]" style={{ color: "#dcdcaa" }}>{error}</span>
          <button className="p-0.5 rounded hover:bg-white/10" onClick={fetchNodes} title="Refresh">
            <RefreshCw size={12} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      )}
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
      {nodes.length === 0 && (
        <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
          No nodes available
        </div>
      )}
    </div>
  );
}

/* ───────── SettingsPanel ───────── */

function SettingsPanel() {
  const setSettingsOpen = useIDEStore((s) => s.setSettingsOpen);
  const isConnected = useIDEStore((s) => s.isConnected);
  const apiUrl = useIDEStore((s) => s.apiUrl);
  const editorSettings = useIDEStore((s) => s.editorSettings);

  // Auto-open modal when settings panel is selected
  useEffect(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);

  return (
    <div className="text-sm p-3 space-y-4">
      <button
        onClick={() => setSettingsOpen(true)}
        className="w-full px-3 py-2 rounded text-xs font-medium text-left"
        style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        ⚙️ Open Settings…
        <span className="float-right text-[10px]" style={{ color: "var(--text-secondary)" }}>⌘ ,</span>
      </button>

      <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: isConnected ? "#4ec9b0" : "#f44747" }} />
          {isConnected ? "Connected" : "Not connected"}
        </div>
        <div>API: {apiUrl}</div>
        <div>Font: {editorSettings.fontSize}px · Tab: {editorSettings.tabSize}</div>
      </div>
    </div>
  );
}

/* ───────── Sidebar ───────── */

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
