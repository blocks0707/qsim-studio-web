"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { RightPanel } from "./RightPanel";
import { StatusBar } from "./StatusBar";
import { useIDEStore } from "@/stores/ideStore";
import { useEffect, useRef } from "react";

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
    </div>
  );
}
