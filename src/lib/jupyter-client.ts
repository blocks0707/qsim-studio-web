/**
 * Jupyter REST API client.
 * Communicates with a running JupyterRuntime via its URL + token.
 */

export interface JupyterSession {
  url: string;     // Jupyter server URL
  token: string;   // Auth token
  kernelId?: string;
}

export interface KernelMessage {
  msgType: string;
  content: Record<string, unknown>;
}

/** Start or connect to a kernel. */
export async function startKernel(session: JupyterSession): Promise<string> {
  const res = await fetch(`${session.url}/api/kernels`, {
    method: "POST",
    headers: {
      "Authorization": `token ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "python3" }),
  });
  if (!res.ok) throw new Error(`Failed to start kernel: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/** List running kernels. */
export async function listKernels(session: JupyterSession): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${session.url}/api/kernels`, {
    headers: { "Authorization": `token ${session.token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

/** Execute code in a kernel via REST API (non-WebSocket approach). */
export async function executeCode(
  session: JupyterSession,
  kernelId: string,
  code: string,
): Promise<{ outputs: CellExecutionOutput[] }> {
  // Use the Jupyter REST execute endpoint
  const res = await fetch(`${session.url}/api/kernels/${kernelId}/execute`, {
    method: "POST",
    headers: {
      "Authorization": `token ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    return {
      outputs: [{
        output_type: "error",
        ename: "ExecutionError",
        evalue: `HTTP ${res.status}: ${text}`,
        traceback: [],
      }],
    };
  }

  const data = await res.json();
  return { outputs: data.outputs || [] };
}

/** Execute code via WebSocket (more reliable for long-running cells). */
export function executeCodeWS(
  session: JupyterSession,
  kernelId: string,
  code: string,
  onOutput: (output: CellExecutionOutput) => void,
  onDone: () => void,
): () => void {
  const wsUrl = session.url.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsUrl}/api/kernels/${kernelId}/channels?token=${session.token}`);

  const msgId = `exec-${Date.now()}`;

  ws.onopen = () => {
    ws.send(JSON.stringify({
      header: {
        msg_id: msgId,
        msg_type: "execute_request",
        username: "",
        session: "",
        version: "5.3",
      },
      parent_header: {},
      metadata: {},
      content: {
        code,
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: true,
      },
      channel: "shell",
    }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.parent_header?.msg_id !== msgId) return;

      switch (msg.msg_type) {
        case "stream":
          onOutput({
            output_type: "stream",
            name: msg.content.name,
            text: [msg.content.text],
          });
          break;
        case "display_data":
        case "execute_result":
          onOutput({
            output_type: msg.msg_type,
            data: msg.content.data,
            metadata: msg.content.metadata || {},
            ...(msg.msg_type === "execute_result" ? { execution_count: msg.content.execution_count } : {}),
          });
          break;
        case "error":
          onOutput({
            output_type: "error",
            ename: msg.content.ename,
            evalue: msg.content.evalue,
            traceback: msg.content.traceback,
          });
          break;
        case "execute_reply":
          onDone();
          ws.close();
          break;
      }
    } catch {
      // Ignore parse errors
    }
  };

  ws.onerror = () => {
    onOutput({
      output_type: "error",
      ename: "WebSocketError",
      evalue: "Connection to kernel failed",
      traceback: [],
    });
    onDone();
  };

  // Return cleanup function
  return () => {
    ws.close();
  };
}

export type CellExecutionOutput =
  | { output_type: "stream"; name: string; text: string[] }
  | { output_type: "display_data"; data: Record<string, unknown>; metadata: Record<string, unknown> }
  | { output_type: "execute_result"; data: Record<string, unknown>; metadata: Record<string, unknown>; execution_count: number }
  | { output_type: "error"; ename: string; evalue: string; traceback: string[] };

/** Interrupt a running kernel. */
export async function interruptKernel(session: JupyterSession, kernelId: string): Promise<void> {
  await fetch(`${session.url}/api/kernels/${kernelId}/interrupt`, {
    method: "POST",
    headers: { "Authorization": `token ${session.token}` },
  });
}

/** Restart a kernel. */
export async function restartKernel(session: JupyterSession, kernelId: string): Promise<void> {
  await fetch(`${session.url}/api/kernels/${kernelId}/restart`, {
    method: "POST",
    headers: { "Authorization": `token ${session.token}` },
  });
}
