import { NextRequest } from "next/server";

// OpenClaw Gateway proxy — uses /tools/invoke to spawn a sub-agent session
// Gateway URL and token from env or request body

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, context, gatewayUrl, gatewayToken, agentId, model } = body;

    const url = gatewayUrl || process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
    const token = gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN || "";

    if (!token) {
      return Response.json(
        { error: "No gateway token configured. Set OPENCLAW_GATEWAY_TOKEN in .env.local or provide in AI Settings." },
        { status: 400 }
      );
    }

    // Build task prompt from messages + context
    const lastUserMsg = messages?.filter((m: { role: string }) => m.role === "user").pop();
    if (!lastUserMsg) {
      return Response.json({ error: "No user message" }, { status: 400 });
    }

    const contextParts: string[] = [];
    if (context?.code) {
      contextParts.push(`[Current Code]\n\`\`\`${context.language || "python"}\n${context.code}\n\`\`\``);
    }
    if (context?.result) {
      contextParts.push(`[Simulation Result]\n${JSON.stringify(context.result)}`);
    }
    if (context?.error) {
      contextParts.push(`[Error]\n${context.error}`);
    }

    // Build conversation history (last few exchanges for context)
    const history = messages
      .filter((m: { role: string }) => m.role !== "system")
      .slice(-6)
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const task = [
      SYSTEM_PROMPT,
      contextParts.length > 0 ? contextParts.join("\n\n") : null,
      history.length > 0 ? `[Conversation History]\n${history}` : null,
      `\nRespond to the user's last message. Be concise and helpful.`,
    ].filter(Boolean).join("\n\n");

    // Invoke sessions_spawn via gateway
    const res = await fetch(`${url}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tool: "sessions_spawn",
        args: {
          task,
          agentId: agentId || "dev",
          model: model || undefined,
          runTimeoutSeconds: 120,
          cleanup: "delete",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return Response.json({ error: `Gateway error ${res.status}: ${errText}` }, { status: res.status });
    }

    const data = await res.json();

    // Extract result text from gateway response
    let resultText = "";
    if (data.ok && data.result?.content) {
      resultText = data.result.content
        .filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text)
        .join("\n");
    } else if (data.error) {
      return Response.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 500 });
    }

    // Return as a simple JSON response (not SSE — gateway spawn is synchronous)
    return Response.json({ text: resultText });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
