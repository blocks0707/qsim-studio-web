"use client";

import type { JobPhase } from "@/lib/api";
import { useIDEStore } from "@/stores/ideStore";

interface Step {
  key: string;
  label: string;
  phases: JobPhase[];       // phases that map to this step being "current"
  donePhases: JobPhase[];   // phases that mean this step is complete
}

const STEPS: Step[] = [
  { key: "submit",   label: "Submit",   phases: ["pending"],    donePhases: ["analyzing", "scheduling", "running", "succeeded"] },
  { key: "analyze",  label: "Analyze",  phases: ["analyzing"],  donePhases: ["scheduling", "running", "succeeded"] },
  { key: "schedule", label: "Schedule", phases: ["scheduling"], donePhases: ["running", "succeeded"] },
  { key: "run",      label: "Run",      phases: ["running"],    donePhases: ["succeeded"] },
  { key: "done",     label: "Done",     phases: ["succeeded"],  donePhases: [] },
];

const phaseMessages: Record<string, string> = {
  pending: "Waiting in queue...",
  analyzing: "Analyzing circuit complexity...",
  scheduling: "Scheduling on compute pool...",
  running: "Running simulation...",
  succeeded: "Completed successfully",
  failed: "Job failed",
  cancelled: "Job cancelled",
};

function getStepStatus(step: Step, phase: JobPhase | null, failed: boolean): "done" | "current" | "failed" | "waiting" {
  if (!phase) return "waiting";
  if (failed) {
    // Mark the step where failure occurred
    if (step.phases.includes(phase)) return "failed";
    if (step.donePhases.includes(phase)) return "done";
    // Check if this step was already done before failure
    const stepIdx = STEPS.indexOf(step);
    const failIdx = STEPS.findIndex((s) => s.phases.includes(phase));
    if (stepIdx < failIdx) return "done";
    return "waiting";
  }
  if (phase === "cancelled") {
    const stepIdx = STEPS.indexOf(step);
    // All steps waiting for cancelled
    return stepIdx === 0 ? "done" : "waiting";
  }
  if (step.phases.includes(phase)) return "current";
  if (step.donePhases.includes(phase)) return "done";
  return "waiting";
}

export function JobProgress() {
  const jobPhase = useIDEStore((s) => s.jobPhase);
  const isRunning = useIDEStore((s) => s.isRunning);
  const jobResult = useIDEStore((s) => s.jobResult);

  if (!jobPhase && !isRunning && !jobResult) return null;

  const effectivePhase = jobPhase || (jobResult ? "succeeded" : null);
  const isFailed = effectivePhase === "failed";

  return (
    <div
      className="flex-shrink-0 px-4 py-3 border-b"
      style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
    >
      {/* Steps */}
      <div className="flex items-center justify-between gap-0">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step, effectivePhase as JobPhase | null, isFailed);
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    status === "current" ? "animate-pulse" : ""
                  }`}
                  style={{
                    background:
                      status === "done" ? "#6a9955" :
                      status === "current" ? "#569cd6" :
                      status === "failed" ? "#f44747" :
                      "transparent",
                    border: `2px solid ${
                      status === "done" ? "#6a9955" :
                      status === "current" ? "#569cd6" :
                      status === "failed" ? "#f44747" :
                      "#555"
                    }`,
                    color: status === "waiting" ? "#555" : "#fff",
                  }}
                >
                  {status === "done" ? "✓" : status === "failed" ? "✗" : status === "current" ? "●" : "○"}
                </div>
                {/* Label */}
                <span
                  className="text-[10px] mt-1"
                  style={{
                    color:
                      status === "done" ? "#6a9955" :
                      status === "current" ? "#569cd6" :
                      status === "failed" ? "#f44747" :
                      "#555",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className="flex-1 h-[2px] mx-1 mt-[-14px]"
                  style={{
                    background: status === "done" ? "#6a9955" : "#333",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Status message */}
      {effectivePhase && (
        <div
          className="text-xs mt-2 text-center"
          style={{
            color:
              isFailed ? "#f44747" :
              effectivePhase === "succeeded" ? "#6a9955" :
              "#569cd6",
          }}
        >
          {phaseMessages[effectivePhase] || effectivePhase}
        </div>
      )}
    </div>
  );
}
