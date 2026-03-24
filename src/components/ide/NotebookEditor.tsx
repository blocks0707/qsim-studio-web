"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Square,
  Code,
  FileText,
  Loader2,
} from "lucide-react";
import {
  type Notebook,
  type NotebookCell,
  type CellOutput,
  getCellSource,
  setCellSource,
  createCell,
} from "@/lib/notebook";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then(m => m.default), {
  ssr: false,
  loading: () => <div style={{ height: 32, background: "transparent" }} />,
});

interface NotebookEditorProps {
  notebook: Notebook;
  onChange: (nb: Notebook) => void;
  onExecuteCell?: (cellId: string, code: string) => Promise<CellOutput[]>;
}

function CellOutputView({ output }: { output: CellOutput }) {
  switch (output.output_type) {
    case "stream":
      return (
        <pre
          className="text-xs font-mono whitespace-pre-wrap px-3 py-1"
          style={{ color: output.name === "stderr" ? "#f44747" : "#d4d4d4" }}
        >
          {output.text.join("")}
        </pre>
      );
    case "execute_result":
    case "display_data": {
      const data = output.data;
      // Image
      if (data["image/png"]) {
        return <img src={`data:image/png;base64,${data["image/png"]}`} alt="output" className="max-w-full px-3 py-1" />;
      }
      if (data["image/svg+xml"]) {
        return <div className="px-3 py-1" dangerouslySetInnerHTML={{ __html: data["image/svg+xml"] as string }} />;
      }
      // HTML
      if (data["text/html"]) {
        return <div className="px-3 py-1 text-xs" dangerouslySetInnerHTML={{ __html: (data["text/html"] as string[]).join("") }} />;
      }
      // Plain text
      if (data["text/plain"]) {
        const text = Array.isArray(data["text/plain"]) ? (data["text/plain"] as string[]).join("") : data["text/plain"] as string;
        return <pre className="text-xs font-mono whitespace-pre-wrap px-3 py-1" style={{ color: "#d4d4d4" }}>{text}</pre>;
      }
      return null;
    }
    case "error":
      return (
        <pre className="text-xs font-mono whitespace-pre-wrap px-3 py-1" style={{ color: "#f44747" }}>
          {output.traceback?.length ? output.traceback.join("\n") : `${output.ename}: ${output.evalue}`}
        </pre>
      );
    default:
      return null;
  }
}

function MarkdownCell({ source }: { source: string }) {
  // Simple markdown rendering (bold, italic, headers, code)
  const html = source
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-2">$1</h1>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-[11px]" style="background:rgba(255,255,255,0.08);color:#ce9178">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");

  return (
    <div
      className="px-3 py-2 text-xs leading-relaxed"
      style={{ color: "var(--text-primary)" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function CellEditor({
  cell,
  index,
  isSelected,
  isExecuting,
  onSelect,
  onSourceChange,
  onExecute,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleType,
}: {
  cell: NotebookCell;
  index: number;
  isSelected: boolean;
  isExecuting: boolean;
  onSelect: () => void;
  onSourceChange: (text: string) => void;
  onExecute: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleType: () => void;
}) {
  const source = getCellSource(cell);
  const isCode = cell.cell_type === "code";
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Line count for dynamic height (Monaco)
  const lineCount = useMemo(() => Math.max((source.split("\n").length), 1), [source]);
  const editorHeight = Math.max(lineCount * 19 + 10, 38); // 19px per line + padding

  // Auto-resize textarea (markdown editing)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [source, editing]);

  return (
    <div
      className="group relative mb-1"
      style={{
        borderLeft: `3px solid ${isSelected ? "#569cd6" : "transparent"}`,
      }}
      onClick={onSelect}
    >
      <div className="flex">
        {/* Execution count / cell type indicator */}
        <div
          className="w-16 flex-shrink-0 flex items-start justify-end pr-2 pt-2 text-[11px] font-mono select-none"
          style={{ color: "var(--text-secondary)" }}
        >
          {isCode ? (
            isExecuting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              `[${cell.execution_count ?? " "}]`
            )
          ) : (
            <FileText size={12} />
          )}
        </div>

        {/* Cell content */}
        <div className="flex-1 min-w-0">
          {/* Source editor */}
          {isCode ? (
            <div style={{ height: editorHeight }} className="rounded overflow-hidden">
              <MonacoEditor
                height={editorHeight}
                language="python"
                theme="vs-dark"
                value={source}
                onChange={(v) => onSourceChange(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "off",
                  glyphMargin: false,
                  folding: false,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 0,
                  renderLineHighlight: "none",
                  scrollbar: { vertical: "hidden", horizontal: "auto", handleMouseWheel: false },
                  overviewRulerLanes: 0,
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  wordWrap: "on",
                  fontSize: 12,
                  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  padding: { top: 4, bottom: 4 },
                  automaticLayout: true,
                  tabSize: 4,
                  contextmenu: false,
                }}
              />
            </div>
          ) : editing ? (
            <textarea
              ref={textareaRef}
              className="w-full resize-none font-mono text-xs leading-5 p-2 rounded outline-none"
              style={{
                background: isSelected ? "rgba(255,255,255,0.04)" : "transparent",
                color: "var(--text-primary)",
                border: "none",
                minHeight: 32,
              }}
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.shiftKey || e.ctrlKey)) {
                  e.preventDefault();
                  onExecute();
                }
              }}
              onFocus={() => setEditing(true)}
              spellCheck={false}
              placeholder="Enter markdown..."
            />
          ) : (
            <div
              className="cursor-text rounded px-1"
              style={{ background: isSelected ? "rgba(255,255,255,0.02)" : "transparent" }}
              onDoubleClick={() => setEditing(true)}
            >
              <MarkdownCell source={source} />
            </div>
          )}

          {/* Outputs (code cells only) */}
          {isCode && cell.outputs && cell.outputs.length > 0 && (
            <div
              className="rounded-b mt-0.5 mb-1 overflow-x-auto"
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}
            >
              {cell.outputs.map((output, i) => (
                <CellOutputView key={i} output={output} />
              ))}
            </div>
          )}
        </div>

        {/* Cell toolbar — shown on hover or when selected */}
        <div
          className="flex-shrink-0 flex flex-col gap-0.5 px-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: isSelected ? 1 : undefined }}
        >
          {isCode && (
            <button
              className="p-1 rounded hover:bg-white/10"
              title="Run cell (Shift+Enter)"
              onClick={(e) => { e.stopPropagation(); onExecute(); }}
              disabled={isExecuting}
            >
              {isExecuting ? <Square size={12} style={{ color: "#f44747" }} /> : <Play size={12} style={{ color: "#4ec9b0" }} />}
            </button>
          )}
          <button className="p-1 rounded hover:bg-white/10" title="Move up" onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
            <ChevronUp size={12} style={{ color: "var(--text-secondary)" }} />
          </button>
          <button className="p-1 rounded hover:bg-white/10" title="Move down" onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
            <ChevronDown size={12} style={{ color: "var(--text-secondary)" }} />
          </button>
          <button className="p-1 rounded hover:bg-white/10" title="Toggle code/markdown" onClick={(e) => { e.stopPropagation(); onToggleType(); }}>
            {isCode ? <FileText size={12} style={{ color: "var(--text-secondary)" }} /> : <Code size={12} style={{ color: "var(--text-secondary)" }} />}
          </button>
          <button className="p-1 rounded hover:bg-white/10" title="Delete cell" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={12} style={{ color: "#f44747" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotebookEditor({ notebook, onChange, onExecuteCell }: NotebookEditorProps) {
  const [selectedCellId, setSelectedCellId] = useState<string | null>(
    notebook.cells[0]?.id || null
  );
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());

  const updateCell = useCallback((cellId: string, updater: (cell: NotebookCell) => NotebookCell) => {
    onChange({
      ...notebook,
      cells: notebook.cells.map((c) => (c.id === cellId ? updater(c) : c)),
    });
  }, [notebook, onChange]);

  const handleSourceChange = useCallback((cellId: string, text: string) => {
    updateCell(cellId, (c) => setCellSource(c, text));
  }, [updateCell]);

  const handleExecute = useCallback(async (cellId: string) => {
    if (!onExecuteCell) return;
    const cell = notebook.cells.find((c) => c.id === cellId);
    if (!cell || cell.cell_type !== "code") return;

    setExecutingCells((prev) => new Set(prev).add(cellId));

    // Clear previous outputs
    updateCell(cellId, (c) => ({ ...c, outputs: [] }));

    try {
      const outputs = await onExecuteCell(cellId, getCellSource(cell));
      updateCell(cellId, (c) => ({
        ...c,
        outputs: outputs as CellOutput[],
        execution_count: (c.execution_count ?? 0) + 1,
      }));
    } catch (err) {
      updateCell(cellId, (c) => ({
        ...c,
        outputs: [{
          output_type: "error" as const,
          ename: "Error",
          evalue: err instanceof Error ? err.message : String(err),
          traceback: [],
        }],
      }));
    } finally {
      setExecutingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    }
  }, [notebook, onExecuteCell, updateCell]);

  const addCell = useCallback((afterId: string | null, type: "code" | "markdown" = "code") => {
    const newCell = createCell(type);
    const cells = [...notebook.cells];
    if (afterId) {
      const idx = cells.findIndex((c) => c.id === afterId);
      cells.splice(idx + 1, 0, newCell);
    } else {
      cells.push(newCell);
    }
    onChange({ ...notebook, cells });
    setSelectedCellId(newCell.id);
  }, [notebook, onChange]);

  const deleteCell = useCallback((cellId: string) => {
    if (notebook.cells.length <= 1) return; // Keep at least one cell
    const cells = notebook.cells.filter((c) => c.id !== cellId);
    onChange({ ...notebook, cells });
    if (selectedCellId === cellId) {
      setSelectedCellId(cells[0]?.id || null);
    }
  }, [notebook, onChange, selectedCellId]);

  const moveCell = useCallback((cellId: string, direction: -1 | 1) => {
    const idx = notebook.cells.findIndex((c) => c.id === cellId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= notebook.cells.length) return;
    const cells = [...notebook.cells];
    [cells[idx], cells[newIdx]] = [cells[newIdx], cells[idx]];
    onChange({ ...notebook, cells });
  }, [notebook, onChange]);

  const toggleCellType = useCallback((cellId: string) => {
    updateCell(cellId, (c) => ({
      ...c,
      cell_type: c.cell_type === "code" ? "markdown" : "code",
      outputs: c.cell_type === "code" ? undefined : [],
      execution_count: c.cell_type === "code" ? undefined : null,
    }));
  }, [updateCell]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}
      >
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-white/10"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => addCell(selectedCellId, "code")}
        >
          <Plus size={12} /> Code
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-white/10"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => addCell(selectedCellId, "markdown")}
        >
          <Plus size={12} /> Markdown
        </button>
        <div className="flex-1" />
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          {notebook.cells.length} cells · {notebook.metadata.kernelspec?.display_name || "Python 3"}
        </span>
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto py-2" style={{ background: "var(--bg-editor)" }}>
        {notebook.cells.map((cell, index) => (
          <CellEditor
            key={cell.id}
            cell={cell}
            index={index}
            isSelected={cell.id === selectedCellId}
            isExecuting={executingCells.has(cell.id)}
            onSelect={() => setSelectedCellId(cell.id)}
            onSourceChange={(text) => handleSourceChange(cell.id, text)}
            onExecute={() => handleExecute(cell.id)}
            onDelete={() => deleteCell(cell.id)}
            onMoveUp={() => moveCell(cell.id, -1)}
            onMoveDown={() => moveCell(cell.id, 1)}
            onToggleType={() => toggleCellType(cell.id)}
          />
        ))}

        {/* Add cell button at bottom */}
        <div className="flex justify-center py-2">
          <button
            className="flex items-center gap-1 px-3 py-1 rounded text-[11px] hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-secondary)", border: "1px dashed var(--border)" }}
            onClick={() => addCell(notebook.cells[notebook.cells.length - 1]?.id || null)}
          >
            <Plus size={12} /> Add Cell
          </button>
        </div>
      </div>
    </div>
  );
}
