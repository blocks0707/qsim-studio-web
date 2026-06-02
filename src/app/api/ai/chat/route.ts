import { NextRequest } from "next/server";

export const runtime = "edge";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function getApiKey(bodyKey?: string): string | null {
  if (bodyKey) return bodyKey;
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, system, model, apiKey } = body;

    const key = getApiKey(apiKey);
    if (!key) {
      return Response.json(
        { error: "No Anthropic API key configured. Set ANTHROPIC_API_KEY in .env.local (get one at console.anthropic.com/settings/keys)" },
        { status: 400 }
      );
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
