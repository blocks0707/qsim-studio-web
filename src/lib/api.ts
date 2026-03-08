// QSim Cluster API Client

export type JobPhase =
  | "pending"
  | "analyzing"
  | "scheduling"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface QSimError {
  status: number;
  message: string;
}

export interface JobSubmission {
  code: string;
  language: "python" | "qasm";
  shots: number;
}

export interface JobStatus {
  id: string;
  status: string;
  phase?: JobPhase;
  createdAt?: string;
  updatedAt?: string;
  error?: string;
  assignedNode?: string;
  assignedPool?: string;
  qubits?: number;
  estimatedTimeSec?: number;
  startTime?: string;
  completionTime?: string;
  executionTime?: number;
}

export interface JobResult {
  counts: Record<string, number>;
  metadata?: {
    executionTime?: number;
    circuitDepth?: number;
    gateCount?: number;
    backend?: string;
    shots?: number;
    complexityClass?: string;
  };
}

export interface ClusterNode {
  id: string;
  name: string;
  status: string;
  qubits: number;
  load?: number;
}

/** Map raw status string to canonical JobPhase */
export function normalizePhase(status: string): JobPhase {
  const map: Record<string, JobPhase> = {
    queued: "pending",
    pending: "pending",
    analyzing: "analyzing",
    scheduling: "scheduling",
    running: "running",
    completed: "succeeded",
    succeeded: "succeeded",
    failed: "failed",
    cancelled: "cancelled",
    canceled: "cancelled",
  };
  return map[status.toLowerCase()] || "pending";
}

function snakeToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        snakeToCamel(v),
      ])
    );
  }
  return obj;
}

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw { status: res.status, message: body || res.statusText } as QSimError;
  }
  const json = await res.json();
  return snakeToCamel(json) as T;
}

export function createClient(baseUrl: string, token: string) {
  const url = baseUrl.replace(/\/+$/, "");
  return {
    submitJob: (job: JobSubmission) =>
      apiFetch<{ id: string }>(url, "/api/v1/jobs", token, {
        method: "POST",
        body: JSON.stringify(job),
      }),
    getJobStatus: (id: string) =>
      apiFetch<JobStatus>(url, `/api/v1/jobs/${id}`, token),
    getJobResult: (id: string) =>
      apiFetch<JobResult | { result: JobResult }>(url, `/api/v1/jobs/${id}/result`, token),
    getJobLogs: (id: string) =>
      apiFetch<{ logs: string[] }>(url, `/api/v1/jobs/${id}/logs`, token),
    cancelJob: (id: string) =>
      apiFetch<void>(url, `/api/v1/jobs/${id}`, token, { method: "DELETE" }),
    getNodes: () =>
      apiFetch<{ nodes: ClusterNode[] } | ClusterNode[]>(url, "/api/v1/cluster/nodes", token),
    checkHealth: async (): Promise<boolean> => {
      try {
        const res = await fetch(`${url}/api/v1/cluster/nodes`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

export function extractResult(data: unknown): JobResult {
  const d = data as Record<string, unknown>;
  if (d.result && typeof d.result === "object") {
    const r = d.result as Record<string, unknown>;
    return {
      counts: (r.counts as Record<string, number>) || {},
      metadata: r.metadata as JobResult["metadata"],
    };
  }
  return {
    counts: (d.counts as Record<string, number>) || {},
    metadata: d.metadata as JobResult["metadata"],
  };
}
