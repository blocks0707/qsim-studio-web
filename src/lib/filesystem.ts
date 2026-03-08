// Virtual filesystem backed by localStorage

const FS_TREE_KEY = "qsim-fs-tree";
const FS_CONTENT_PREFIX = "qsim-fs:";

export interface FSFile {
  id: string;
  name: string;
  path: string;
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadFileTree(): FSFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FS_TREE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFileTree(files: FSFile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FS_TREE_KEY, JSON.stringify(files));
}

export function loadFileContent(path: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FS_CONTENT_PREFIX + path);
}

export function saveFileContent(path: string, content: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FS_CONTENT_PREFIX + path, content);
}

export function deleteFileContent(path: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FS_CONTENT_PREFIX + path);
}

export function createFile(name: string, content = ""): FSFile {
  // Ensure extension
  if (!name.includes(".")) {
    name = name + ".py";
  }
  const file: FSFile = {
    id: generateId(),
    name,
    path: `/${name}`,
  };
  const tree = loadFileTree();
  tree.push(file);
  saveFileTree(tree);
  saveFileContent(file.path, content);
  return file;
}

export function renameFile(id: string, newName: string): FSFile | null {
  if (!newName.includes(".")) {
    newName = newName + ".py";
  }
  const tree = loadFileTree();
  const file = tree.find((f) => f.id === id);
  if (!file) return null;

  const oldPath = file.path;
  const content = loadFileContent(oldPath) || "";
  deleteFileContent(oldPath);

  file.name = newName;
  file.path = `/${newName}`;
  saveFileTree(tree);
  saveFileContent(file.path, content);
  return file;
}

export function deleteFile(id: string): boolean {
  const tree = loadFileTree();
  const file = tree.find((f) => f.id === id);
  if (!file) return false;
  deleteFileContent(file.path);
  saveFileTree(tree.filter((f) => f.id !== id));
  return true;
}

const DEFAULT_CONTENT = `# New quantum circuit
from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
`;

export function ensureDefaultFiles(): FSFile[] {
  const tree = loadFileTree();
  if (tree.length > 0) return tree;
  // Create a default file on first use
  const file = createFile("untitled.py", DEFAULT_CONTENT);
  return [file];
}
