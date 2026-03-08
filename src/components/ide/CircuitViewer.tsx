"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useIDEStore } from "@/stores/ideStore";
import { parseCode } from "@/lib/circuit/parser";
import { generateGateCode, findCircuitVar, findLastGateLine } from "@/lib/circuit/codeGenerator";
import { CircuitRenderer } from "./CircuitRenderer";
import { GatePalette } from "./GatePalette";
import { createClient, CircuitAnalysisResult } from "@/lib/api";
import type { CircuitModel } from "@/lib/circuit/types";

export function CircuitViewer() {
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const fileContents = useIDEStore((s) => s.fileContents);
  const code = activeTabId ? fileContents[activeTabId] ?? "" : "";

  // Debounced code for parsing
  const [debouncedCode, setDebouncedCode] = useState(code);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedCode(code), 500);
    return () => clearTimeout(timerRef.current);
  }, [code]);

  // Dry-run API call with regex fallback
  const [dryRunCircuit, setDryRunCircuit] = useState<CircuitModel | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const dryRunTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clusterUrl = useIDEStore((s) => s.apiUrl);
  const apiToken = useIDEStore((s) => s.apiToken);

  useEffect(() => {
    if (!debouncedCode || !clusterUrl || !apiToken) {
      setDryRunCircuit(null);
      return;
    }

    clearTimeout(dryRunTimer.current);
    dryRunTimer.current = setTimeout(async () => {
      setDryRunLoading(true);
      try {
        const client = createClient(clusterUrl, apiToken);
        const result: CircuitAnalysisResult = await client.analyzeCircuit(debouncedCode);
        if (result.error) {
          setDryRunCircuit(null);
        } else {
          setDryRunCircuit({
            numQubits: result.numQubits,
            numBits: result.numBits,
            gates: result.gates.map((g) => ({
              type: g.name,
              qubits: g.qubits,
              params: g.params,
            })),
          });
        }
      } catch {
        setDryRunCircuit(null);
      } finally {
        setDryRunLoading(false);
      }
    }, 200);

    return () => clearTimeout(dryRunTimer.current);
  }, [debouncedCode, clusterUrl, apiToken]);

  // Use dry-run result if available, otherwise fallback to regex parser
  const regexCircuit = useMemo(() => parseCode(debouncedCode), [debouncedCode]);
  const circuit = dryRunCircuit ?? regexCircuit;

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.max(0.3, Math.min(3, s + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setTranslate({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const fitToView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Gate drop handler — inserts code
  const handleDropGate = useCallback((gateType: string, qubit: number) => {
    if (!activeTabId) return;
    const currentCode = useIDEStore.getState().fileContents[activeTabId] ?? "";
    const varName = findCircuitVar(currentCode);
    const newLine = generateGateCode(gateType, qubit, varName);
    const lastGate = findLastGateLine(currentCode, varName);
    const lines = currentCode.split('\n');

    // Detect indentation from last gate line
    let indent = '';
    if (lastGate >= 0) {
      const match = lines[lastGate].match(/^(\s*)/);
      indent = match ? match[1] : '';
    }

    // Try Monaco editor first
    const editor = useIDEStore.getState().editorRef;
    if (editor) {
      const insertLine = lastGate >= 0 ? lastGate + 2 : lines.length + 1; // Monaco is 1-indexed
      const lineContent = lines[lastGate >= 0 ? lastGate : lines.length - 1] ?? '';
      editor.executeEdits('circuit-viewer', [{
        range: {
          startLineNumber: insertLine,
          startColumn: 1,
          endLineNumber: insertLine,
          endColumn: 1,
        },
        text: indent + newLine + '\n',
        forceMoveMarkers: true,
      }]);
    } else {
      // Fallback: directly update store
      if (lastGate >= 0) {
        lines.splice(lastGate + 1, 0, indent + newLine);
      } else {
        lines.push(newLine);
      }
      useIDEStore.getState().setFileContent(activeTabId, lines.join('\n'));
    }
  }, [activeTabId]);

  return (
    <div className="h-full flex flex-col" style={{ borderBottom: "1px solid var(--border)" }}>
      <div
        className="h-9 flex items-center px-4 text-[11px] font-semibold tracking-wider flex-shrink-0 uppercase justify-between"
        style={{ color: "var(--text-secondary)", background: "var(--bg-sidebar)" }}
      >
        <span>CIRCUIT VIEWER{dryRunLoading ? " ⟳" : dryRunCircuit ? " ✓" : ""}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="px-1.5 text-xs opacity-60 hover:opacity-100"
            title="Zoom in"
          >+</button>
          <button
            onClick={() => setScale(s => Math.max(0.3, s - 0.2))}
            className="px-1.5 text-xs opacity-60 hover:opacity-100"
            title="Zoom out"
          >−</button>
          <button
            onClick={fitToView}
            className="px-1.5 text-xs opacity-60 hover:opacity-100"
            title="Fit to view"
          >⊡</button>
        </div>
      </div>

      <GatePalette />

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: "var(--bg-editor)" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {circuit ? (
          <div
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              padding: 8,
            }}
          >
            <CircuitRenderer circuit={circuit} onDropGate={handleDropGate} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--text-secondary)" }}>
            No circuit detected
          </div>
        )}
      </div>
    </div>
  );
}
