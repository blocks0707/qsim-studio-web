// Virtual filesystem backed by localStorage — supports folders

const FS_TREE_KEY = "qsim-fs-tree";
const FS_CONTENT_PREFIX = "qsim-fs:";

export type FSNodeType = "file" | "folder";

export interface FSNode {
  id: string;
  name: string;
  path: string;
  type: FSNodeType;
  parentId: string | null; // null = root level
}

// Backward compat alias
export type FSFile = FSNode;

function generateId(): string {
  return `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Tree persistence ─── */

export function loadFileTree(): FSNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FS_TREE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FSNode[];
    // Migrate old flat files (no type/parentId)
    return parsed.map((n) => ({
      ...n,
      type: n.type || "file",
      parentId: n.parentId ?? null,
    }));
  } catch {
    return [];
  }
}

export function saveFileTree(nodes: FSNode[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FS_TREE_KEY, JSON.stringify(nodes));
}

/* ─── Content persistence ─── */

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

/* ─── Path helpers ─── */

/** Get parent path: "/a/b/c.py" → "/a/b", "/" → null */
export function parentPath(p: string): string | null {
  const idx = p.lastIndexOf("/");
  if (idx <= 0) return null;
  return p.slice(0, idx);
}

/** Build full path from parent + name */
export function buildPath(parentPath: string | null, name: string): string {
  if (!parentPath || parentPath === "/") return `/${name}`;
  return `${parentPath}/${name}`;
}

/** Get children of a folder (direct children only) */
export function getChildren(nodes: FSNode[], parentId: string | null): FSNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => {
      // Folders first, then alphabetical
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** Get all descendants of a folder (recursive) */
export function getDescendants(nodes: FSNode[], folderId: string): FSNode[] {
  const children = nodes.filter((n) => n.parentId === folderId);
  const result: FSNode[] = [...children];
  for (const child of children) {
    if (child.type === "folder") {
      result.push(...getDescendants(nodes, child.id));
    }
  }
  return result;
}

/* ─── CRUD operations ─── */

export function createFolder(name: string, parentId: string | null = null): FSNode {
  const tree = loadFileTree();
  const parent = parentId ? tree.find((n) => n.id === parentId) : null;
  const parentP = parent ? parent.path : null;
  const folder: FSNode = {
    id: generateId(),
    name,
    path: buildPath(parentP, name),
    type: "folder",
    parentId,
  };
  tree.push(folder);
  saveFileTree(tree);
  return folder;
}

export function createFile(name: string, content = "", parentId: string | null = null): FSNode {
  if (!name.includes(".")) {
    name = name + ".py";
  }
  const tree = loadFileTree();
  const parent = parentId ? tree.find((n) => n.id === parentId) : null;
  const parentP = parent ? parent.path : null;
  const file: FSNode = {
    id: generateId(),
    name,
    path: buildPath(parentP, name),
    type: "file",
    parentId,
  };
  tree.push(file);
  saveFileTree(tree);
  saveFileContent(file.path, content);
  return file;
}

export function renameNode(id: string, newName: string): FSNode | null {
  const tree = loadFileTree();
  const node = tree.find((n) => n.id === id);
  if (!node) return null;

  const oldPath = node.path;
  const parent = node.parentId ? tree.find((n) => n.id === node.parentId) : null;
  const parentP = parent ? parent.path : null;
  const newPath = buildPath(parentP, newName);

  if (node.type === "file") {
    if (!newName.includes(".")) newName = newName + ".py";
    const content = loadFileContent(oldPath) || "";
    deleteFileContent(oldPath);
    node.name = newName;
    node.path = buildPath(parentP, newName);
    saveFileTree(tree);
    saveFileContent(node.path, content);
  } else {
    // Folder: update all descendants' paths
    node.name = newName;
    node.path = newPath;
    const descendants = getDescendants(tree, node.id);
    for (const d of descendants) {
      const oldDPath = d.path;
      // Rebuild path based on parent chain
      d.path = rebuildPath(tree, d);
      if (d.type === "file") {
        const content = loadFileContent(oldDPath) || "";
        deleteFileContent(oldDPath);
        saveFileContent(d.path, content);
      }
    }
    saveFileTree(tree);
  }

  return node;
}

// Backward compat
export function renameFile(id: string, newName: string): FSNode | null {
  return renameNode(id, newName);
}

export function deleteNode(id: string): boolean {
  const tree = loadFileTree();
  const node = tree.find((n) => n.id === id);
  if (!node) return false;

  const toDelete = [node, ...getDescendants(tree, id)];
  for (const d of toDelete) {
    if (d.type === "file") {
      deleteFileContent(d.path);
    }
  }
  const deleteIds = new Set(toDelete.map((d) => d.id));
  saveFileTree(tree.filter((n) => !deleteIds.has(n.id)));
  return true;
}

// Backward compat
export function deleteFile(id: string): boolean {
  return deleteNode(id);
}

export function moveNode(id: string, newParentId: string | null): boolean {
  const tree = loadFileTree();
  const node = tree.find((n) => n.id === id);
  if (!node) return false;

  // Prevent moving folder into its own descendant
  if (newParentId && node.type === "folder") {
    const descs = getDescendants(tree, id);
    if (descs.some((d) => d.id === newParentId)) return false;
  }

  const oldPath = node.path;
  node.parentId = newParentId;
  node.path = rebuildPath(tree, node);

  if (node.type === "file") {
    const content = loadFileContent(oldPath) || "";
    deleteFileContent(oldPath);
    saveFileContent(node.path, content);
  } else {
    // Update descendants
    const descendants = getDescendants(tree, id);
    for (const d of descendants) {
      const oldDPath = d.path;
      d.path = rebuildPath(tree, d);
      if (d.type === "file") {
        const content = loadFileContent(oldDPath) || "";
        deleteFileContent(oldDPath);
        saveFileContent(d.path, content);
      }
    }
  }

  saveFileTree(tree);
  return true;
}

export function duplicateFile(id: string): FSNode | null {
  const tree = loadFileTree();
  const node = tree.find((n) => n.id === id);
  if (!node || node.type !== "file") return null;

  const content = loadFileContent(node.path) || "";
  const ext = node.name.includes(".") ? node.name.slice(node.name.lastIndexOf(".")) : ".py";
  const base = node.name.includes(".") ? node.name.slice(0, node.name.lastIndexOf(".")) : node.name;
  const newName = `${base} (copy)${ext}`;

  return createFile(newName, content, node.parentId);
}

/* ─── Helpers ─── */

function rebuildPath(tree: FSNode[], node: FSNode): string {
  if (!node.parentId) return `/${node.name}`;
  const parent = tree.find((n) => n.id === node.parentId);
  if (!parent) return `/${node.name}`;
  return `${parent.path}/${node.name}`;
}

const DEFAULT_CONTENT = `# New quantum circuit
from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
`;

export function ensureDefaultFiles(): FSNode[] {
  const tree = loadFileTree();
  if (tree.length > 0) return tree;
  const file = createFile("untitled.py", DEFAULT_CONTENT);
  return [file];
}
