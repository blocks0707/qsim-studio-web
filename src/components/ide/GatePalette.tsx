"use client";

import React, { useCallback } from "react";
import { getGateColor } from "@/lib/circuit/types";

const PALETTE_GATES = [
  'H', 'X', 'Y', 'Z', 'S', 'T',
  'CX', 'CZ', 'SWAP',
  'RX', 'RY', 'RZ',
  'Measure',
];

export function GatePalette() {
  const handleDragStart = useCallback((e: React.DragEvent, gate: string) => {
    e.dataTransfer.setData("gate-type", gate.toLowerCase());
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      {PALETTE_GATES.map((gate) => {
        const color = getGateColor(gate);
        return (
          <div
            key={gate}
            draggable
            onDragStart={(e) => handleDragStart(e, gate)}
            className="cursor-grab active:cursor-grabbing select-none"
            title={`Drag ${gate} gate onto circuit`}
            style={{
              border: `1px solid ${color}`,
              color,
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              background: 'transparent',
              lineHeight: '16px',
            }}
          >
            {gate}
          </div>
        );
      })}
    </div>
  );
}
