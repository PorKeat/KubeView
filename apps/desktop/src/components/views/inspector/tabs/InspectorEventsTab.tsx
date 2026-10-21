"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodEventItem } from "@kubeview/contracts";

export interface InspectorEventsTabProps {
  events: PodEventItem[];
  isLoading: boolean;
}

export function InspectorEventsTab({ events, isLoading }: InspectorEventsTabProps) {
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-[var(--muted)] gap-2">
        <RotateCw className="w-4 h-4 animate-spin text-[#F08A42]" />
        <span>Loading pod events...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--muted)] text-xs border border-dashed border-[var(--border)] rounded-2xl">
        No recent events recorded for this pod.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 text-xs">
      {events.map((e, idx) => (
        <div key={idx} className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                e.type === "Normal"
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}
            >
              {e.reason}
            </span>
            <span className="text-[10px] text-[var(--muted)] font-mono">{e.lastTimestamp}</span>
          </div>
          <p className="text-[11px] text-[var(--foreground)] font-mono leading-relaxed">{e.message}</p>
        </div>
      ))}
    </div>
  );
}
