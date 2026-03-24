import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// AI Chat proxy — reads Anthropic API key from multiple sources
// Supports: env var, request body, OpenClaw auth-profiles
// For OAuth-only setups: set ANTHROPIC_API_KEY in .env.local with a real API key

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function getApiKey(bodyKey?: string): string | null {
  // 1. Request body
  if (bodyKey) return bodyKey;
  // 2. Environment variable
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // 3. OpenClaw auth-profiles (only non-OAuth keys)
  try {
    const home = process.env.HOME || "";
    const authPath = join(home, ".openclaw/agents/dev/agent/auth-profiles.json");
    const data = JSON.parse(readFileSync(authPath, "utf-8"));
    const profile = data?.profiles?.["anthropic:default"];
    const key = profile?.access || profile?.token || "";
    if (key && !key.includes("-oat")) return key;
  } catch { /* ignore */ }
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
