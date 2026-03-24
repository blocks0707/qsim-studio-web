"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  confirmColor = "#f44747",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onConfirm, onCancel]);

  // Click outside to cancel
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        ref={ref}
        className="rounded-lg shadow-xl p-4 max-w-sm w-full mx-4"
        style={{ background: "var(--bg-panel, #252526)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded text-xs font-medium hover:bg-white/10"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs font-medium hover:brightness-110"
            style={{ background: confirmColor, color: "#fff" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
