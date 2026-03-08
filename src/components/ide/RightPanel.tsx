"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { CircuitViewer } from "./CircuitViewer";
import { ResultsPanel } from "./ResultsPanel";

export function RightPanel() {
  return (
    <div className="h-full" style={{ borderLeft: "1px solid var(--border)" }}>
      <PanelGroup direction="vertical">
        <Panel defaultSize={55} minSize={20} id="circuit">
          <CircuitViewer />
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={45} minSize={20} id="results">
          <ResultsPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
