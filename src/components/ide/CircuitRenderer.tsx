"use client";

import React, { useCallback } from "react";
import { CircuitModel, getGateColor, getGateLabel, MULTI_QUBIT_GATES } from "@/lib/circuit/types";

const WIRE_Y_START = 40;
const WIRE_SPACING = 50;
const GATE_WIDTH = 36;
const GATE_HEIGHT = 36;
const COL_WIDTH = 56;
const LABEL_WIDTH = 50;

interface Props {
  circuit: CircuitModel;
  onDropGate?: (gateType: string, qubit: number) => void;
}

export function CircuitRenderer({ circuit, onDropGate }: Props) {
  const { numQubits, gates } = circuit;

  // Assign time slots: simple sequential for now
  // Group gates that don't overlap qubits into same slot
  const slots: number[] = [];
  const slotOccupied: Set<number>[] = [];

  for (const gate of gates) {
    let assigned = false;
    for (let s = 0; s < slotOccupied.length; s++) {
      const hasConflict = gate.qubits.some(q => slotOccupied[s].has(q));
      if (!hasConflict) {
        slots.push(s);
        gate.qubits.forEach(q => slotOccupied[s].add(q));
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      slots.push(slotOccupied.length);
      slotOccupied.push(new Set(gate.qubits));
    }
  }

  const numSlots = Math.max(slotOccupied.length, 1);
  const svgWidth = LABEL_WIDTH + numSlots * COL_WIDTH + 40;
  const svgHeight = WIRE_Y_START + (numQubits - 1) * WIRE_SPACING + 40;

  const wireY = (q: number) => WIRE_Y_START + q * WIRE_SPACING;
  const slotX = (s: number) => LABEL_WIDTH + s * COL_WIDTH + COL_WIDTH / 2;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const gateType = e.dataTransfer.getData("gate-type");
    if (!gateType || !onDropGate) return;

    const svg = (e.target as Element).closest("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // Scale from client coords to SVG coords
    const scaleY = svgHeight / rect.height;
    const svgY = y * scaleY;
    // Find closest qubit wire
    let closest = 0;
    let minDist = Infinity;
    for (let q = 0; q < numQubits; q++) {
      const dist = Math.abs(svgY - wireY(q));
      if (dist < minDist) { minDist = dist; closest = q; }
    }
    onDropGate(gateType, closest);
  }, [onDropGate, numQubits, svgHeight]);

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full"
      style={{ minWidth: svgWidth, minHeight: 100 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Qubit labels and wires */}
      {Array.from({ length: numQubits }, (_, q) => (
        <g key={`wire-${q}`}>
          <text
            x={10}
            y={wireY(q) + 4}
            fill="#cccccc"
            fontSize="12"
            fontFamily="monospace"
          >
            q{String.fromCharCode(8320 + q)}
          </text>
          <line
            x1={LABEL_WIDTH}
            y1={wireY(q)}
            x2={svgWidth - 10}
            y2={wireY(q)}
            stroke="#858585"
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Gates */}
      {gates.map((gate, i) => {
        const sx = slotX(slots[i]);
        const color = getGateColor(gate.type);
        const label = getGateLabel(gate.type);
        const t = gate.type.toLowerCase();

        // Barrier
        if (t === 'barrier') {
          return (
            <g key={i}>
              {gate.qubits.map(q => (
                <line
                  key={q}
                  x1={sx}
                  y1={wireY(q) - GATE_HEIGHT / 2}
                  x2={sx}
                  y2={wireY(q) + GATE_HEIGHT / 2}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              ))}
              <title>Barrier</title>
            </g>
          );
        }

        // Measurement
        if (t === 'measure') {
          const q = gate.qubits[0];
          const y = wireY(q);
          return (
            <g key={i}>
              <rect
                x={sx - GATE_WIDTH / 2}
                y={y - GATE_HEIGHT / 2}
                width={GATE_WIDTH}
                height={GATE_HEIGHT}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                rx="2"
              />
              <path
                d={`M${sx - 10} ${y + 8} Q${sx} ${y - 8} ${sx + 10} ${y + 8}`}
                fill="none"
                stroke={color}
                strokeWidth="1.2"
              />
              <line
                x1={sx}
                y1={y + 6}
                x2={sx + 8}
                y2={y - 10}
                stroke={color}
                strokeWidth="1.2"
              />
              <title>Measure qubit {q}</title>
            </g>
          );
        }

        // CX (CNOT)
        if (t === 'cx' && gate.qubits.length >= 2) {
          const [control, target] = gate.qubits;
          const cy = wireY(control);
          const ty = wireY(target);
          return (
            <g key={i}>
              <line x1={sx} y1={cy} x2={sx} y2={ty} stroke={color} strokeWidth="1.5" />
              <circle cx={sx} cy={cy} r={5} fill={color} />
              <circle cx={sx} cy={ty} r={12} fill="none" stroke={color} strokeWidth="1.5" />
              <line x1={sx - 12} y1={ty} x2={sx + 12} y2={ty} stroke={color} strokeWidth="1.5" />
              <line x1={sx} y1={ty - 12} x2={sx} y2={ty + 12} stroke={color} strokeWidth="1.5" />
              <title>CX (CNOT) control={control} target={target}</title>
            </g>
          );
        }

        // CZ
        if (t === 'cz' && gate.qubits.length >= 2) {
          const [q0, q1] = gate.qubits;
          return (
            <g key={i}>
              <line x1={sx} y1={wireY(q0)} x2={sx} y2={wireY(q1)} stroke={color} strokeWidth="1.5" />
              <circle cx={sx} cy={wireY(q0)} r={5} fill={color} />
              <circle cx={sx} cy={wireY(q1)} r={5} fill={color} />
              <title>CZ q{q0}, q{q1}</title>
            </g>
          );
        }

        // SWAP
        if (t === 'swap' && gate.qubits.length >= 2) {
          const [q0, q1] = gate.qubits;
          const drawX = (cy: number) => (
            <>
              <line x1={sx - 6} y1={cy - 6} x2={sx + 6} y2={cy + 6} stroke={color} strokeWidth="1.5" />
              <line x1={sx + 6} y1={cy - 6} x2={sx - 6} y2={cy + 6} stroke={color} strokeWidth="1.5" />
            </>
          );
          return (
            <g key={i}>
              <line x1={sx} y1={wireY(q0)} x2={sx} y2={wireY(q1)} stroke={color} strokeWidth="1.5" />
              {drawX(wireY(q0))}
              {drawX(wireY(q1))}
              <title>SWAP q{q0}, q{q1}</title>
            </g>
          );
        }

        // Multi-qubit gates (CCX etc.) - draw box spanning
        if (MULTI_QUBIT_GATES.includes(t) && gate.qubits.length > 1) {
          const minQ = Math.min(...gate.qubits);
          const maxQ = Math.max(...gate.qubits);
          return (
            <g key={i}>
              <line x1={sx} y1={wireY(minQ)} x2={sx} y2={wireY(maxQ)} stroke={color} strokeWidth="1.5" />
              {gate.qubits.map((q, qi) => (
                <g key={qi}>
                  <rect
                    x={sx - GATE_WIDTH / 2}
                    y={wireY(q) - GATE_HEIGHT / 2}
                    width={GATE_WIDTH}
                    height={GATE_HEIGHT}
                    fill="#1e1e2e"
                    stroke={color}
                    strokeWidth="1.5"
                    rx="2"
                  />
                  <text
                    x={sx}
                    y={wireY(q) + 4}
                    fill={color}
                    fontSize="11"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                </g>
              ))}
              <title>{label} q{gate.qubits.join(', q')}</title>
            </g>
          );
        }

        // Default: single qubit gate box
        const q = gate.qubits[0] ?? 0;
        const y = wireY(q);
        const paramStr = gate.params?.length ? `(${gate.params.map(p => p.toFixed(2)).join(', ')})` : '';
        return (
          <g key={i}>
            <rect
              x={sx - GATE_WIDTH / 2}
              y={y - GATE_HEIGHT / 2}
              width={GATE_WIDTH}
              height={GATE_HEIGHT}
              fill="#1e1e2e"
              stroke={color}
              strokeWidth="1.5"
              rx="2"
            />
            <text
              x={sx}
              y={y + 5}
              fill={color}
              fontSize="14"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {label}
            </text>
            <title>{label}{paramStr} on qubit {q}</title>
          </g>
        );
      })}
    </svg>
  );
}
