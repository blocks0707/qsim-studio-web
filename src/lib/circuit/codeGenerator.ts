import { SINGLE_QUBIT_GATES, TWO_QUBIT_GATES } from './types';

export function generateGateCode(
  gateType: string,
  targetQubit: number,
  varName: string = 'qc',
): string {
  const t = gateType.toLowerCase();

  if (SINGLE_QUBIT_GATES.includes(t)) {
    if (['rx', 'ry', 'rz'].includes(t)) {
      return `${varName}.${t}(3.14159, ${targetQubit})`;
    }
    return `${varName}.${t}(${targetQubit})`;
  }

  if (TWO_QUBIT_GATES.includes(t)) {
    const other = targetQubit === 0 ? 1 : 0;
    if (t === 'cp') {
      return `${varName}.cp(3.14159, ${targetQubit}, ${other})`;
    }
    return `${varName}.${t}(${targetQubit}, ${other})`;
  }

  if (t === 'ccx') {
    const q1 = targetQubit === 0 ? 1 : 0;
    const q2 = targetQubit <= 1 ? 2 : 1;
    return `${varName}.ccx(${targetQubit}, ${q1}, ${q2})`;
  }

  if (t === 'measure') {
    return `${varName}.measure(${targetQubit}, ${targetQubit})`;
  }

  if (t === 'barrier') {
    return `${varName}.barrier()`;
  }

  return `${varName}.${t}(${targetQubit})`;
}

/**
 * Find the variable name used for QuantumCircuit in the code.
 */
export function findCircuitVar(code: string): string {
  const match = code.match(/(\w+)\s*=\s*QuantumCircuit/);
  return match ? match[1] : 'qc';
}

/**
 * Find the line number (0-indexed) of the last gate call.
 */
export function findLastGateLine(code: string, varName: string): number {
  const lines = code.split('\n');
  const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const gatePattern = new RegExp(`^\\s*${escaped}\\.(h|x|y|z|s|t|cx|cz|ccx|swap|cp|rx|ry|rz|measure|barrier)`);
  let lastLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (gatePattern.test(lines[i])) {
      lastLine = i;
    }
  }
  return lastLine;
}
