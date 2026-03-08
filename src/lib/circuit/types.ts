export interface CircuitGate {
  type: string;
  qubits: number[];
  params?: number[];
  label?: string;
}

export interface CircuitModel {
  numQubits: number;
  numBits: number;
  gates: CircuitGate[];
}

export const GATE_COLORS: Record<string, string> = {
  h: '#4ec9b0',
  s: '#4ec9b0',
  t: '#4ec9b0',
  x: '#ce9178',
  y: '#ce9178',
  z: '#ce9178',
  cx: '#569cd6',
  cz: '#569cd6',
  ccx: '#569cd6',
  swap: '#569cd6',
  cp: '#569cd6',
  rx: '#c586c0',
  ry: '#c586c0',
  rz: '#c586c0',
  measure: '#dcdcaa',
  barrier: '#858585',
};

export function getGateColor(type: string): string {
  return GATE_COLORS[type.toLowerCase()] ?? '#d4d4d4';
}

export function getGateLabel(type: string): string {
  const labels: Record<string, string> = {
    h: 'H', x: 'X', y: 'Y', z: 'Z', s: 'S', t: 'T',
    cx: 'CX', cz: 'CZ', ccx: 'CCX', swap: 'SWAP', cp: 'CP',
    rx: 'RX', ry: 'RY', rz: 'RZ',
    measure: 'M', barrier: '┆',
  };
  return labels[type.toLowerCase()] ?? type.toUpperCase();
}

export const SINGLE_QUBIT_GATES = ['h', 'x', 'y', 'z', 's', 't', 'rx', 'ry', 'rz'];
export const TWO_QUBIT_GATES = ['cx', 'cz', 'swap', 'cp'];
export const THREE_QUBIT_GATES = ['ccx'];
export const MULTI_QUBIT_GATES = [...TWO_QUBIT_GATES, ...THREE_QUBIT_GATES];
