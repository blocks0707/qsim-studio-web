import { NextRequest } from "next/server";

// AI Chat proxy — forwards to Anthropic Messages API
// Keeps API key server-side, streams response via SSE

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, system, model, apiKey } = body;

    // apiKey can come from request body (user-provided) or env
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return Response.json({ error: "No API key configured" }, { status: 400 });
    }

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: system || "",
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return Response.json({ error: `Anthropic API error: ${errText}` }, { status: res.status });
    }

    // Forward SSE stream directly
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
