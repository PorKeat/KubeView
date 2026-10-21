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
          <div className="flex items-center">
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
          <div className="flex items-center">
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

        {/* Pods */}
        <div className="space-y-1">
          <div className="flex items-center">
            <span
              className={cn(
                "text-xs font-mono tracking-wider truncate",
                isNamespaceScoped
                  ? "text-[var(--accent)] font-semibold"
                  : "font-medium text-[var(--muted)]"
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
                  ? "text-[var(--accent)]"
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
