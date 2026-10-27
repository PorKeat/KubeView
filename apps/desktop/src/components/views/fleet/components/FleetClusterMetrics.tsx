"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ClusterStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)]/80 bg-black/[0.015] p-2 dark:bg-white/[0.02]">
      <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </div>
      <div className="truncate text-[9px] text-[var(--muted)]">{detail}</div>
    </div>
  );
}

export function ResourceMeter({
  label,
  percent,
  detail,
}: {
  label: string;
  percent: number;
  detail: string;
}) {
  const bounded = Math.min(100, Math.max(0, percent));
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate font-mono text-[var(--muted)]">{label}</span>
        <span className="shrink-0 font-mono font-semibold tabular-nums text-[var(--foreground)]">
          {bounded}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            bounded >= 85
              ? "bg-rose-500"
              : bounded >= 70
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
          style={{ width: `${bounded}%` }}
        />
      </div>
      <div className="mt-1 truncate text-[9px] font-mono text-[var(--muted)]">
        {detail}
      </div>
    </div>
  );
}
