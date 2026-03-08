import type * as Monaco from "monaco-editor";

export function registerQASMLanguage(monaco: typeof Monaco) {
  monaco.languages.register({ id: "qasm", extensions: [".qasm"], aliases: ["OpenQASM", "QASM"] });

  monaco.languages.setMonarchTokensProvider("qasm", {
    keywords: ["OPENQASM", "include", "gate", "qubit", "bit", "creg", "qreg", "measure", "barrier", "if", "reset", "opaque", "let", "const", "def", "return", "for", "while", "in", "extern"],
    gates: ["h", "x", "y", "z", "cx", "cz", "ccx", "swap", "rx", "ry", "rz", "u", "s", "t", "sdg", "tdg", "id", "sx", "p", "cp", "cswap", "rxx", "rzz"],
    typeKeywords: ["int", "uint", "float", "bool", "angle", "duration", "stretch"],
    operators: ["=", "->", "+", "-", "*", "/", "==", "!=", "<=", ">=", "<", ">"],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"[^"]*"/, "string"],
        [/\d+\.\d*([eE][-+]?\d+)?/, "number.float"],
        [/\d+/, "number"],
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@gates": "type.identifier",
            "@typeKeywords": "type",
            "@default": "identifier",
          },
        }],
        [/[{}()\[\]]/, "@brackets"],
        [/[;,.]/, "delimiter"],
        [/->/, "operator"],
        [/[=+\-*/<>!]+/, "operator"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  } as Monaco.languages.IMonarchLanguage);

  monaco.languages.registerCompletionItemProvider("qasm", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const gateSnippets = [
        { label: "h", detail: "Hadamard gate", insertText: "h ${1:q};" },
        { label: "x", detail: "Pauli-X gate", insertText: "x ${1:q};" },
        { label: "y", detail: "Pauli-Y gate", insertText: "y ${1:q};" },
        { label: "z", detail: "Pauli-Z gate", insertText: "z ${1:q};" },
        { label: "cx", detail: "CNOT gate", insertText: "cx ${1:control}, ${2:target};" },
        { label: "cz", detail: "CZ gate", insertText: "cz ${1:q0}, ${2:q1};" },
        { label: "ccx", detail: "Toffoli gate", insertText: "ccx ${1:q0}, ${2:q1}, ${3:q2};" },
        { label: "swap", detail: "SWAP gate", insertText: "swap ${1:q0}, ${2:q1};" },
        { label: "rx", detail: "Rotation-X", insertText: "rx(${1:theta}) ${2:q};" },
        { label: "ry", detail: "Rotation-Y", insertText: "ry(${1:theta}) ${2:q};" },
        { label: "rz", detail: "Rotation-Z", insertText: "rz(${1:theta}) ${2:q};" },
        { label: "measure", detail: "Measure qubit", insertText: "measure ${1:q} -> ${2:c};" },
        { label: "barrier", detail: "Barrier", insertText: "barrier ${1:q};" },
        { label: "reset", detail: "Reset qubit", insertText: "reset ${1:q};" },
      ];

      const keywordSnippets = [
        { label: "OPENQASM", detail: "OpenQASM version", insertText: 'OPENQASM ${1:3.0};' },
        { label: "include", detail: "Include file", insertText: 'include "${1:stdgates.inc}";' },
        { label: "qubit", detail: "Declare qubit", insertText: "qubit[${1:n}] ${2:q};" },
        { label: "bit", detail: "Declare bit", insertText: "bit[${1:n}] ${2:c};" },
        { label: "gate", detail: "Define gate", insertText: "gate ${1:name}(${2:params}) ${3:qubits} {\n\t$0\n}" },
        { label: "qreg", detail: "Quantum register", insertText: "qreg ${1:q}[${2:n}];" },
        { label: "creg", detail: "Classical register", insertText: "creg ${1:c}[${2:n}];" },
      ];

      const suggestions: Monaco.languages.CompletionItem[] = [
        ...gateSnippets.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: s.detail,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
        ...keywordSnippets.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          detail: s.detail,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      ];

      return { suggestions };
    },
  });
}
