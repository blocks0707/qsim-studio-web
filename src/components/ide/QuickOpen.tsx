"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useIDEStore } from "@/stores/ideStore";
import { FileCode, FileText, Folder } from "lucide-react";
import type { FSNode } from "@/lib/filesystem";

function FileIcon({ name }: { name: string }) {
  if (name.endsWith(".py")) return <FileCode size={14} className="text-[#519aba] flex-shrink-0" />;
  if (name.endsWith(".qasm")) return <FileCode size={14} className="text-[#e37933] flex-shrink-0" />;
  if (name.endsWith(".json")) return <FileText size={14} className="text-[#cbcb41] flex-shrink-0" />;
  return <FileText size={14} className="text-[#a0a0a0] flex-shrink-0" />;
}

/** Fuzzy match: check if all chars of query appear in order in target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Consecutive match bonus
      score += (lastIdx === ti - 1) ? 2 : 1;
      // Start-of-word bonus
      if (ti === 0 || t[ti - 1] === "/" || t[ti - 1] === "." || t[ti - 1] === "-" || t[ti - 1] === "_") {
        score += 3;
      }
      lastIdx = ti;
      qi++;
    }
  }

  return { match: qi === q.length, score };
}

export function QuickOpen() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const files = useIDEStore((s) => s.files);
  const openFileInEditor = useIDEStore((s) => s.openFileInEditor);

  // ⌘P / Ctrl+P to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setOpen(true);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filter & rank files
  const results = useMemo(() => {
    const fileNodes = files.filter((f) => f.type === "file");
    if (!query.trim()) return fileNodes.slice(0, 20);

    return fileNodes
      .map((f) => {
        const nameMatch = fuzzyMatch(query, f.name);
        const pathMatch = fuzzyMatch(query, f.path);
        const best = nameMatch.score >= pathMatch.score ? nameMatch : pathMatch;
        return { file: f, ...best };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.file)
      .slice(0, 20);
  }, [files, query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectFile = (file: FSNode) => {
    openFileInEditor(file);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) selectFile(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: "var(--bg-panel, #252526)",
          border: "1px solid var(--border)",
          maxHeight: "50vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            ref={inputRef}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search files by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: "calc(50vh - 44px)" }}>
          {results.length === 0 ? (
            <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
              No matching files
            </div>
          ) : (
            results.map((file, i) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                style={{
                  background: i === selectedIndex ? "rgba(255,255,255,0.08)" : undefined,
                }}
                onClick={() => selectFile(file)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <FileIcon name={file.name} />
                <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {file.name}
                </span>
                <span className="text-xs truncate ml-auto" style={{ color: "var(--text-secondary)" }}>
                  {file.path}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="px-3 py-1.5 text-[10px] flex items-center gap-3"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
