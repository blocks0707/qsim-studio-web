"use client";

import { GitBranch, AlertCircle, AlertTriangle } from "lucide-react";

export function StatusBar() {
  return (
    <div
      className="h-[22px] flex items-center justify-between px-2 text-xs flex-shrink-0 text-white"
      style={{ background: "var(--bg-statusbar)" }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <AlertCircle size={12} />
            <span>0</span>
          </span>
          <span className="flex items-center gap-0.5">
            <AlertTriangle size={12} />
            <span>0</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#4ec9b0]" />
          <span>Connected · 3 nodes</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span>Ln 1, Col 1</span>
        <span>Spaces: 4</span>
        <span>UTF-8</span>
        <span>Python</span>
      </div>
    </div>
  );
}
