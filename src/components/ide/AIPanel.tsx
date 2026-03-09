"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Square, Trash2, Copy, Play, Settings, X, ChevronDown } from "lucide-react";
import { useAIStore, type ChatMessage } from "@/stores/aiStore";
import { useIDEStore } from "@/stores/ideStore";

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

        {/* Code action buttons */}
        {msg.codeBlock && !msg.streaming && (
          <div className="flex gap-1 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => applyCode(msg.codeBlock!)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:opacity-80 transition-opacity"
              style={{ background: "var(--accent)", color: "white" }}
              title="Apply code to editor"
            >
              <Play size={10} /> 적용
            </button>
            <button
              onClick={() => copyToClipboard(msg.codeBlock!)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:opacity-80 transition-opacity"
              style={{ background: "var(--bg-editor)", color: "var(--text-secondary)" }}
              title="Copy code"
            >
              <Copy size={10} /> 복사
            </button>
          </div>
        )}
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
            return (
              <pre
                key={i}
                className="my-2 p-2 rounded text-[12px] overflow-x-auto"
                style={{ background: "var(--bg-editor)", border: "1px solid var(--border)" }}
              >
                <code>{match[2]}</code>
              </pre>
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
                  style={{ background: "var(--bg-editor)" }}
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
  const [url, setUrl] = useState(settings.apiUrl);
  const [token, setToken] = useState(settings.apiToken);
  const [model, setModel] = useState(settings.model);

  const save = () => {
    updateSettings({ apiUrl: url, apiToken: token, model });
    onClose();
  };

  return (
    <div className="p-3 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>AI Settings</span>
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>API URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.openclaw.ai"
            className="w-full px-2 py-1.5 rounded text-[12px]"
            style={{ background: "var(--bg-editor)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
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
            style={{ background: "var(--bg-editor)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
        </div>
        <div>
          <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>Model (optional)</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="anthropic/claude-sonnet-4-20250514"
            className="w-full px-2 py-1.5 rounded text-[12px]"
            style={{ background: "var(--bg-editor)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
        </div>
      </div>

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

  // Register code apply handler
  useEffect(() => {
    setOnApplyCode((code: string) => {
      if (!activeTabId) return;
      // Replace entire editor content or insert
      if (editorRef) {
        const model = editorRef as unknown as {
          executeEdits: (source: string, edits: Array<{
            range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
            text: string;
          }>) => void;
        };
        // Get current line count to select all
        const currentCode = fileContents[activeTabId] || "";
        const lineCount = currentCode.split("\n").length;
        model.executeEdits("ai-assistant", [
          {
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: lineCount + 1,
              endColumn: 1,
            },
            text: code + "\n",
          },
        ]);
      } else {
        setFileContent(activeTabId, code);
      }
    });
    return () => setOnApplyCode(null);
  }, [activeTabId, editorRef, fileContents, setFileContent, setOnApplyCode]);

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
