"use client";

import { useEffect, useRef } from "react";

interface FileContextMenuProps {
  x: number;
  y: number;
  isFolder?: boolean;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onClose: () => void;
}

export function FileContextMenu({
  x,
  y,
  isFolder,
  onRename,
  onDelete,
  onDuplicate,
  onNewFile,
  onNewFolder,
  onClose,
}: FileContextMenuProps) {
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

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 800) - 160);
  const adjustedY = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 600) - 200);

  const items: { label: string; onClick: () => void; color?: string; separator?: boolean }[] = [];

  if (onNewFile) {
    items.push({ label: "New File…", onClick: onNewFile });
  }
  if (onNewFolder) {
    items.push({ label: "New Folder…", onClick: onNewFolder });
  }
  if (items.length > 0) {
    items.push({ label: "", onClick: () => {}, separator: true });
  }

  if (onDuplicate) {
    items.push({ label: "Duplicate", onClick: onDuplicate });
  }
  items.push({ label: "Rename", onClick: onRename });
  items.push({ label: "", onClick: () => {}, separator: true });
  items.push({ label: isFolder ? "Delete Folder" : "Delete", onClick: onDelete, color: "#f44747" });

  return (
    <div
      ref={ref}
      className="fixed z-50 py-1 rounded shadow-lg min-w-[160px]"
      style={{
        left: adjustedX,
        top: adjustedY,
        background: "var(--bg-panel, #252526)",
        border: "1px solid var(--border)",
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 mx-2 border-t" style={{ borderColor: "var(--border)" }} />
        ) : (
          <button
            key={i}
            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-white/10"
            style={{ color: item.color || "var(--text-primary)" }}
            onClick={() => { item.onClick(); onClose(); }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
