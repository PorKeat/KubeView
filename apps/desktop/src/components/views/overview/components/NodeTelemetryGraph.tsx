"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PrecisionTelemetryChart } from "../charts/PrecisionTelemetryChart";

export interface NodeTelemetryGraphProps {
  nodeName: string;
  cpuPercent: number;
  cpuDisplay: string;
  memoryPercent: number;
  memoryDisplay: string;
  activePods: number;
  podCapacity: number;
  onInspectPods?: () => void;
  scopedNamespace?: string;
  scopedPodsCount?: number;
}

export function NodeTelemetryGraph({
  nodeName,
  cpuPercent,
  cpuDisplay,
  memoryPercent,
  memoryDisplay,
  activePods,
  podCapacity,
  scopedNamespace,
  scopedPodsCount,
}: NodeTelemetryGraphProps) {
  const totalPods = podCapacity || 110;
  const freePods = Math.max(0, totalPods - activePods);
  const clampedCpu = Math.max(0, Math.min(100, Math.round(cpuPercent)));
  const clampedMem = Math.max(0, Math.min(100, Math.round(memoryPercent)));
  const isNamespaceScoped = Boolean(scopedNamespace && scopedNamespace !== "all");

  return (
    <div className="space-y-3.5">
      {/* 3 Metric Columns: CPU, RAM, Pods */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {/* CPU */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
              CPU
            </span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums">
              {clampedCpu}
            </span>
            <span className="text-xs sm:text-sm font-medium font-mono text-[var(--muted)]">%</span>
          </div>
          <div className="text-xs font-mono text-[var(--muted)] tabular-nums truncate">
            {cpuDisplay || "0m"}
          </div>
        </div>

        {/* RAM */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
            <span className="text-xs font-mono font-medium text-[var(--muted)] tracking-wider">
              RAM
            </span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums">
              {clampedMem}
            </span>
            <span className="text-xs sm:text-sm font-medium font-mono text-[var(--muted)]">%</span>
          </div>
          <div className="text-xs font-mono text-[var(--muted)] tabular-nums truncate">
            {memoryDisplay || "0Gi"}
          </div>
        </div>

        {/* Pods (Interactive for 1-click filtering) */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onInspectPods?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onInspectPods?.();
            }
          }}
          title={
            isNamespaceScoped
              ? `Filter pods in '${scopedNamespace}' running on ${nodeName}`
              : `Filter pods running on ${nodeName}`
          }
          className="space-y-1 cursor-pointer group/podscol -m-1 p-1 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isNamespaceScoped ? "bg-[#f08a42]" : "bg-amber-400"
              )}
            />
            <span
              className={cn(
                "text-xs font-mono tracking-wider transition-colors truncate",
                isNamespaceScoped
                  ? "text-[#f08a42] font-semibold"
                  : "font-medium text-[var(--muted)] group-hover/podscol:text-[var(--foreground)]"
              )}
            >
              {isNamespaceScoped ? `Pods (${scopedNamespace})` : "Pods"}
            </span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span
              className={cn(
                "text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums",
                isNamespaceScoped && (scopedPodsCount ?? 0) > 0
                  ? "text-[#f08a42]"
                  : "text-[var(--foreground)]"
              )}
            >
              {isNamespaceScoped ? (scopedPodsCount ?? 0) : activePods}
            </span>
            <span className="text-xs sm:text-sm font-medium font-mono text-[var(--muted)]">
              {isNamespaceScoped ? ` / ${activePods}` : `/${totalPods}`}
            </span>
          </div>
          <div className="text-xs font-mono text-[var(--muted)] tabular-nums truncate">
            {isNamespaceScoped
              ? `${activePods} total on node`
              : `${freePods} free`}
          </div>
        </div>
      </div>

      {/* Precision Telemetry Chart */}
      <PrecisionTelemetryChart
        nodeName={nodeName}
        cpuPercent={clampedCpu}
        cpuDisplay={cpuDisplay}
        memoryPercent={clampedMem}
        memoryDisplay={memoryDisplay}
      />
    </div>
  );
}
