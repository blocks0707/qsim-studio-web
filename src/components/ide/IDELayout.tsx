"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { RightPanel } from "./RightPanel";
import { StatusBar } from "./StatusBar";
import { SettingsModal } from "./SettingsModal";
import { useIDEStore, type SidebarSection } from "@/stores/ideStore";
import { useEffect, useRef } from "react";

const sidebarSections: SidebarSection[] = ["files", "algorithms", "jobs", "nodes", "settings"];

export function IDELayout() {
  const sidebarOpen = useIDEStore((s) => s.sidebarOpen);
  const loadFromStorage = useIDEStore((s) => s.loadFromStorage);
  const initialized = useRef(false);

  // Load filesystem on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadFromStorage();
    }
  }, [loadFromStorage]);

  // Auto-save dirty files (debounced)
  const dirtyFiles = useIDEStore((s) => s.dirtyFiles);
  const saveFileToStorage = useIDEStore((s) => s.saveFileToStorage);
  useEffect(() => {
    if (dirtyFiles.size === 0) return;
    const timer = setTimeout(() => {
      dirtyFiles.forEach((id) => saveFileToStorage(id));
    }, 1000);
    return () => clearTimeout(timer);
  }, [dirtyFiles, saveFileToStorage]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod && e.key !== "Escape") return;

      const store = useIDEStore.getState();

      // Escape → close settings
      if (e.key === "Escape") {
        if (store.settingsOpen) {
          e.preventDefault();
          store.setSettingsOpen(false);
        }
        return;
      }

      // Cmd+, → settings
      if (e.key === ",") {
        e.preventDefault();
        store.setSettingsOpen(true);
        return;
      }

      // Cmd+B → toggle sidebar
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        const section = store.activeSidebarSection || "files";
        store.toggleSidebar(section);
        return;
      }

      // Cmd+N → new file
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        store.createFile("untitled.py");
        return;
      }

      // Cmd+W → close active tab
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (store.activeTabId) store.closeTab(store.activeTabId);
        return;
      }

      // Cmd+Enter → run (handled by EditorArea, just prevent default here)
      if (e.key === "Enter") {
        // Let EditorArea handle this
        return;
      }

      // Cmd+1-5 → switch sidebar panel
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        e.preventDefault();
        const section = sidebarSections[num - 1];
        if (section === "settings") {
          store.setSettingsOpen(true);
        } else {
          store.toggleSidebar(section);
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: "var(--bg-editor)" }}>
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        
        <PanelGroup direction="horizontal" className="flex-1">
          {sidebarOpen && (
            <>
              <Panel defaultSize={18} minSize={12} maxSize={30} id="sidebar">
                <Sidebar />
              </Panel>
              <PanelResizeHandle />
            </>
          )}

          <Panel defaultSize={sidebarOpen ? 50 : 65} minSize={30} id="editor">
            <EditorArea />
          </Panel>

          <PanelResizeHandle />

          <Panel defaultSize={sidebarOpen ? 32 : 35} minSize={20} id="right">
            <RightPanel />
          </Panel>
        </PanelGroup>
      </div>

      <StatusBar />
      <SettingsModal />
    </div>
  );
}
