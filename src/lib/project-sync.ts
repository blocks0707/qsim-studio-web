/**
 * Project sync layer: localStorage (fast, local) ↔ MinIO (persistent, remote).
 *
 * Strategy:
 * - localStorage remains the working copy for instant UI updates
 * - On file save/create/delete/rename, sync to remote in background
 * - On project open, pull remote files into localStorage
 * - Graceful degradation: if API unavailable, works offline with localStorage only
 */

import { createClient, type ProjectMeta, type ProjectFile } from "./api";
import {
  loadFileTree,
  saveFileTree,
  loadFileContent,
  saveFileContent,
  deleteFileContent,
  type FSNode,
} from "./filesystem";

const ACTIVE_PROJECT_KEY = "qsim-active-project";

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  connected: false,
  syncing: false,
  lastSync: null,
  error: null,
};

let statusListeners: ((s: SyncStatus) => void)[] = [];

export function onSyncStatus(fn: (s: SyncStatus) => void) {
  statusListeners.push(fn);
  return () => { statusListeners = statusListeners.filter((f) => f !== fn); };
}

function updateStatus(partial: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...partial };
  statusListeners.forEach((fn) => fn(syncStatus));
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

// ─── Active project ───

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  else localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

// ─── Sync operations ───

function getClient(apiUrl: string, apiToken: string) {
  return createClient(apiUrl, apiToken);
}

/** Pull all remote files into localStorage. */
export async function pullProject(apiUrl: string, apiToken: string, projectId: string): Promise<FSNode[]> {
  const client = getClient(apiUrl, apiToken);
  updateStatus({ syncing: true, error: null });

  try {
    const remoteFiles = await client.listFiles(projectId);
    const localTree: FSNode[] = [];

    // Build folder structure from paths
    const folderIds = new Map<string, string>(); // path → id

    for (const rf of remoteFiles) {
      // Ensure parent folders exist
      const parts = rf.path.split("/").filter(Boolean);
      let parentId: string | null = null;
      let currentPath = "";

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += "/" + parts[i];
        if (!folderIds.has(currentPath)) {
          const folderId = `folder-${currentPath.replace(/\//g, "-")}`;
          folderIds.set(currentPath, folderId);
          localTree.push({
            id: folderId,
            name: parts[i],
            path: currentPath,
            type: "folder",
            parentId,
          });
        }
        parentId = folderIds.get(currentPath)!;
      }

      // Add file
      const fileName = parts[parts.length - 1];
      const fileId = `file-${rf.path.replace(/\//g, "-")}`;
      localTree.push({
        id: fileId,
        name: fileName,
        path: rf.path,
        type: "file",
        parentId,
      });

      // Fetch content
      try {
        const { content } = await client.getFile(projectId, rf.path);
        saveFileContent(rf.path, content);
      } catch {
        // Skip failed files
      }
    }

    saveFileTree(localTree);
    setActiveProjectId(projectId);
    updateStatus({ connected: true, syncing: false, lastSync: Date.now() });
    return localTree;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStatus({ syncing: false, error: msg });
    throw err;
  }
}

/** Push a single file to remote. */
export async function pushFile(apiUrl: string, apiToken: string, projectId: string, filePath: string, content: string): Promise<void> {
  try {
    const client = getClient(apiUrl, apiToken);
    await client.putFile(projectId, filePath, content);
    updateStatus({ lastSync: Date.now(), error: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStatus({ error: `Sync failed: ${msg}` });
  }
}

/** Delete a file from remote. */
export async function deleteRemoteFile(apiUrl: string, apiToken: string, projectId: string, filePath: string): Promise<void> {
  try {
    const client = getClient(apiUrl, apiToken);
    await client.deleteRemoteFile(projectId, filePath);
  } catch {
    // Non-critical
  }
}

/** Move/rename a file on remote. */
export async function moveRemoteFile(apiUrl: string, apiToken: string, projectId: string, oldPath: string, newPath: string): Promise<void> {
  try {
    const client = getClient(apiUrl, apiToken);
    await client.moveFile(projectId, oldPath, newPath);
  } catch {
    // Non-critical
  }
}

/** Push all local files to remote (full sync). */
export async function pushAllFiles(apiUrl: string, apiToken: string, projectId: string): Promise<void> {
  const tree = loadFileTree();
  const files = tree.filter((n) => n.type === "file");
  updateStatus({ syncing: true, error: null });

  try {
    const client = getClient(apiUrl, apiToken);
    for (const f of files) {
      const content = loadFileContent(f.path) || "";
      await client.putFile(projectId, f.path, content);
    }
    updateStatus({ connected: true, syncing: false, lastSync: Date.now() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStatus({ syncing: false, error: msg });
  }
}
