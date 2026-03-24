"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Square, Trash2, Copy, Play, Settings, X, ChevronDown, Check } from "lucide-react";
import { useAIStore, type ChatMessage } from "@/stores/aiStore";
import { useIDEStore } from "@/stores/ideStore";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/vs2015.css";

hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("qasm", python); // fallback

// Quick action templates
const QUICK_ACTIONS = [
  { label: "💡 코드 설명", prompt: "현재 에디터의 코드를 한국어로 설명해줘. 각 게이트의 역할과 전체 알고리즘의 목적을 알려줘." },
  { label: "🐛 디버깅", prompt: "현재 코드에 문제가 있는지 분석하고, 에러가 있다면 수정 방법을 알려줘." },
  { label: "📊 결과 해석", prompt: "마지막 시뮬레이션 결과를 분석하고, 측정 결과의 물리적 의미를 설명해줘." },
  { label: "⚡ 최적화", prompt: "현재 회로를 최적화해줘. 게이트 수를 줄이거나 더 효율적인 구현을 제안해줘." },
  { label: "🔔 Bell State", prompt: "Bell State 회로를 만들어줘. 2큐빗 얽힘 상태를 생성하는 코드를 작성해줘." },
  { label: "🔍 Grover", prompt: "Grover 검색 알고리즘 회로를 만들어줘. 2큐빗 버전으로 target state를 |11⟩로 설정해줘." },
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const applyCode = useAIStore((s) => s.applyCode);
  const isUser = msg.role === "user";

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""} mb-3`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: "var(--accent)" }}
        >
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
          isUser ? "ml-auto" : ""
        }`}
        style={{
          background: isUser ? "var(--accent)" : "var(--bg-sidebar)",
          color: isUser ? "white" : "var(--text-primary)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}
      >
        {/* Render content with code blocks */}
        <MessageContent content={msg.content} streaming={msg.streaming} />

        {/* Code action buttons — Cursor-style Apply */}
        {msg.codeBlock && !msg.streaming && (() => {
          const isRunnable = /^(from |import )|QuantumCircuit\(/.test(msg.codeBlock!.trim());
          const isApplied = msg.applied;
          return (
            <div className="flex gap-1 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              {isRunnable && (
                <button
                  onClick={() => !isApplied && applyCode(msg.codeBlock!, msg.id)}
                  disabled={isApplied}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isApplied ? "var(--bg-editor)" : "linear-gradient(135deg, #007acc, #0098ff)",
                    color: isApplied ? "var(--text-secondary)" : "white",
                    boxShadow: isApplied ? "none" : "0 1px 3px rgba(0,122,204,0.3)",
                  }}
                  title={isApplied ? "Applied" : "Apply to editor"}
                >
                  {isApplied ? <><Check size={10} /> Applied</> : <><Play size={10} /> Apply</>}
                </button>
              )}
              <button
                onClick={() => copyToClipboard(msg.codeBlock!)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:opacity-80 transition-opacity"
                style={{ background: "var(--bg-editor)", color: "var(--text-secondary)" }}
                title="Copy code"
              >
                <Copy size={10} /> Copy
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  if (!content && streaming) {
    return (
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-secondary)", animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-secondary)", animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-secondary)", animationDelay: "300ms" }} />
      </span>
    );
  }

  // Split content into text and code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          if (match) {
            const lang = match[1] || "python";
            const code = match[2];
            let highlighted: string;
            try {
              highlighted = hljs.getLanguage(lang)
                ? hljs.highlight(code, { language: lang }).value
                : hljs.highlightAuto(code).value;
            } catch {
              highlighted = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
            return (
              <div key={i} className="my-2 rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between px-2 py-1" style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid var(--border)" }}>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{lang}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-[10px] opacity-50 hover:opacity-100 flex items-center gap-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
                <pre className="p-2 text-[12px] overflow-x-auto" style={{ background: "var(--bg-editor)", margin: 0 }}>
                  <code className={`hljs language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
              </div>
            );
          }
        }
        // Inline code
        return (
          <span key={i}>
            {part.split(/(`[^`]+`)/g).map((seg, j) =>
              seg.startsWith("`") && seg.endsWith("`") ? (
                <code
                  key={j}
                  className="px-1 py-0.5 rounded text-[12px]"
                  style={{ background: "var(--bg-editor)", color: "#ce9178" }}
                >
                  {seg.slice(1, -1)}
                </code>
              ) : (
                <span key={j}>{seg}</span>
              )
            )}
          </span>
        );
      })}
      {streaming && <span className="animate-pulse">▊</span>}
    </div>
  );
}

function AISettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAIStore();
  const [provider, setProvider] = useState(settings.provider);
  const [url, setUrl] = useState(settings.apiUrl);
  const [token, setToken] = useState(settings.apiToken);
  const [model, setModel] = useState(settings.model);
  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [gatewayToken, setGatewayToken] = useState(settings.gatewayToken);
  const [agentId, setAgentId] = useState(settings.agentId);

  const save = () => {
    updateSettings({ provider, apiUrl: url, apiToken: token, model, gatewayUrl, gatewayToken, agentId });
    onClose();
  };

  const inputStyle = {
    background: "var(--bg-editor)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  const isGateway = provider === "gateway";

  return (
    <div className="p-3 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>AI Settings</span>
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {/* Provider selector */}
        <div>
          <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>Provider</label>
          <div className="flex gap-1">
            {([
              { key: "openclaw", label: "Local Proxy" },
              { key: "gateway", label: "OpenClaw Gateway" },
              { key: "custom", label: "Custom API" },
            ] as const).map((p) => (
              <button
                key={p.key}
                onClick={() => setProvider(p.key)}
                className="px-2 py-1 rounded text-[11px] transition-colors"
                style={{
                  background: provider === p.key ? "var(--accent)" : "var(--bg-editor)",
                  color: provider === p.key ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${provider === p.key ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isGateway ? (
          <>
            {/* Gateway settings */}
            <div>
              <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
                Gateway URL
                <span className="opacity-50 ml-1">(비워두면 localhost:18789)</span>
              </label>
              <input
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="http://localhost:18789"
                className="w-full px-2 py-1.5 rounded text-[12px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>Gateway Token</label>
              <input
                value={gatewayToken}
                onChange={(e) => setGatewayToken(e.target.value)}
                type="password"
                placeholder="Gateway bearer token"
                className="w-full px-2 py-1.5 rounded text-[12px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
                Agent ID
                <span className="opacity-50 ml-1">(비워두면 dev)</span>
              </label>
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="dev"
                className="w-full px-2 py-1.5 rounded text-[12px]"
                style={inputStyle}
              />
            </div>
          </>
        ) : (
          <>
            {/* Direct API settings */}
            <div>
              <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
                API URL
                <span className="opacity-50 ml-1">(비워두면 내장 프록시)</span>
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.anthropic.com"
                className="w-full px-2 py-1.5 rounded text-[12px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>API Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="Bearer token"
                className="w-full px-2 py-1.5 rounded text-[12px]"
                style={inputStyle}
              />
            </div>
          </>
        )}

        {/* Model — shared */}
        <div>
          <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>Model (optional)</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={isGateway ? "anthropic/claude-sonnet-4-20250514" : "claude-sonnet-4-20250514"}
            className="w-full px-2 py-1.5 rounded text-[12px]"
            style={inputStyle}
          />
        </div>
      </div>

      {isGateway && (
        <div className="text-[10px] px-2 py-1.5 rounded" style={{ background: "var(--bg-editor)", color: "var(--text-secondary)" }}>
          💡 Gateway 모드는 OpenClaw의 에이전트를 통해 응답합니다. API 키 없이 구독만으로 사용 가능.
        </div>
      )}

      <button
        onClick={save}
        className="w-full py-1.5 rounded text-[12px] font-medium"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Save
      </button>
    </div>
  );
}

export function AIPanel() {
  const {
    panelOpen,
    messages,
    isStreaming,
    isConfigured,
    sendMessage,
    stopStreaming,
    clearChat,
    setOnApplyCode,
  } = useAIStore();

  const activeTabId = useIDEStore((s) => s.activeTabId);
  const fileContents = useIDEStore((s) => s.fileContents);
  const jobResult = useIDEStore((s) => s.jobResult);
  const consoleLogs = useIDEStore((s) => s.consoleLogs);
  const editorRef = useIDEStore((s) => s.editorRef);
  const setFileContent = useIDEStore((s) => s.setFileContent);

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setPendingSuggestion = useIDEStore((s) => s.setPendingSuggestion);
  const setOnPreviewCode = useAIStore((s) => s.setOnPreviewCode);

  // Helper: apply code to editor via Monaco API
  const applyToEditor = useCallback((code: string) => {
    const state = useIDEStore.getState();
    const tabId = state.activeTabId;
    if (!tabId) return;

    const isCompleteFile = /^(from |import |#.*\n(?:from |import ))/.test(code.trim());
    const currentCode = state.fileContents[tabId] || "";
    const finalCode = isCompleteFile ? code : currentCode + "\n" + code + "\n";

    const editor = state.editorRef as unknown as {
      getModel: () => { setValue: (v: string) => void } | null;
    } | null;
    if (editor?.getModel) {
      editor.getModel()?.setValue(finalCode);
    }
    state.setFileContent(tabId, finalCode);
    return { currentCode, finalCode, tabId, isCompleteFile };
  }, []);

  // Register preview handler — auto-shows diff when AI finishes generating code
  useEffect(() => {
    setOnPreviewCode((code: string) => {
      const result = applyToEditor(code);
      if (result) {
        // Show diff overlay (Accept/Reject)
        setPendingSuggestion({
          originalCode: result.currentCode,
          suggestedCode: result.finalCode,
          tabId: result.tabId,
          isFullReplace: result.isCompleteFile,
        });
      }
    });
    return () => setOnPreviewCode(null);
  }, [setOnPreviewCode, setPendingSuggestion, applyToEditor]);

  // Register apply handler — directly applies code and accepts (single click)
  useEffect(() => {
    setOnApplyCode((code: string) => {
      const state = useIDEStore.getState();
      // If there's already a pending suggestion showing this code, just accept it
      if (state.pendingSuggestion) {
        state.acceptSuggestion();
        return;
      }
      // Otherwise apply directly
      applyToEditor(code);
    });
    return () => setOnApplyCode(null);
  }, [setOnApplyCode, applyToEditor]);

  const getContext = useCallback(() => {
    const code = activeTabId ? fileContents[activeTabId] : undefined;
    const errorLog = consoleLogs.find(
      (l) => l.includes("ERROR") || l.includes("Failed") || l.includes("Error")
    );
    return {
      code,
      language: "python",
      result: jobResult?.counts,
      error: errorLog,
    };
  }, [activeTabId, fileContents, jobResult, consoleLogs]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage(text, getContext());
  }, [input, isStreaming, sendMessage, getContext]);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      setShowQuickActions(false);
      sendMessage(prompt, getContext());
    },
    [sendMessage, getContext]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!panelOpen) return null;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-primary)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="h-9 flex items-center px-3 justify-between flex-shrink-0"
        style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Bot size={14} style={{ color: "var(--accent)" }} />
          <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-secondary)" }}>
            AI Assistant
          </span>
          {isConfigured && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Connected" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded opacity-60 hover:opacity-100"
            title="Settings"
          >
            <Settings size={12} />
          </button>
          <button
            onClick={clearChat}
            className="p-1 rounded opacity-60 hover:opacity-100"
            title="Clear chat"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && <AISettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {messages.length === 0 && !showSettings && (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-[12px] mb-1" style={{ color: "var(--text-secondary)" }}>
              QSim AI Assistant
            </p>
            <p className="text-[11px] mb-4" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
              양자 회로 생성, 코드 설명, 디버깅, 결과 해석
            </p>
            {!isConfigured && (
              <button
                onClick={() => setShowSettings(true)}
                className="text-[11px] px-3 py-1.5 rounded"
                style={{ background: "var(--accent)", color: "white" }}
              >
                AI 설정하기
              </button>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div
          className="px-3 py-2 flex flex-wrap gap-1"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              className="px-2 py-1 rounded text-[11px] hover:opacity-80 transition-opacity"
              style={{ background: "var(--bg-sidebar)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-end gap-1">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="p-1.5 rounded opacity-60 hover:opacity-100 flex-shrink-0 mb-0.5"
            title="Quick actions"
            style={{
              transform: showQuickActions ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <ChevronDown size={14} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConfigured ? "메시지 입력... (Shift+Enter: 줄바꿈)" : "AI 설정을 먼저 해주세요"}
            disabled={!isConfigured}
            rows={1}
            className="flex-1 resize-none rounded px-2 py-1.5 text-[12px] max-h-24 overflow-y-auto"
            style={{
              background: "var(--bg-editor)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 96) + "px";
            }}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="p-1.5 rounded flex-shrink-0 mb-0.5"
              style={{ background: "#f44747", color: "white" }}
              title="Stop"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConfigured}
              className="p-1.5 rounded flex-shrink-0 mb-0.5 disabled:opacity-30"
              style={{ background: "var(--accent)", color: "white" }}
              title="Send"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
