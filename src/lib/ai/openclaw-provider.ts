// OpenClaw AI Provider
// Supports two modes:
// 1. OpenClaw Gateway sessions API (send message to an agent, get response)
// 2. Direct Anthropic Messages API (requires API key)
// 3. OpenAI-compatible API (any provider)

import type { AIProvider, AIMessage, AIContext, AIStreamCallbacks, AIProviderConfig } from "./types";

const SYSTEM_PROMPT = `You are QSim AI Assistant — an expert quantum computing assistant embedded in QSim Studio, a web-based quantum circuit IDE.

Your capabilities:
1. **Code Generation**: Generate Qiskit/OpenQASM quantum circuits from natural language descriptions
2. **Code Explanation**: Explain quantum circuits, gates, and algorithms in clear language
3. **Error Debugging**: Analyze simulation errors and suggest fixes
4. **Result Interpretation**: Explain measurement results and their physical meaning
5. **Circuit Optimization**: Suggest gate count reduction and qubit minimization
6. **Education**: Teach quantum computing concepts with examples

Guidelines:
- When generating code, use Qiskit (qiskit + qiskit_aer) unless asked for OpenQASM
- Always include necessary imports in generated code
- Use QuantumCircuit with explicit classical bits for measurement
- Format code in \`\`\`python blocks
- Keep explanations concise but accurate
- When explaining results, reference specific measurement outcomes
- Support both Korean and English — match the user's language`;

function buildContextString(context: AIContext): string {
  const parts: string[] = [];
  if (context.code) {
    parts.push(`[Current Code]\n\`\`\`${context.language || "python"}\n${context.code}\n\`\`\``);
  }
  if (context.result) {
    parts.push(`[Simulation Result]\n${JSON.stringify(context.result)}`);
  }
  if (context.error) {
    parts.push(`[Error]\n${context.error}`);
  }
  if (context.circuit) {
    parts.push(`[Circuit Info]\nQubits: ${context.circuit.numQubits}, Bits: ${context.circuit.numBits}, Gates: ${context.circuit.gates.length}`);
  }
  return parts.join("\n\n");
}

function buildMessages(messages: AIMessage[], context: AIContext): AIMessage[] {
  const systemParts = [SYSTEM_PROMPT];
  const contextStr = buildContextString(context);
  if (contextStr) systemParts.push(contextStr);
  return [
    { role: "system", content: systemParts.join("\n\n") },
    ...messages,
  ];
}

export class OpenClawProvider implements AIProvider {
  readonly name = "OpenClaw";
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  chat(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
  ): AbortController {
    const controller = new AbortController();
    const url = this.config.apiUrl;

    if (this.config.provider === "gateway") {
      // OpenClaw Gateway mode — spawn sub-agent
      this.chatGateway(messages, context, callbacks, controller);
    } else if (url === "/api/ai/chat" || url === "" || url === "local") {
      // Use built-in Next.js API route proxy
      this.chatLocal(messages, context, callbacks, controller);
    } else if (url.includes("api.anthropic.com")) {
      this.chatAnthropic(messages, context, callbacks, controller);
    } else if (url.match(/:\d+$/) && !url.includes("/v1")) {
      this.chatOpenClaw(messages, context, callbacks, controller);
    } else {
      this.chatOpenAI(messages, context, callbacks, controller);
    }

    return controller;
  }

  /** Local proxy — uses /api/ai/chat Next.js route */
  private async chatLocal(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
    controller: AbortController,
  ) {
    const fullMessages = buildMessages(messages, context);
    const systemMsg = fullMessages.find((m) => m.role === "system");
    const conversationMsgs = fullMessages.filter((m) => m.role !== "system");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemMsg?.content || SYSTEM_PROMPT,
          messages: conversationMsgs.map((m) => ({ role: m.role, content: m.content })),
          model: this.config.model || undefined,
          apiKey: this.config.apiToken || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        callbacks.onError(`Error ${res.status}: ${errText}`);
        return;
      }

      // Parse Anthropic SSE stream
      const reader = res.body?.getReader();
      if (!reader) { callbacks.onError("No response stream"); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              callbacks.onToken(parsed.delta.text);
            }
          } catch { /* skip */ }
        }
      }

      callbacks.onDone(fullText);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  }

  /** OpenClaw Gateway via Next.js proxy — spawn sub-agent */
  private async chatGateway(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
    controller: AbortController,
  ) {
    try {
      const res = await fetch("/api/ai/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          context,
          gatewayUrl: this.config.gatewayUrl || undefined,
          gatewayToken: this.config.gatewayToken || this.config.apiToken || undefined,
          agentId: this.config.agentId || undefined,
          model: this.config.model || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        callbacks.onError(errBody.error || `Gateway error ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.error) {
        callbacks.onError(data.error);
        return;
      }

      const text = data.text || "";
      callbacks.onToken(text);
      callbacks.onDone(text);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  }

  /** OpenClaw Gateway — spawn a sub-agent session (direct, no proxy) */
  private async chatOpenClaw(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
    controller: AbortController,
  ) {
    const lastUserMsg = messages.filter(m => m.role === "user").pop();
    if (!lastUserMsg) { callbacks.onError("No user message"); return; }

    const contextStr = buildContextString(context);
    const prompt = contextStr
      ? `${SYSTEM_PROMPT}\n\n${contextStr}\n\nUser: ${lastUserMsg.content}`
      : `${SYSTEM_PROMPT}\n\nUser: ${lastUserMsg.content}`;

    try {
      const res = await fetch(`${this.config.apiUrl}/api/sessions/spawn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          task: prompt,
          agentId: this.config.agentId || "dev",
          runTimeoutSeconds: 120,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        callbacks.onError(`OpenClaw error ${res.status}: ${errText}`);
        return;
      }

      const data = await res.json();
      const reply = data.result || data.message || data.text || JSON.stringify(data);
      callbacks.onToken(reply);
      callbacks.onDone(reply);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  }

  /** OpenAI-compatible /v1/chat/completions */
  private async chatOpenAI(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
    controller: AbortController,
  ) {
    const fullMessages = buildMessages(messages, context);
    const baseUrl = this.config.apiUrl.replace(/\/+$/, "").replace(/\/v1$/, "");

    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          model: this.config.model || "anthropic/claude-sonnet-4-20250514",
          messages: fullMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        callbacks.onError(`API error ${res.status}: ${errText}`);
        return;
      }

      await this.readSSEStream(res, callbacks);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  }

  /** Anthropic Messages API */
  private async chatAnthropic(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
    controller: AbortController,
  ) {
    const fullMessages = buildMessages(messages, context);
    const systemMsg = fullMessages.find((m) => m.role === "system");
    const conversationMsgs = fullMessages.filter((m) => m.role !== "system");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiToken,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.config.model || "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemMsg?.content || SYSTEM_PROMPT,
          messages: conversationMsgs.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        callbacks.onError(`Anthropic error ${res.status}: ${errText}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { callbacks.onError("No response stream"); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              callbacks.onToken(parsed.delta.text);
            }
          } catch { /* skip */ }
        }
      }

      callbacks.onDone(fullText);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  }

  private async readSSEStream(res: Response, callbacks: AIStreamCallbacks) {
    const reader = res.body?.getReader();
    if (!reader) { callbacks.onError("No response stream"); return; }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onToken(delta);
          }
        } catch { /* skip */ }
      }
    }

    callbacks.onDone(fullText);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = this.config.apiUrl;
      if (url.includes("api.anthropic.com")) return true; // Skip health check for Anthropic
      const res = await fetch(`${url}/v1/models`, {
        headers: { Authorization: `Bearer ${this.config.apiToken}` },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      if (res?.ok) return true;
      // Try OpenClaw gateway health
      const res2 = await fetch(`${url}/api/status`, {
        headers: { Authorization: `Bearer ${this.config.apiToken}` },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      return res2?.ok || false;
    } catch {
      return false;
    }
  }
}
