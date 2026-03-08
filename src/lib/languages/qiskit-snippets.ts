import type * as Monaco from "monaco-editor";

export function registerQiskitSnippets(monaco: typeof Monaco) {
  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const snippets = [
        {
          label: "qc",
          detail: "Create QuantumCircuit",
          insertText: "qc = QuantumCircuit(${1:2}, ${2:2})",
        },
        {
          label: "qc.h",
          detail: "Hadamard gate",
          insertText: "qc.h(${1:0})",
        },
        {
          label: "qc.cx",
          detail: "CNOT gate",
          insertText: "qc.cx(${1:0}, ${2:1})",
        },
        {
          label: "qc.measure",
          detail: "Measure all qubits",
          insertText: "qc.measure_all()",
        },
        {
          label: "sim",
          detail: "Run AerSimulator",
          insertText:
            "simulator = AerSimulator()\ncompiled = transpile(${1:qc}, simulator)\nresult = simulator.run(compiled, shots=${2:1024}).result()",
        },
        {
          label: "qc.barrier",
          detail: "Add barrier",
          insertText: "qc.barrier()",
        },
        {
          label: "qc.rx",
          detail: "Rotation-X gate",
          insertText: "qc.rx(${1:np.pi/2}, ${2:0})",
        },
        {
          label: "qc.ry",
          detail: "Rotation-Y gate",
          insertText: "qc.ry(${1:np.pi/2}, ${2:0})",
        },
        {
          label: "qc.rz",
          detail: "Rotation-Z gate",
          insertText: "qc.rz(${1:np.pi/2}, ${2:0})",
        },
        {
          label: "qc.swap",
          detail: "SWAP gate",
          insertText: "qc.swap(${1:0}, ${2:1})",
        },
        {
          label: "qc.ccx",
          detail: "Toffoli gate",
          insertText: "qc.ccx(${1:0}, ${2:1}, ${3:2})",
        },
        {
          label: "result",
          detail: "Get counts from result",
          insertText: "counts = result.get_counts(${1:qc})\nprint(counts)",
        },
        {
          label: "plot",
          detail: "Plot histogram",
          insertText:
            "from qiskit.visualization import plot_histogram\nprint(plot_histogram(${1:counts}))",
        },
      ];

      const suggestions: Monaco.languages.CompletionItem[] = snippets.map((s) => ({
        label: s.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: `Qiskit: ${s.detail}`,
        insertText: s.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }));

      return { suggestions };
    },
  });
}
