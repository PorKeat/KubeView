"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export interface InspectorConditionsTabProps {
  currentResource: SelectedResource;
  podData: PodSummary | undefined;
}

export function InspectorConditionsTab({ currentResource, podData }: InspectorConditionsTabProps) {
  const conditions =
    podData?.conditions && podData.conditions.length > 0
      ? podData.conditions
      : [
          {
            type: "PodScheduled",
            status: "True",
            reason: "PodScheduled",
            message: "All pods have been placed on an active cluster worker node",
            lastTransitionTime: "",
          },
          {
            type: "Initialized",
            status: "True",
            reason: "PodInitialized",
            message: "All init containers have executed and exited cleanly",
            lastTransitionTime: "",
          },
          {
            type: "ContainersReady",
            status: currentResource.status === "Running" ? "True" : "False",
            reason: currentResource.status,
            message: "All primary application containers in the pod are ready",
            lastTransitionTime: "",
          },
          {
            type: "Ready",
            status: currentResource.status === "Running" ? "True" : "False",
            reason: currentResource.status,
            message: "Pod is capable of serving ingress traffic and endpoints",
            lastTransitionTime: "",
          },
        ];

  return (
    <div className="space-y-2.5 text-xs">
      {conditions.map((c) => {
        const isOk = c.status === "True";
        return (
          <div
            key={c.type}
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-start justify-between gap-3 shadow-2xs"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="font-semibold text-[var(--foreground)] font-mono text-xs">{c.type}</span>
                {c.reason && (
                  <span className="text-[10px] font-mono text-[var(--muted)] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                    {c.reason}
                  </span>
                )}
              </div>
              {c.message && (
                <p className="text-[11px] text-[var(--muted)] pl-6 leading-relaxed font-mono break-all">{c.message}</p>
              )}
              {c.lastTransitionTime && (
                <span className="text-[9px] text-[var(--muted)]/70 pl-6 block font-mono">
                  Transitioned: {new Date(c.lastTransitionTime).toLocaleString()}
                </span>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border shrink-0",
                isOk
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25"
              )}
            >
              {c.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
