"use client";

import { useEffect, useRef } from "react";

interface FileContextMenuProps {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FileContextMenu({ x, y, onRename, onDelete, onClose }: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 py-1 rounded shadow-lg min-w-[140px]"
      style={{
        left: x,
        top: y,
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
      }}
    >
      <button
        className="block w-full text-left px-3 py-1.5 text-xs hover:bg-white/10"
        style={{ color: "var(--text-primary)" }}
        onClick={() => { onRename(); onClose(); }}
      >
        Rename
      </button>
      <button
        className="block w-full text-left px-3 py-1.5 text-xs hover:bg-white/10"
        style={{ color: "#f44747" }}
        onClick={() => { onDelete(); onClose(); }}
      >
        Delete
      </button>
    </div>
  );
}
