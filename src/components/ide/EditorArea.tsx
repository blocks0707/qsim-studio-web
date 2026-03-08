"use client";

import { TabBar } from "./TabBar";
import { useIDEStore } from "@/stores/ideStore";

const codeSnippets: Record<string, string> = {
  "bell-state": `import qiskit
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Create Bell State circuit
qc = QuantumCircuit(2, 2)
qc.h(0)          # Hadamard on qubit 0
qc.cx(0, 1)      # CNOT: qubit 0 → qubit 1
qc.measure([0, 1], [0, 1])

# Simulate
simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()

counts = result.get_counts(qc)
print("Bell State results:", counts)
# Expected: ~50% |00⟩, ~50% |11⟩`,

  grover: `import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def grover_oracle(n_qubits: int, target: int) -> QuantumCircuit:
    """Create Grover oracle for target state."""
    qc = QuantumCircuit(n_qubits)
    # Mark target state
    target_bin = format(target, f'0{n_qubits}b')
    for i, bit in enumerate(reversed(target_bin)):
        if bit == '0':
            qc.x(i)
    qc.h(n_qubits - 1)
    qc.mcx(list(range(n_qubits - 1)), n_qubits - 1)
    qc.h(n_qubits - 1)
    for i, bit in enumerate(reversed(target_bin)):
        if bit == '0':
            qc.x(i)
    return qc

# Grover search for |101⟩ (target = 5)
n = 3
grover = QuantumCircuit(n, n)
grover.h(range(n))  # Superposition`,

  qft: `from qiskit import QuantumCircuit
import numpy as np

def qft_circuit(n: int) -> QuantumCircuit:
    """Create Quantum Fourier Transform circuit."""
    qc = QuantumCircuit(n, name="QFT")
    
    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            angle = np.pi / (2 ** (j - i))
            qc.cp(angle, j, i)
    
    # Swap qubits
    for i in range(n // 2):
        qc.swap(i, n - i - 1)
    
    return qc

# Create 4-qubit QFT
qft = qft_circuit(4)
print(qft.draw())`,
};

export function EditorArea() {
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const code = activeTabId ? codeSnippets[activeTabId] : null;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-editor)" }}>
      <TabBar />
      <div className="flex-1 overflow-auto font-mono text-sm p-0">
        {code ? (
          <div className="flex">
            {/* Line numbers */}
            <div
              className="flex-shrink-0 text-right pr-4 pl-2 pt-2 select-none"
              style={{ color: "var(--text-secondary)", minWidth: "48px" }}
            >
              {code.split("\n").map((_, i) => (
                <div key={i} className="leading-6 text-xs">
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Code */}
            <pre className="pt-2 pr-4 flex-1 overflow-x-auto">
              <code className="leading-6 text-xs" style={{ color: "var(--text-primary)" }}>
                {code}
              </code>
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: "var(--text-secondary)" }}>
            <div className="text-center">
              <div className="text-4xl mb-4">⚛️</div>
              <div className="text-lg mb-2">QSim Studio</div>
              <div className="text-sm">Open a file or select an algorithm to begin</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
