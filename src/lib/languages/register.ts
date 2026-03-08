import type * as Monaco from "monaco-editor";
import { registerQASMLanguage } from "./qasm";
import { registerQiskitSnippets } from "./qiskit-snippets";

let registered = false;

export function registerLanguages(monaco: typeof Monaco) {
  if (registered) return;
  registered = true;
  registerQASMLanguage(monaco);
  registerQiskitSnippets(monaco);
}
