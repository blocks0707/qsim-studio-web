import { CircuitModel, CircuitGate } from './types';

export function parseCode(code: string): CircuitModel | null {
  // Try Python/Qiskit first, then QASM
  return parsePython(code) ?? parseQASM(code);
}

function parsePython(code: string): CircuitModel | null {
  // Simple variable resolver: scan for `name = <integer>` or `name = <expr>` assignments
  const varValues = new Map<string, number>();
  for (const m of code.matchAll(/^[ \t]*(\w+)\s*=\s*(\d+)\s*$/gm)) {
    varValues.set(m[1], parseInt(m[2], 10));
  }
  // Resolve function parameters: def func(param1, param2) ... func(val1, val2)
  // Maps param names to values from the LAST call site found
  for (const funcDef of code.matchAll(/^[ \t]*def\s+(\w+)\s*\(([^)]*)\)/gm)) {
    const funcName = funcDef[1];
    const params = funcDef[2].split(',').map(p => {
      // Strip type hints and defaults: "n_qubits: int" → "n_qubits"
      const name = p.split(':')[0].split('=')[0].trim();
      return name;
    }).filter(Boolean);
    // Find calls to this function: result = func(arg1, arg2) or just func(arg1, arg2)
    const callRegex = new RegExp(`(?:^|\\n)[ \\t]*(?:\\w+\\s*=\\s*)?${funcName}\\s*\\(([^)]+)\\)`, 'g');
    for (const call of code.matchAll(callRegex)) {
      const args = call[1].split(',').map(a => a.trim().replace(/["']/g, ''));
      for (let i = 0; i < Math.min(params.length, args.length); i++) {
        if (params[i] && !varValues.has(params[i])) {
          const val = parseInt(args[i], 10);
          if (!isNaN(val)) varValues.set(params[i], val);
          else if (varValues.has(args[i])) varValues.set(params[i], varValues.get(args[i])!);
        }
      }
    }
  }

  // Also resolve simple expressions: n + 1, 2 * n, n_count + 4
  for (const m of code.matchAll(/^[ \t]*(\w+)\s*=\s*(\w+)\s*([+\-*])\s*(\d+)\s*$/gm)) {
    const base = varValues.get(m[2]);
    if (base !== undefined) {
      const op = m[3], val = parseInt(m[4], 10);
      if (op === '+') varValues.set(m[1], base + val);
      else if (op === '-') varValues.set(m[1], base - val);
      else if (op === '*') varValues.set(m[1], base * val);
    }
  }

  // Resolve a token to a number: literal or variable lookup
  function resolveNum(token: string): number | null {
    const trimmed = token.trim();
    const lit = parseInt(trimmed, 10);
    if (!isNaN(lit)) return lit;
    // Check simple expressions inline: n + 1, n * 2
    const exprMatch = trimmed.match(/^(\w+)\s*([+\-*])\s*(\d+)$/);
    if (exprMatch) {
      const base = varValues.get(exprMatch[1]);
      if (base !== undefined) {
        const val = parseInt(exprMatch[3], 10);
        if (exprMatch[2] === '+') return base + val;
        if (exprMatch[2] === '-') return base - val;
        if (exprMatch[2] === '*') return base * val;
      }
    }
    return varValues.get(trimmed) ?? null;
  }

  // Find ALL QuantumCircuit declarations — supports literals AND variables
  const qcMatches = [...code.matchAll(/(\w+)\s*=\s*QuantumCircuit\s*\(\s*([^)]+)\)/g)];
  if (qcMatches.length === 0) return null;

  let numQubits = 0;
  let numBits = 0;
  const varNames = new Set<string>();

  for (const m of qcMatches) {
    varNames.add(m[1]);
    const args = m[2].split(',').map(a => a.trim()).filter(a => !a.includes('='));
    const q = resolveNum(args[0]);
    const b = args[1] ? resolveNum(args[1]) : 0;
    if (q !== null && q > numQubits) {
      numQubits = q;
      numBits = b ?? 0;
    }
  }

  const gates: CircuitGate[] = [];

  // Build a combined regex pattern for all variable names
  const escapedNames = [...varNames].map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const varPattern = escapedNames.join('|');

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    // Check if line contains any of our variable names with a dot call
    if (!escapedNames.some(n => trimmed.includes(n + '.'))) continue;

    // Single qubit gates: qc.h(0), qc.x(1), qc.h(n_qubits - 1)
    const singleMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.(h|x|y|z|s|t)\\s*\\(\\s*([^),]+)\\s*\\)`));
    if (singleMatch && !singleMatch[2].includes('range')) {
      const q = resolveNum(singleMatch[2]);
      if (q !== null && q >= 0 && q < numQubits) {
        gates.push({ type: singleMatch[1], qubits: [q] });
        continue;
      }
    }

    // Rotation gates: qc.rx(angle, qubit)
    const rotMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.(rx|ry|rz)\\s*\\(\\s*([^,]+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (rotMatch) {
      const angle = parseFloat(rotMatch[2]);
      gates.push({
        type: rotMatch[1],
        qubits: [parseInt(rotMatch[3], 10)],
        params: [isNaN(angle) ? 0 : angle],
      });
      continue;
    }

    // CP gate: qc.cp(angle, control, target)
    const cpMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.cp\\s*\\(\\s*[^,]+\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (cpMatch) {
      gates.push({ type: 'cp', qubits: [parseInt(cpMatch[1], 10), parseInt(cpMatch[2], 10)] });
      continue;
    }

    // CX/CZ/SWAP: qc.cx(0, 1), qc.cx(i, n_qubits)
    const twoMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.(cx|cz|swap)\\s*\\(\\s*([^,]+)\\s*,\\s*([^)]+)\\s*\\)`));
    if (twoMatch) {
      const q0 = resolveNum(twoMatch[2]);
      const q1 = resolveNum(twoMatch[3]);
      if (q0 !== null && q1 !== null && q0 >= 0 && q1 >= 0) {
        gates.push({ type: twoMatch[1], qubits: [q0, q1] });
        continue;
      }
    }

    // MCX: qc.mcx([0,1,...], target)
    const mcxMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.mcx\\s*\\(\\s*\\[([^\\]]+)\\]\\s*,\\s*(\\d+)\\s*\\)`));
    if (mcxMatch) {
      const controls = mcxMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      const target = parseInt(mcxMatch[2], 10);
      gates.push({ type: 'ccx', qubits: [...controls, target] });
      continue;
    }

    // CCX: qc.ccx(0, 1, 2)
    const ccxMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.ccx\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (ccxMatch) {
      gates.push({ type: 'ccx', qubits: [parseInt(ccxMatch[1], 10), parseInt(ccxMatch[2], 10), parseInt(ccxMatch[3], 10)] });
      continue;
    }

    // Measure: qc.measure([0,1], [0,1]) or qc.measure(0, 0)
    const measureArrayMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.measure\\s*\\(\\s*\\[([^\\]]+)\\]`));
    if (measureArrayMatch) {
      const qubits = measureArrayMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      for (const q of qubits) {
        gates.push({ type: 'measure', qubits: [q] });
      }
      continue;
    }
    const measureSingleMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.measure\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`));
    if (measureSingleMatch) {
      gates.push({ type: 'measure', qubits: [parseInt(measureSingleMatch[1], 10)] });
      continue;
    }

    // measure(range(n), range(n)) pattern
    const measureRangeMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.measure\\s*\\(\\s*range\\s*\\(\\s*([^)]+)\\s*\\)\\s*,\\s*range\\s*\\(\\s*([^)]+)\\s*\\)\\s*\\)`));
    if (measureRangeMatch) {
      const n = resolveNum(measureRangeMatch[1]);
      if (n !== null && n > 0) {
        for (let i = 0; i < Math.min(n, numQubits); i++) {
          gates.push({ type: 'measure', qubits: [i] });
        }
        continue;
      }
    }

    // Barrier: qc.barrier()
    if (new RegExp(`(?:${varPattern})\\.barrier`).test(trimmed)) {
      gates.push({ type: 'barrier', qubits: Array.from({ length: numQubits }, (_, i) => i) });
      continue;
    }

    // h(range(n)) pattern — supports literals and variables
    const rangeMatch = trimmed.match(new RegExp(`(?:${varPattern})\\.(h|x|y|z|s|t)\\s*\\(\\s*range\\s*\\(\\s*([^)]+)\\s*\\)\\s*\\)`));
    if (rangeMatch) {
      const n = resolveNum(rangeMatch[2]);
      if (n !== null && n > 0 && n <= numQubits) {
        for (let i = 0; i < n; i++) {
          gates.push({ type: rangeMatch[1], qubits: [i] });
        }
        continue;
      }
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
