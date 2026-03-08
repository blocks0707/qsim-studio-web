"use client";

import type { JobPhase } from "@/lib/api";

const phaseConfig: Record<JobPhase, { label: string; color: string; bg: string; pulse?: boolean }> = {
  pending:    { label: "Pending",    color: "#888888", bg: "#88888820" },
  analyzing:  { label: "Analyzing",  color: "#569cd6", bg: "#569cd620", pulse: true },
  scheduling: { label: "Scheduling", color: "#569cd6", bg: "#569cd620" },
  running:    { label: "Running",    color: "#4ec9b0", bg: "#4ec9b020", pulse: true },
  succeeded:  { label: "Succeeded",  color: "#6a9955", bg: "#6a995520" },
  failed:     { label: "Failed",     color: "#f44747", bg: "#f4474720" },
  cancelled:  { label: "Cancelled",  color: "#ce9178", bg: "#ce917820" },
};

export function StatusBadge({ phase }: { phase: JobPhase }) {
  const cfg = phaseConfig[phase] || phaseConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${cfg.pulse ? "animate-pulse" : ""}`}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
