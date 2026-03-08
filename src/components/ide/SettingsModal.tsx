"use client";

import { useIDEStore, type EditorSettings } from "@/stores/ideStore";
import { createClient } from "@/lib/api";
import { X, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";

export function SettingsModal() {
  const settingsOpen = useIDEStore((s) => s.settingsOpen);
  const setSettingsOpen = useIDEStore((s) => s.setSettingsOpen);
  const apiUrl = useIDEStore((s) => s.apiUrl);
  const apiToken = useIDEStore((s) => s.apiToken);
  const setApiConfig = useIDEStore((s) => s.setApiConfig);
  const editorSettings = useIDEStore((s) => s.editorSettings);
  const setEditorSettings = useIDEStore((s) => s.setEditorSettings);
  const saveSettings = useIDEStore((s) => s.saveSettings);
  const resetSettings = useIDEStore((s) => s.resetSettings);
  const setConnected = useIDEStore((s) => s.setConnected);

  const [localUrl, setLocalUrl] = useState(apiUrl);
  const [localToken, setLocalToken] = useState(apiToken);
  const [localEditor, setLocalEditor] = useState<EditorSettings>({ ...editorSettings });
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle");

  useEffect(() => {
    if (settingsOpen) {
      setLocalUrl(apiUrl);
      setLocalToken(apiToken);
      setLocalEditor({ ...editorSettings });
      setConnStatus("idle");
    }
  }, [settingsOpen, apiUrl, apiToken, editorSettings]);

  const testConnection = useCallback(async () => {
    setConnStatus("testing");
    try {
      const client = createClient(localUrl, localToken);
      const ok = await client.checkHealth();
      setConnStatus(ok ? "connected" : "failed");
    } catch {
      setConnStatus("failed");
    }
  }, [localUrl, localToken]);

  const handleSave = () => {
    setApiConfig(localUrl, localToken);
    setEditorSettings(localEditor);
    setConnected(connStatus === "connected");
    // Need to call saveSettings after state update
    setTimeout(() => {
      useIDEStore.getState().saveSettings();
    }, 0);
    setSettingsOpen(false);
  };

  const handleReset = () => {
    resetSettings();
    setSettingsOpen(false);
  };

  if (!settingsOpen) return null;

  const inputStyle = {
    background: "var(--bg-editor)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
    >
      <div
        className="w-[520px] max-h-[80vh] rounded-lg overflow-hidden flex flex-col"
        style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Settings</span>
          <button onClick={() => setSettingsOpen(false)} className="p-1 rounded hover:bg-white/10">
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Connection */}
          <Section title="Connection">
            <Label text="API URL">
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="w-full px-2 py-1.5 rounded text-sm"
                style={inputStyle}
              />
            </Label>
            <Label text="API Token">
              <input
                type="password"
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                placeholder="Bearer token"
                className="w-full px-2 py-1.5 rounded text-sm"
                style={inputStyle}
              />
            </Label>
            <div className="flex items-center gap-3">
              <button
                onClick={testConnection}
                disabled={connStatus === "testing"}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {connStatus === "testing" ? (
                  <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Testing…</span>
                ) : "Test Connection"}
              </button>
              {connStatus === "connected" && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#4ec9b0" }}>
                  <CheckCircle size={14} /> Connected
                </span>
              )}
              {connStatus === "failed" && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#f44747" }}>
                  <XCircle size={14} /> Failed
                </span>
              )}
            </div>
          </Section>

          {/* Editor */}
          <Section title="Editor">
            <Label text={`Font Size: ${localEditor.fontSize}px`}>
              <input
                type="range"
                min={10}
                max={24}
                value={localEditor.fontSize}
                onChange={(e) => setLocalEditor({ ...localEditor, fontSize: Number(e.target.value) })}
                className="w-full"
              />
            </Label>
            <Label text="Tab Size">
              <div className="flex gap-2">
                {([2, 4] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setLocalEditor({ ...localEditor, tabSize: n })}
                    className="px-3 py-1 rounded text-xs"
                    style={{
                      background: localEditor.tabSize === n ? "var(--accent)" : "var(--bg-editor)",
                      color: localEditor.tabSize === n ? "#fff" : "var(--text-secondary)",
                      border: `1px solid ${localEditor.tabSize === n ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {n} spaces
                  </button>
                ))}
              </div>
            </Label>
            <Toggle label="Minimap" value={localEditor.minimap} onChange={(v) => setLocalEditor({ ...localEditor, minimap: v })} />
            <Toggle label="Word Wrap" value={localEditor.wordWrap} onChange={(v) => setLocalEditor({ ...localEditor, wordWrap: v })} />
            <Toggle label="Line Numbers" value={localEditor.lineNumbers} onChange={(v) => setLocalEditor({ ...localEditor, lineNumbers: v })} />
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <Label text="Theme">
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded text-xs"
                  style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
                >
                  Dark
                </button>
                <button
                  className="px-3 py-1 rounded text-xs opacity-50 cursor-not-allowed"
                  style={{ background: "var(--bg-editor)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  disabled
                >
                  Light (coming soon)
                </button>
              </div>
            </Label>
          </Section>

          {/* Keyboard Shortcuts */}
          <Section title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              {[
                ["Run Simulation", "⌘ Enter"],
                ["Settings", "⌘ ,"],
                ["New File", "⌘ N"],
                ["Close Tab", "⌘ W"],
                ["Toggle Sidebar", "⌘ B"],
                ["Switch Panel", "⌘ 1-5"],
              ].map(([action, key]) => (
                <div key={action} className="flex justify-between py-1 px-2 rounded" style={{ background: "var(--bg-editor)" }}>
                  <span>{action}</span>
                  <kbd className="text-[10px] px-1 rounded" style={{ background: "var(--border)", color: "var(--text-primary)" }}>{key}</kbd>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded text-xs"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-3 py-1.5 rounded text-xs"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded text-xs font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{text}</div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-9 h-5 rounded-full relative transition-colors"
        style={{ background: value ? "var(--accent)" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ left: value ? "18px" : "2px" }}
        />
      </button>
    </div>
  );
}
