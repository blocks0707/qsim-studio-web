"use client";

import type { JobPhase } from "@/lib/api";
import { Check, X, Circle, Loader2 } from "lucide-react";

// 파이프라인 단계 정의
const PIPELINE_STEPS: { key: JobPhase; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "analyzing", label: "Analyzing" },
  { key: "scheduling", label: "Scheduling" },
  { key: "running", label: "Running" },
  { key: "succeeded", label: "Completed" },
];

const PHASE_ORDER: JobPhase[] = ["pending", "analyzing", "scheduling", "running", "succeeded"];

function getStepState(
  stepPhase: JobPhase,
  currentPhase: JobPhase
): "completed" | "current" | "failed" | "upcoming" {
  if (currentPhase === "failed") {
    const currentIdx = PHASE_ORDER.indexOf(currentPhase);
    const stepIdx = PHASE_ORDER.indexOf(stepPhase);
    // failed 상태에서는 마지막으로 도달한 단계까지 completed, 그 다음이 failed
    // running 이전까지 completed, running에서 failed로 표시
    // 실제로는 어느 단계에서든 실패 가능 — pending 이후 첫 upcoming을 failed로
    if (stepIdx === 0) return "completed"; // pending은 항상 완료
    // failed일 때는 간단히: pending만 done, analyzing을 failed로
    return stepIdx <= 1 ? "failed" : "upcoming";
  }

  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const stepIdx = PHASE_ORDER.indexOf(stepPhase);

  if (currentIdx < 0) return "upcoming";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}

interface JobStepperProps {
  phase: JobPhase;
  className?: string;
}

export function JobStepper({ phase, className = "" }: JobStepperProps) {
  // cancelled는 별도 처리
  if (phase === "cancelled") {
    return (
      <div className={`flex items-center gap-1 px-2 py-2 ${className}`}>
        <X size={12} className="text-[#ce9178]" />
        <span className="text-xs text-[#ce9178]">Cancelled</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 px-2 py-2 ${className}`}>
      {PIPELINE_STEPS.map((step, i) => {
        const state = getStepState(step.key, phase);
        const isLast = i === PIPELINE_STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center" title={step.label}>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  state === "current" ? "animate-pulse" : ""
                }`}
                style={{
                  background:
                    state === "completed" ? "#6a9955" :
                    state === "current" ? "#007acc" :
                    state === "failed" ? "#f44747" :
                    "transparent",
                  border: `2px solid ${
                    state === "completed" ? "#6a9955" :
                    state === "current" ? "#007acc" :
                    state === "failed" ? "#f44747" :
                    "#555"
                  }`,
                }}
              >
                {state === "completed" && <Check size={10} className="text-white" />}
                {state === "current" && <Loader2 size={10} className="text-white animate-spin" />}
                {state === "failed" && <X size={10} className="text-white" />}
                {state === "upcoming" && <Circle size={6} className="text-[#555]" />}
              </div>
              <span
                className="text-[9px] mt-0.5 whitespace-nowrap"
                style={{
                  color:
                    state === "completed" ? "#6a9955" :
                    state === "current" ? "#007acc" :
                    state === "failed" ? "#f44747" :
                    "#555",
                }}
              >
                {step.label}
              </span>
            </div>
            {/* 연결선 */}
            {!isLast && (
              <div
                className="w-3 h-[2px] mx-0.5 -mt-3"
                style={{
                  background:
                    state === "completed" ? "#6a9955" :
                    state === "failed" ? "#f44747" :
                    "#333",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
