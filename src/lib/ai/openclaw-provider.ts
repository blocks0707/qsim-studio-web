// OpenClaw AI Provider — uses OpenClaw Gateway API for LLM access

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

function buildMessages(
  messages: AIMessage[],
  context: AIContext,
): AIMessage[] {
  const systemParts = [SYSTEM_PROMPT];

  if (context.code) {
    systemParts.push(`\n--- Current Editor Code ---\n\`\`\`${context.language || "python"}\n${context.code}\n\`\`\``);
  }
  if (context.result) {
    systemParts.push(`\n--- Last Simulation Result ---\n${JSON.stringify(context.result)}`);
  }
  if (context.error) {
    systemParts.push(`\n--- Error ---\n${context.error}`);
  }
  if (context.circuit) {
    systemParts.push(`\n--- Circuit Info ---\nQubits: ${context.circuit.numQubits}, Bits: ${context.circuit.numBits}, Gates: ${context.circuit.gates.length}`);
  }

  return [
    { role: "system", content: systemParts.join("\n") },
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
    const fullMessages = buildMessages(messages, context);

    (async () => {
      try {
        const res = await fetch(`${this.config.apiUrl}/v1/chat/completions`, {
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

        const reader = res.body?.getReader();
        if (!reader) {
          callbacks.onError("No response stream");
          return;
        }

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
            } catch {
              // skip malformed JSON
            }
          }
        }

        callbacks.onDone(fullText);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        callbacks.onError(err instanceof Error ? err.message : String(err));
      }
    })();

    return controller;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.apiUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${this.config.apiToken}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
