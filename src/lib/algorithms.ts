export interface Algorithm {
  id: string;
  name: string;
  emoji: string;
  description: string;
  qubits: number;
  code: string;
}

export const algorithms: Algorithm[] = [
  {
    id: "bell-state",
    name: "Bell State",
    emoji: "🔔",
    description: "Two-qubit entanglement",
    qubits: 2,
    code: `# Bell State - 벨 상태 생성
# Creates maximally entangled two-qubit state |Φ+⟩ = (|00⟩ + |11⟩)/√2

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# 벨 상태 회로 구성
qc = QuantumCircuit(2, 2)
qc.h(0)          # Hadamard on qubit 0
qc.cx(0, 1)      # CNOT: qubit 0 → qubit 1
qc.measure([0, 1], [0, 1])

# 시뮬레이션 실행
simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()

counts = result.get_counts(qc)
print("Bell State results:", counts)
# Expected: ~50% |00⟩, ~50% |11⟩
print(qc.draw())
`,
  },
  {
    id: "ghz-state",
    name: "GHZ State",
    emoji: "👻",
    description: "Multi-qubit entanglement",
    qubits: 5,
    code: `# GHZ State - GHZ 상태 (Greenberger–Horne–Zeilinger)
# Creates n-qubit entangled state (|000...0⟩ + |111...1⟩)/√2

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

n_qubits = 5

# GHZ 회로 구성
qc = QuantumCircuit(n_qubits, n_qubits)
qc.h(0)  # 첫 번째 큐빗에 Hadamard
for i in range(n_qubits - 1):
    qc.cx(i, i + 1)  # 연쇄 CNOT
qc.measure(range(n_qubits), range(n_qubits))

# 시뮬레이션 실행
simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()

counts = result.get_counts(qc)
print(f"GHZ State ({n_qubits} qubits) results:", counts)
# Expected: ~50% |00000⟩, ~50% |11111⟩
print(qc.draw())
`,
  },
  {
    id: "qft",
    name: "QFT",
    emoji: "📊",
    description: "Quantum Fourier Transform",
    qubits: 4,
    code: `# QFT - 양자 푸리에 변환
# Quantum Fourier Transform: basis for many quantum algorithms

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def qft_circuit(n: int) -> QuantumCircuit:
    """Create Quantum Fourier Transform circuit."""
    qc = QuantumCircuit(n, name="QFT")
    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            angle = np.pi / (2 ** (j - i))
            qc.cp(angle, j, i)
    # Swap qubits for correct output order
    for i in range(n // 2):
        qc.swap(i, n - i - 1)
    return qc

# 4-큐빗 QFT 생성
n = 4
qft = qft_circuit(n)
print(f"QFT Circuit ({n} qubits):")
print(qft.draw())

# 입력 상태 |5⟩ 에 QFT 적용
full = QuantumCircuit(n, n)
full.x(0)  # |0101⟩ = |5⟩
full.x(2)
full.append(qft, range(n))
full.measure(range(n), range(n))

simulator = AerSimulator()
compiled = transpile(full, simulator)
result = simulator.run(compiled, shots=1024).result()
print("QFT results:", result.get_counts())
`,
  },
  {
    id: "grover",
    name: "Grover",
    emoji: "🔍",
    description: "Quantum search algorithm",
    qubits: 3,
    code: `# Grover's Algorithm - 그로버 탐색 알고리즘
# Quadratic speedup for unstructured search

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def grover_oracle(n_qubits: int, target: int) -> QuantumCircuit:
    """Create Grover oracle marking target state."""
    qc = QuantumCircuit(n_qubits)
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

def diffuser(n_qubits: int) -> QuantumCircuit:
    """Grover diffusion operator."""
    qc = QuantumCircuit(n_qubits)
    qc.h(range(n_qubits))
    qc.x(range(n_qubits))
    qc.h(n_qubits - 1)
    qc.mcx(list(range(n_qubits - 1)), n_qubits - 1)
    qc.h(n_qubits - 1)
    qc.x(range(n_qubits))
    qc.h(range(n_qubits))
    return qc

# |101⟩ (target = 5) 탐색
n = 3
target = 5
iterations = int(np.pi / 4 * np.sqrt(2**n))

grover = QuantumCircuit(n, n)
grover.h(range(n))  # 균일 중첩
for _ in range(iterations):
    grover.compose(grover_oracle(n, target), inplace=True)
    grover.compose(diffuser(n), inplace=True)
grover.measure(range(n), range(n))

# 시뮬레이션 실행
simulator = AerSimulator()
compiled = transpile(grover, simulator)
result = simulator.run(compiled, shots=1024).result()
print(f"Grover search for |{format(target, f'0{n}b')}⟩:", result.get_counts())
`,
  },
  {
    id: "vqe",
    name: "VQE",
    emoji: "⚡",
    description: "Variational Quantum Eigensolver",
    qubits: 2,
    code: `# VQE - 변분 양자 고유값 솔버
# Variational Quantum Eigensolver for finding ground state energy

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def ansatz(params):
    """Simple variational ansatz for H2 molecule."""
    qc = QuantumCircuit(2)
    qc.ry(params[0], 0)
    qc.ry(params[1], 1)
    qc.cx(0, 1)
    qc.ry(params[2], 0)
    qc.ry(params[3], 1)
    return qc

def measure_expectation(qc, pauli_op, simulator, shots=4096):
    """Measure expectation value of a Pauli operator."""
    meas_qc = qc.copy()
    meas_qc.add_register(qc._create_creg(2, 'c'))
    if pauli_op == 'ZZ':
        meas_qc.measure([0, 1], [0, 1])
    elif pauli_op == 'Z':
        meas_qc.measure(0, 0)
    compiled = transpile(meas_qc, simulator)
    result = simulator.run(compiled, shots=shots).result()
    counts = result.get_counts()
    exp = 0
    for bitstring, count in counts.items():
        parity = (-1) ** bitstring.count('1')
        exp += parity * count / shots
    return exp

# 간단한 최적화 루프
simulator = AerSimulator()
best_energy = float('inf')
best_params = None

np.random.seed(42)
for iteration in range(50):
    params = np.random.uniform(-np.pi, np.pi, 4)
    qc = ansatz(params)
    energy = measure_expectation(qc, 'ZZ', simulator)
    if energy < best_energy:
        best_energy = energy
        best_params = params

print(f"VQE Ground State Energy: {best_energy:.4f}")
print(f"Best parameters: {best_params}")
`,
  },
  {
    id: "qaoa",
    name: "QAOA",
    emoji: "🌀",
    description: "Approximate optimization",
    qubits: 4,
    code: `# QAOA - 양자 근사 최적화 알고리즘
# Quantum Approximate Optimization Algorithm for MaxCut

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def qaoa_circuit(graph_edges, gamma, beta, n_qubits):
    """QAOA circuit for MaxCut problem."""
    qc = QuantumCircuit(n_qubits, n_qubits)

    # 초기 중첩 상태
    qc.h(range(n_qubits))

    # Problem unitary (Cost layer)
    for i, j in graph_edges:
        qc.cx(i, j)
        qc.rz(2 * gamma, j)
        qc.cx(i, j)

    # Mixer unitary
    for i in range(n_qubits):
        qc.rx(2 * beta, i)

    qc.measure(range(n_qubits), range(n_qubits))
    return qc

# MaxCut 문제 정의 (4-node graph)
n_qubits = 4
edges = [(0, 1), (1, 2), (2, 3), (3, 0), (0, 2)]

# 파라미터 탐색
simulator = AerSimulator()
best_cost = 0
best_result = None

for gamma in np.linspace(0, np.pi, 10):
    for beta in np.linspace(0, np.pi, 10):
        qc = qaoa_circuit(edges, gamma, beta, n_qubits)
        compiled = transpile(qc, simulator)
        result = simulator.run(compiled, shots=512).result()
        counts = result.get_counts()

        # MaxCut 비용 계산
        for bitstring, count in counts.items():
            cost = sum(1 for i, j in edges if bitstring[i] != bitstring[j])
            if cost > best_cost:
                best_cost = cost
                best_result = bitstring

print(f"QAOA MaxCut best solution: |{best_result}⟩ with cut = {best_cost}")
`,
  },
  {
    id: "teleportation",
    name: "Teleportation",
    emoji: "🚀",
    description: "Quantum state teleportation",
    qubits: 3,
    code: `# Quantum Teleportation - 양자 텔레포테이션
# Transfer quantum state using entanglement and classical communication

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# 3큐빗 텔레포테이션 회로
# q0: 전송할 상태, q1: Alice의 EPR 큐빗, q2: Bob의 EPR 큐빗
qc = QuantumCircuit(3, 3)

# 전송할 상태 준비 (|ψ⟩ = α|0⟩ + β|1⟩)
qc.rx(1.2, 0)  # 임의의 상태 생성
qc.barrier()

# EPR 쌍 생성 (Bell state between q1, q2)
qc.h(1)
qc.cx(1, 2)
qc.barrier()

# Alice의 벨 측정
qc.cx(0, 1)
qc.h(0)
qc.barrier()

# 측정
qc.measure(0, 0)
qc.measure(1, 1)

# Bob의 보정 (고전적 통신 기반)
qc.cx(1, 2)   # X correction
qc.cz(0, 2)   # Z correction
qc.measure(2, 2)

# 시뮬레이션 실행
simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()

counts = result.get_counts()
print("Teleportation results:", counts)
print(qc.draw())
`,
  },
  {
    id: "deutsch-jozsa",
    name: "Deutsch-Jozsa",
    emoji: "🎯",
    description: "Constant vs balanced oracle",
    qubits: 3,
    code: `# Deutsch-Jozsa Algorithm - 도이치-조사 알고리즘
# Determines if a function is constant or balanced in one query

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def deutsch_jozsa(n_qubits: int, oracle_type: str = "balanced") -> QuantumCircuit:
    """Create Deutsch-Jozsa circuit."""
    qc = QuantumCircuit(n_qubits + 1, n_qubits)

    # 보조 큐빗을 |1⟩ 로 초기화
    qc.x(n_qubits)

    # 모든 큐빗에 Hadamard 적용
    qc.h(range(n_qubits + 1))
    qc.barrier()

    # 오라클 적용
    if oracle_type == "constant":
        pass  # f(x) = 0 (항등)
    elif oracle_type == "balanced":
        for i in range(n_qubits):
            qc.cx(i, n_qubits)  # f(x) = x_0 ⊕ x_1 ⊕ ...
    qc.barrier()

    # 입력 큐빗에 Hadamard 적용
    qc.h(range(n_qubits))

    # 측정 (입력 큐빗만)
    qc.measure(range(n_qubits), range(n_qubits))
    return qc

# Balanced 함수 테스트
n = 3
qc = deutsch_jozsa(n, "balanced")

simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()
counts = result.get_counts()

print("Deutsch-Jozsa (balanced oracle):", counts)
# All-zero → constant, otherwise → balanced
if '0' * n in counts and counts['0' * n] == 1024:
    print("Result: CONSTANT function")
else:
    print("Result: BALANCED function")
print(qc.draw())
`,
  },
  {
    id: "bernstein-vazirani",
    name: "Bernstein-Vazirani",
    emoji: "🔑",
    description: "Hidden string finding",
    qubits: 4,
    code: `# Bernstein-Vazirani Algorithm - 번스타인-바지라니 알고리즘
# Finds hidden string s in f(x) = s·x (mod 2) with one query

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def bernstein_vazirani(secret: str) -> QuantumCircuit:
    """Create Bernstein-Vazirani circuit for given secret string."""
    n = len(secret)
    qc = QuantumCircuit(n + 1, n)

    # 보조 큐빗을 |1⟩ 로 초기화
    qc.x(n)
    qc.h(range(n + 1))
    qc.barrier()

    # 오라클: f(x) = s·x (mod 2)
    for i, bit in enumerate(reversed(secret)):
        if bit == '1':
            qc.cx(i, n)
    qc.barrier()

    # Hadamard 적용 및 측정
    qc.h(range(n))
    qc.measure(range(n), range(n))
    return qc

# 숨겨진 문자열 s = "1011"
secret = "1011"
qc = bernstein_vazirani(secret)

simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()
counts = result.get_counts()

print(f"Secret string: {secret}")
print(f"BV result: {counts}")
# Expected: 측정 결과가 secret string과 일치
print(qc.draw())
`,
  },
  {
    id: "simon",
    name: "Simon",
    emoji: "🔄",
    description: "Period finding",
    qubits: 4,
    code: `# Simon's Algorithm - 사이먼 알고리즘
# Finds hidden period s where f(x) = f(x ⊕ s)

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def simon_circuit(secret: str) -> QuantumCircuit:
    """Create Simon's algorithm circuit."""
    n = len(secret)
    qc = QuantumCircuit(2 * n, n)

    # 입력 레지스터에 Hadamard 적용
    qc.h(range(n))
    qc.barrier()

    # 오라클: f(x) = f(x ⊕ s)
    # 먼저 입력을 출력에 복사
    for i in range(n):
        qc.cx(i, i + n)

    # secret에 따른 XOR 적용
    j = secret.find('1')
    if j >= 0:
        for i, bit in enumerate(secret):
            if bit == '1':
                qc.cx(j, i + n)
    qc.barrier()

    # 입력 레지스터에 Hadamard 적용 후 측정
    qc.h(range(n))
    qc.measure(range(n), range(n))
    return qc

# 숨겨진 주기 s = "11"
secret = "11"
qc = simon_circuit(secret)

simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()
counts = result.get_counts()

print(f"Simon's Algorithm (s = {secret}):")
print(f"Results: {counts}")
# s·y = 0 (mod 2) 을 만족하는 y만 측정됨
print(qc.draw())
`,
  },
  {
    id: "shor",
    name: "Shor",
    emoji: "🔢",
    description: "Integer factorization",
    qubits: 8,
    code: `# Shor's Algorithm (Simplified) - 쇼어 알고리즘 (간소화)
# Period finding for integer factorization

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np
from math import gcd

def c_amod15(a, power):
    """Controlled multiplication by a mod 15."""
    U = QuantumCircuit(4)
    for _ in range(power):
        if a in [2, 13]:
            U.swap(2, 3)
            U.swap(1, 2)
            U.swap(0, 1)
        if a in [7, 8]:
            U.swap(0, 1)
            U.swap(1, 2)
            U.swap(2, 3)
        if a in [4, 11]:
            U.swap(1, 3)
            U.swap(0, 2)
        if a in [7, 11, 13]:
            for q in range(4):
                U.x(q)
    U = U.to_gate()
    U.name = f"{a}^{power} mod 15"
    c_U = U.control()
    return c_U

# N = 15, a = 7 (gcd(a, N) = 1)
N = 15
a = 7
n_count = 8  # 카운팅 큐빗 수

qc = QuantumCircuit(n_count + 4, n_count)

# 카운팅 레지스터 초기화
qc.h(range(n_count))
qc.x(n_count)  # 타겟 레지스터를 |1⟩ 로

# Controlled-U 연산 적용
for q in range(n_count):
    qc.append(c_amod15(a, 2**q), [q] + list(range(n_count, n_count + 4)))

# 역 QFT 적용
for i in range(n_count // 2):
    qc.swap(i, n_count - i - 1)
for i in range(n_count):
    for j in range(i):
        qc.cp(-np.pi / (2 ** (i - j)), j, i)
    qc.h(i)

qc.measure(range(n_count), range(n_count))

# 시뮬레이션
simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=1024).result()
counts = result.get_counts()

print(f"Shor's Algorithm: Factoring N={N} with a={a}")
print(f"Results: {dict(sorted(counts.items(), key=lambda x: -x[1])[:5])}")
`,
  },
  {
    id: "qpe",
    name: "QPE",
    emoji: "📐",
    description: "Quantum Phase Estimation",
    qubits: 5,
    code: `# QPE - 양자 위상 추정
# Quantum Phase Estimation: estimates eigenvalue phase of unitary operator

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def qpe_circuit(n_counting: int, phase: float) -> QuantumCircuit:
    """Create QPE circuit for a T-gate-like unitary with given phase."""
    qc = QuantumCircuit(n_counting + 1, n_counting)

    # 고유벡터 준비 (|1⟩)
    qc.x(n_counting)

    # 카운팅 큐빗에 Hadamard 적용
    qc.h(range(n_counting))

    # Controlled-U^(2^k) 적용
    for k in range(n_counting):
        angle = 2 * np.pi * phase * (2 ** k)
        qc.cp(angle, k, n_counting)

    qc.barrier()

    # 역 QFT (Inverse QFT)
    for i in range(n_counting // 2):
        qc.swap(i, n_counting - i - 1)
    for i in range(n_counting):
        for j in range(i):
            qc.cp(-np.pi / (2 ** (i - j)), j, i)
        qc.h(i)

    # 측정
    qc.measure(range(n_counting), range(n_counting))
    return qc

# 위상 θ = 1/3 추정
n_counting = 4
phase = 1 / 3
qc = qpe_circuit(n_counting, phase)

simulator = AerSimulator()
compiled = transpile(qc, simulator)
result = simulator.run(compiled, shots=2048).result()
counts = result.get_counts()

print(f"QPE for phase θ = {phase}")
print(f"Results: {dict(sorted(counts.items(), key=lambda x: -x[1])[:5])}")

# 가장 많이 측정된 결과에서 위상 추정
top = max(counts, key=counts.get)
estimated = int(top, 2) / (2 ** n_counting)
print(f"Estimated phase: {estimated:.4f} (actual: {phase:.4f})")
`,
  },
];

export function getAlgorithm(id: string): Algorithm | undefined {
  return algorithms.find((a) => a.id === id);
}
