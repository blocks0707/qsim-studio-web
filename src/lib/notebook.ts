/**
 * Jupyter Notebook (.ipynb) types and utilities.
 * Follows nbformat v4 specification.
 */

export interface NotebookCell {
  id: string;
  cell_type: "code" | "markdown" | "raw";
  source: string[];  // lines of source
  metadata: Record<string, unknown>;
  // Code cells only
  outputs?: CellOutput[];
  execution_count?: number | null;
}

export type CellOutput =
  | StreamOutput
  | DisplayDataOutput
  | ExecuteResultOutput
  | ErrorOutput;

export interface StreamOutput {
  output_type: "stream";
  name: "stdout" | "stderr";
  text: string[];
}

export interface DisplayDataOutput {
  output_type: "display_data";
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ExecuteResultOutput {
  output_type: "execute_result";
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  execution_count: number;
}

export interface ErrorOutput {
  output_type: "error";
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface Notebook {
  nbformat: number;
  nbformat_minor: number;
  metadata: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      name: string;
      version?: string;
    };
    [key: string]: unknown;
  };
  cells: NotebookCell[];
}

/** Parse .ipynb JSON string into Notebook. */
export function parseNotebook(json: string): Notebook {
  const raw = JSON.parse(json);
  // Ensure cells have ids
  const cells: NotebookCell[] = (raw.cells || []).map((cell: NotebookCell, i: number) => ({
    ...cell,
    id: cell.id || `cell-${i}`,
    source: Array.isArray(cell.source) ? cell.source : [cell.source || ""],
    outputs: cell.cell_type === "code" ? (cell.outputs || []) : undefined,
    execution_count: cell.cell_type === "code" ? (cell.execution_count ?? null) : undefined,
  }));
  return {
    nbformat: raw.nbformat || 4,
    nbformat_minor: raw.nbformat_minor || 5,
    metadata: raw.metadata || {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python", version: "3.11" },
    },
    cells,
  };
}

/** Serialize Notebook to .ipynb JSON string. */
export function serializeNotebook(nb: Notebook): string {
  return JSON.stringify(nb, null, 1) + "\n";
}

/** Create an empty notebook. */
export function createEmptyNotebook(): Notebook {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3 (Qiskit)",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.11",
      },
    },
    cells: [
      {
        id: `cell-${Date.now()}`,
        cell_type: "code",
        source: ["# Quantum Circuit\n", "from qiskit import QuantumCircuit\n", "\n", "qc = QuantumCircuit(2, 2)\n"],
        metadata: {},
        outputs: [],
        execution_count: null,
      },
    ],
  };
}

/** Get cell source as a single string. */
export function getCellSource(cell: NotebookCell): string {
  return cell.source.join("");
}

/** Set cell source from a single string. */
export function setCellSource(cell: NotebookCell, text: string): NotebookCell {
  return { ...cell, source: text.split(/(?<=\n)/) }; // split keeping newlines
}

/** Generate a new cell id. */
export function newCellId(): string {
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a new empty cell. */
export function createCell(type: "code" | "markdown" = "code"): NotebookCell {
  return {
    id: newCellId(),
    cell_type: type,
    source: [""],
    metadata: {},
    ...(type === "code" ? { outputs: [], execution_count: null } : {}),
  };
}
