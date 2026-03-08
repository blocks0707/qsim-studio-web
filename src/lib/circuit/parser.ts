import { CircuitModel, CircuitGate } from './types';

export function parseCode(code: string): CircuitModel | null {
  // Try Python/Qiskit first, then QASM
  return parsePython(code) ?? parseQASM(code);
}

function parsePython(code: string): CircuitModel | null {
  // Match QuantumCircuit(n) or QuantumCircuit(n, m)
  const qcMatch = code.match(/QuantumCircuit\s*\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/);
  if (!qcMatch) return null;

  const numQubits = parseInt(qcMatch[1], 10);
  const numBits = qcMatch[2] ? parseInt(qcMatch[2], 10) : 0;
  const gates: CircuitGate[] = [];

  // Find the variable name (e.g., qc = QuantumCircuit(...))
  const varMatch = code.match(/(\w+)\s*=\s*QuantumCircuit/);
  const varName = varMatch ? varMatch[1] : 'qc';
  const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes(escaped + '.')) continue;

    // Single qubit gates: qc.h(0), qc.x(1)
    const singleMatch = trimmed.match(new RegExp(`${escaped}\\.(h|x|y|z|s|t)\\s*\\(\\s*(\\d+)\\s*\\)`));
    if (singleMatch) {
      gates.push({ type: singleMatch[1], qubits: [parseInt(singleMatch[2], 10)] });
      continue;
    }

    // Rotation gates: qc.rx(angle, qubit)
    const rotMatch = trimmed.match(new RegExp(`${escaped}\\.(rx|ry|rz)\\s*\\(\\s*([^,]+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (rotMatch) {
      const angle = parseFloat(rotMatch[2]);
      gates.push({
        type: rotMatch[1],
        qubits: [parseInt(rotMatch[3], 10)],
        params: [isNaN(angle) ? 0 : angle],
      });
      continue;
    }

    // CX/CZ: qc.cx(0, 1)
    const twoMatch = trimmed.match(new RegExp(`${escaped}\\.(cx|cz|swap|cp)\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (twoMatch) {
      gates.push({ type: twoMatch[1], qubits: [parseInt(twoMatch[2], 10), parseInt(twoMatch[3], 10)] });
      continue;
    }

    // CCX: qc.ccx(0, 1, 2)
    const ccxMatch = trimmed.match(new RegExp(`${escaped}\\.ccx\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (ccxMatch) {
      gates.push({ type: 'ccx', qubits: [parseInt(ccxMatch[1], 10), parseInt(ccxMatch[2], 10), parseInt(ccxMatch[3], 10)] });
      continue;
    }

    // Measure: qc.measure([0,1], [0,1]) or qc.measure(0, 0)
    const measureArrayMatch = trimmed.match(new RegExp(`${escaped}\\.measure\\s*\\(\\s*\\[([^\\]]+)\\]`));
    if (measureArrayMatch) {
      const qubits = measureArrayMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      for (const q of qubits) {
        gates.push({ type: 'measure', qubits: [q] });
      }
      continue;
    }
    const measureSingleMatch = trimmed.match(new RegExp(`${escaped}\\.measure\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (measureSingleMatch) {
      gates.push({ type: 'measure', qubits: [parseInt(measureSingleMatch[1], 10)] });
      continue;
    }

    // Barrier: qc.barrier()
    if (new RegExp(`${escaped}\\.barrier`).test(trimmed)) {
      gates.push({ type: 'barrier', qubits: Array.from({ length: numQubits }, (_, i) => i) });
      continue;
    }

    // h(range(n)) pattern
    const rangeMatch = trimmed.match(new RegExp(`${escaped}\\.(h|x|y|z|s|t)\\s*\\(\\s*range\\s*\\(\\s*(\\d+)\\s*\\)\\s*\\)`));
    if (rangeMatch) {
      const n = parseInt(rangeMatch[2], 10);
      for (let i = 0; i < n; i++) {
        gates.push({ type: rangeMatch[1], qubits: [i] });
      }
      continue;
    }
  }

  return { numQubits, numBits, gates };
}

function parseQASM(code: string): CircuitModel | null {
  let numQubits = 0;
  let numBits = 0;
  const gates: CircuitGate[] = [];

  // QASM 3: qubit[n] q;
  const qubit3 = code.match(/qubit\[(\d+)\]\s+\w+/);
  // QASM 2: qreg q[n];
  const qubit2 = code.match(/qreg\s+\w+\[(\d+)\]/);
  const bit3 = code.match(/bit\[(\d+)\]\s+\w+/);
  const bit2 = code.match(/creg\s+\w+\[(\d+)\]/);

  if (qubit3) numQubits = parseInt(qubit3[1], 10);
  else if (qubit2) numQubits = parseInt(qubit2[1], 10);
  else return null;

  if (bit3) numBits = parseInt(bit3[1], 10);
  else if (bit2) numBits = parseInt(bit2[1], 10);

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim().replace(/;$/, '');
    if (trimmed.startsWith('//') || trimmed.startsWith('OPENQASM') || trimmed.startsWith('include')) continue;

    // Single qubit: h q[0]
    const sg = trimmed.match(/^(h|x|y|z|s|t)\s+\w+\[(\d+)\]/);
    if (sg) {
      gates.push({ type: sg[1], qubits: [parseInt(sg[2], 10)] });
      continue;
    }

    // Two qubit: cx q[0], q[1]
    const tg = trimmed.match(/^(cx|cz|swap)\s+\w+\[(\d+)\]\s*,\s*\w+\[(\d+)\]/);
    if (tg) {
      gates.push({ type: tg[1], qubits: [parseInt(tg[2], 10), parseInt(tg[3], 10)] });
      continue;
    }

    // Measure
    const meas = trimmed.match(/^measure\s+\w+\[(\d+)\]/);
    if (meas) {
      gates.push({ type: 'measure', qubits: [parseInt(meas[1], 10)] });
      continue;
    }

    // Barrier
    if (trimmed.startsWith('barrier')) {
      gates.push({ type: 'barrier', qubits: Array.from({ length: numQubits }, (_, i) => i) });
    }
  }

  return { numQubits, numBits, gates };
}
