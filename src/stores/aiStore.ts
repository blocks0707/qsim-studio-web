import { create } from "zustand";
import type { AIMessage, AIProvider, AIContext } from "@/lib/ai";
import { OpenClawProvider, extractCodeBlock } from "@/lib/ai";

export interface ChatMessage extends AIMessage {
  id: string;
  timestamp: number;
  /** If assistant message contains code, extracted here */
  codeBlock?: string;
  /** Is streaming in progress */
  streaming?: boolean;
  /** Whether this message's code has been applied */
  applied?: boolean;
}

type AIProviderType = "openclaw" | "gateway" | "custom";

interface AISettings {
  provider: AIProviderType;
  apiUrl: string;
  apiToken: string;
  model: string;
  /** OpenClaw Gateway URL (for gateway mode) */
  gatewayUrl: string;
  /** OpenClaw Gateway token (for gateway mode) */
  gatewayToken: string;
  /** Agent ID for gateway spawn */
  agentId: string;
}

function loadAISettings(): AISettings {
  if (typeof window === "undefined") {
    return { provider: "openclaw", apiUrl: "", apiToken: "", model: "", gatewayUrl: "", gatewayToken: "", agentId: "" };
  }
  return {
    provider: (localStorage.getItem("qsim-ai:provider") as AIProviderType) || "openclaw",
    apiUrl: localStorage.getItem("qsim-ai:apiUrl") || "",
    apiToken: localStorage.getItem("qsim-ai:apiToken") || "",
    model: localStorage.getItem("qsim-ai:model") || "",
    gatewayUrl: localStorage.getItem("qsim-ai:gatewayUrl") || "",
    gatewayToken: localStorage.getItem("qsim-ai:gatewayToken") || "",
    agentId: localStorage.getItem("qsim-ai:agentId") || "",
  };
}

function saveAISettings(s: AISettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("qsim-ai:provider", s.provider);
  localStorage.setItem("qsim-ai:apiUrl", s.apiUrl);
  localStorage.setItem("qsim-ai:apiToken", s.apiToken);
  localStorage.setItem("qsim-ai:model", s.model);
  localStorage.setItem("qsim-ai:gatewayUrl", s.gatewayUrl);
  localStorage.setItem("qsim-ai:gatewayToken", s.gatewayToken);
  localStorage.setItem("qsim-ai:agentId", s.agentId);
}

function createProvider(settings: AISettings): AIProvider | null {
  if (settings.provider === "gateway") {
    // OpenClaw Gateway mode — needs gateway token (URL defaults to localhost)
    if (!settings.gatewayToken && !process.env.OPENCLAW_GATEWAY_TOKEN) return null;
    return new OpenClawProvider({
      apiUrl: "",
      apiToken: settings.gatewayToken,
      model: settings.model || undefined,
      provider: "gateway",
      gatewayUrl: settings.gatewayUrl || undefined,
      gatewayToken: settings.gatewayToken || undefined,
      agentId: settings.agentId || undefined,
    });
  }
  // "local" mode uses server-side proxy — only needs apiToken (or env key)
  const isLocal = settings.apiUrl === "local" || settings.apiUrl === "/api/ai/chat" || settings.apiUrl === "";
  if (!isLocal && (!settings.apiUrl || !settings.apiToken)) return null;
  if (settings.provider === "openclaw" || settings.provider === "custom") {
    return new OpenClawProvider({
      apiUrl: settings.apiUrl,
      apiToken: settings.apiToken,
      model: settings.model || undefined,
      provider: settings.apiUrl.includes("anthropic") ? "anthropic" : "openai",
    });
  }
  return null;
}

function isSettingsConfigured(s: AISettings): boolean {
  if (s.provider === "gateway") return !!s.gatewayToken;
  return !!(s.apiUrl && s.apiToken) || s.apiUrl === "local" || s.apiUrl === "/api/ai/chat" || s.apiUrl === "";
}

let msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

interface AIState {
  // Panel
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  togglePanel: () => void;

  // Settings
  settings: AISettings;
  updateSettings: (s: Partial<AISettings>) => void;
  isConfigured: boolean;

  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  abortController: AbortController | null;

  // Actions
  sendMessage: (text: string, context: AIContext) => void;
  stopStreaming: () => void;
  clearChat: () => void;
  applyCode: (code: string, messageId?: string) => void;
  markApplied: (messageId: string) => void;
  /** Set by IDE to allow code insertion */
  onApplyCode: ((code: string) => void) | null;
  setOnApplyCode: (fn: ((code: string) => void) | null) => void;
  /** Callback to auto-preview code in editor (diff without applying) */
  onPreviewCode: ((code: string) => void) | null;
  setOnPreviewCode: (fn: ((code: string) => void) | null) => void;
}

export const useAIStore = create<AIState>((set, get) => {
  const initial = loadAISettings();
  return {
    panelOpen: false,
    setPanelOpen: (v) => set({ panelOpen: v }),
    togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

    settings: initial,
    isConfigured: isSettingsConfigured(initial),
    updateSettings: (partial) => {
      const next = { ...get().settings, ...partial };
      saveAISettings(next);
      set({ settings: next, isConfigured: isSettingsConfigured(next) });
    },

    messages: [],
    isStreaming: false,
    abortController: null,

    sendMessage: (text, context) => {
      const { settings, messages, isStreaming } = get();
      if (isStreaming) return;

      const provider = createProvider(settings);
      if (!provider) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        streaming: true,
      };

      set({
        messages: [...messages, userMsg, assistantMsg],
        isStreaming: true,
      });

      // Build history (last 10 messages for context window)
      const history = [...messages, userMsg]
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = provider.chat(history, context, {
        onToken: (token) => {
          const msgs = get().messages;
          const last = msgs[msgs.length - 1];
          if (last && last.id === assistantMsg.id) {
            const updated = { ...last, content: last.content + token };
            set({ messages: [...msgs.slice(0, -1), updated] });
          }
        },
        onDone: (fullText) => {
          const msgs = get().messages;
          const last = msgs[msgs.length - 1];
          if (last && last.id === assistantMsg.id) {
            const codeBlock = extractCodeBlock(fullText) || undefined;
            const updated = { ...last, content: fullText, streaming: false, codeBlock };
            set({ messages: [...msgs.slice(0, -1), updated], isStreaming: false, abortController: null });
            // Auto-preview code in editor if runnable
            if (codeBlock && /^(from |import )|QuantumCircuit\(/.test(codeBlock.trim())) {
              get().onPreviewCode?.(codeBlock);
            }
          }
        },
        onError: (error) => {
          const msgs = get().messages;
          const last = msgs[msgs.length - 1];
          if (last && last.id === assistantMsg.id) {
            const updated = { ...last, content: `⚠️ Error: ${error}`, streaming: false };
            set({ messages: [...msgs.slice(0, -1), updated], isStreaming: false, abortController: null });
          }
        },
      });

      set({ abortController: controller });
    },

    stopStreaming: () => {
      const { abortController, messages } = get();
      abortController?.abort();
      // Mark last message as done
      const last = messages[messages.length - 1];
      if (last?.streaming) {
        const codeBlock = extractCodeBlock(last.content) || undefined;
        const updated = { ...last, streaming: false, codeBlock };
        set({ messages: [...messages.slice(0, -1), updated], isStreaming: false, abortController: null });
      } else {
        set({ isStreaming: false, abortController: null });
      }
    },

    clearChat: () => set({ messages: [], isStreaming: false, abortController: null }),

    applyCode: (code, messageId) => {
      get().onApplyCode?.(code);
      if (messageId) get().markApplied(messageId);
    },

    markApplied: (messageId) => {
      const msgs = get().messages;
      set({ messages: msgs.map((m) => m.id === messageId ? { ...m, applied: true } : m) });
    },

    onApplyCode: null,
    setOnApplyCode: (fn) => set({ onApplyCode: fn }),

    onPreviewCode: null,
    setOnPreviewCode: (fn) => set({ onPreviewCode: fn }),
  };
});
