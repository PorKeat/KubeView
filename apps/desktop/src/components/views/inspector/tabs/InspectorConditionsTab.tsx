"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export interface InspectorConditionsTabProps {
  currentResource: SelectedResource;
  podData: PodSummary | undefined;
}

type PodConditionTone = "critical" | "warning" | "healthy";

function getPodConditionTone(condition: {
  type: string;
  status: string;
}): PodConditionTone {
  if (condition.type === "DisruptionTarget" && condition.status === "True") {
    return "warning";
  }
  if (condition.status === "True") return "healthy";
  if (condition.status === "False") return "critical";
  return "warning";
}

const toneClasses: Record<PodConditionTone, { icon: string; badge: string }> = {
  critical: {
    icon: "text-rose-500",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25",
  },
  warning: {
    icon: "text-amber-500",
    badge:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  },
  healthy: {
    icon: "text-emerald-500",
    badge:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
};

export function InspectorConditionsTab({
  currentResource,
  podData,
}: InspectorConditionsTabProps) {
  const conditions = podData?.conditions ?? [];

  if (conditions.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
        <p className="text-xs text-[var(--muted)] font-mono">
          No {currentResource.kind} conditions reported by the cluster.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 text-xs">
      {conditions.map((condition) => {
        const tone = getPodConditionTone(condition);
        const Icon =
          tone === "critical"
            ? AlertCircle
            : tone === "warning"
              ? Clock
              : CheckCircle2;

        return (
          <div
            key={`${condition.type}-${condition.reason ?? ""}`}
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-start justify-between gap-3 shadow-2xs"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Icon
                  className={cn("w-4 h-4 shrink-0", toneClasses[tone].icon)}
                />
                <span className="font-semibold text-[var(--foreground)] font-mono text-xs">
                  {condition.type}
                </span>
                {condition.reason && (
                  <span className="text-[10px] font-mono text-[var(--muted)] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                    {condition.reason}
                  </span>
                )}
              </div>
              {condition.message && (
                <p className="text-[11px] text-[var(--muted)] pl-6 leading-relaxed font-mono break-all">
                  {condition.message}
                </p>
              )}
              {condition.lastTransitionTime && (
                <span className="text-[9px] text-[var(--muted)]/70 pl-6 block font-mono">
                  Transitioned:{" "}
                  {new Date(condition.lastTransitionTime).toLocaleString()}
                </span>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border shrink-0",
                toneClasses[tone].badge,
              )}
            >
              {condition.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
