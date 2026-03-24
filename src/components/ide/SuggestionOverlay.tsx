"use client";

import { useEffect, useCallback } from "react";
import { Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { useIDEStore } from "@/stores/ideStore";

/**
 * Cursor-style suggestion overlay.
 * Shows Accept/Reject toolbar + line-level diff decorations in Monaco editor.
 */
export function SuggestionOverlay() {
  const pendingSuggestion = useIDEStore((s) => s.pendingSuggestion);
  const acceptSuggestion = useIDEStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useIDEStore((s) => s.rejectSuggestion);
  const editorRef = useIDEStore((s) => s.editorRef);

  // Compute diff stats
  const diffStats = pendingSuggestion
    ? computeDiffStats(pendingSuggestion.originalCode, pendingSuggestion.suggestedCode)
    : null;

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!pendingSuggestion) return;
      // ⌘+Enter or Ctrl+Enter to accept
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        acceptSuggestion();
      }
      // Escape to reject
      if (e.key === "Escape") {
        e.preventDefault();
        rejectSuggestion();
      }
    },
    [pendingSuggestion, acceptSuggestion, rejectSuggestion]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Apply Monaco decorations when suggestion is active
  useEffect(() => {
    if (!pendingSuggestion || !editorRef) return;

    const editor = editorRef as unknown as {
      deltaDecorations: (old: string[], decs: Array<{
        range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
        options: {
          isWholeLine?: boolean;
          className?: string;
          glyphMarginClassName?: string;
          linesDecorationsClassName?: string;
          overviewRuler?: { color: string; position: number };
        };
      }>) => string[];
      getModel: () => { getLineCount: () => number } | null;
    };

    if (!editor.deltaDecorations) return;

    const { added, removed } = computeLineDiff(
      pendingSuggestion.originalCode,
      pendingSuggestion.suggestedCode
    );

    const decorations = [
      ...added.map((line) => ({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: "suggestion-line-added",
          linesDecorationsClassName: "suggestion-gutter-added",
        },
      })),
      ...removed.map((line) => ({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: "suggestion-line-removed",
          linesDecorationsClassName: "suggestion-gutter-removed",
        },
      })),
    ];

    const ids = editor.deltaDecorations([], decorations);

    return () => {
      editor.deltaDecorations(ids, []);
    };
  }, [pendingSuggestion, editorRef]);

  if (!pendingSuggestion) return null;

  return (
    <div
      className="absolute top-1 right-4 z-50 flex items-center gap-1 px-2 py-1 rounded-md shadow-lg"
      style={{
        background: "var(--bg-sidebar)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Diff stats */}
      {diffStats && (
        <div className="flex items-center gap-2 mr-2 text-[11px]">
          <span style={{ color: "#4ec9b0" }}>+{diffStats.added}</span>
          <span style={{ color: "#f44747" }}>-{diffStats.removed}</span>
        </div>
      )}

      {/* Navigation (optional, for multi-chunk diffs) */}
      <button
        className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
        title="Previous change"
      >
        <ChevronUp size={14} style={{ color: "var(--text-secondary)" }} />
      </button>
      <button
        className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
        title="Next change"
      >
        <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
      </button>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      {/* Reject */}
      <button
        onClick={rejectSuggestion}
        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium hover:opacity-80 transition-opacity"
        style={{
          background: "rgba(244, 71, 71, 0.15)",
          color: "#f44747",
          border: "1px solid rgba(244, 71, 71, 0.3)",
        }}
        title="Reject (Esc)"
      >
        <X size={12} /> Reject
      </button>

      {/* Accept */}
      <button
        onClick={acceptSuggestion}
        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium hover:opacity-80 transition-opacity"
        style={{
          background: "rgba(78, 201, 176, 0.15)",
          color: "#4ec9b0",
          border: "1px solid rgba(78, 201, 176, 0.3)",
        }}
        title="Accept (⌘+Enter)"
      >
        <Check size={12} /> Accept
      </button>
    </div>
  );
}

/** Simple line-level diff: which lines are added/removed in the suggested code */
function computeLineDiff(
  original: string,
  suggested: string
): { added: number[]; removed: number[] } {
  const origLines = original.split("\n");
  const sugLines = suggested.split("\n");
  const added: number[] = [];
  const removed: number[] = [];

  // Simple LCS-based diff
  const lcs = buildLCS(origLines, sugLines);
  let oi = 0, si = 0, li = 0;

  while (oi < origLines.length || si < sugLines.length) {
    if (li < lcs.length && oi < origLines.length && si < sugLines.length && origLines[oi] === lcs[li] && sugLines[si] === lcs[li]) {
      oi++; si++; li++;
    } else if (si < sugLines.length && (li >= lcs.length || sugLines[si] !== lcs[li])) {
      added.push(si + 1); // 1-indexed
      si++;
    } else if (oi < origLines.length && (li >= lcs.length || origLines[oi] !== lcs[li])) {
      // removed line — mark at current suggested position
      removed.push(si + 1);
      oi++;
    }
  }

  return { added, removed };
}

function buildLCS(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  // Optimize for large files — skip if too big
  if (m * n > 1000000) {
    // Fallback: just return common prefix + suffix
    const result: string[] = [];
    let i = 0;
    while (i < m && i < n && a[i] === b[i]) { result.push(a[i]); i++; }
    return result;
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}

function computeDiffStats(original: string, suggested: string): { added: number; removed: number } {
  const { added, removed } = computeLineDiff(original, suggested);
  return { added: added.length, removed: removed.length };
}
