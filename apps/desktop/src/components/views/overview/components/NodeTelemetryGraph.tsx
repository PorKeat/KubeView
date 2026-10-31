"use client";

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
  /** Render only the core metric row (used by the compact node cube). */
  compact?: boolean;
}

interface MetricCellProps {
  label: string;
  barClassName: string;
  value: number;
  suffix: string;
  percent: number;
  detail: string;
  highlighted?: boolean;
}

function MetricCell({
  label,
  barClassName,
  value,
  suffix,
  percent,
  detail,
  highlighted = false,
}: MetricCellProps) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <span
        className={cn(
          "block truncate font-mono text-[9px] font-medium uppercase tracking-[0.14em]",
          highlighted ? "text-[var(--accent)]" : "text-[var(--muted)]",
        )}
        title={label}
      >
        {label}
      </span>

      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-2xl font-semibold leading-none tracking-tight tabular-nums",
            highlighted ? "text-[var(--accent)]" : "text-[var(--foreground)]",
          )}
        >
          {value}
        </span>
        <span className="truncate font-mono text-[10px] font-medium text-[var(--muted)] tabular-nums">
          {suffix}
        </span>
      </div>

      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-black/[0.1] dark:bg-white/[0.08]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            barClassName,
          )}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>

      {detail ? (
        <div className="mt-2 truncate font-mono text-[10px] tabular-nums text-[var(--muted)]">
          {detail}
        </div>
      ) : null}
    </div>
  );
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
  compact = false,
}: NodeTelemetryGraphProps) {
  const totalPods = podCapacity || 110;
  const freePods = Math.max(0, totalPods - activePods);
  const clampedCpu = Math.max(0, Math.min(100, Math.round(cpuPercent)));
  const clampedMem = Math.max(0, Math.min(100, Math.round(memoryPercent)));
  const isNamespaceScoped = Boolean(
    scopedNamespace && scopedNamespace !== "all",
  );

  const podValue = isNamespaceScoped ? (scopedPodsCount ?? 0) : activePods;
  const podTotal = isNamespaceScoped ? activePods : totalPods;
  const podPercent =
    podTotal > 0 ? Math.min(100, Math.round((podValue / podTotal) * 100)) : 0;

  return (
    <div className={cn("w-full", compact ? "space-y-3" : "space-y-4")}>
      {/* 3 Metric Columns: CPU, RAM, Pods */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]/60">
        <MetricCell
          label="CPU"
          barClassName="bg-emerald-400"
          value={clampedCpu}
          suffix="%"
          percent={clampedCpu}
          detail={compact ? "" : `${cpuDisplay || "0m"} used`}
        />
        <MetricCell
          label="RAM"
          barClassName="bg-sky-400"
          value={clampedMem}
          suffix="%"
          percent={clampedMem}
          detail={compact ? "" : `${memoryDisplay || "0Gi"} used`}
        />
        <MetricCell
          label={isNamespaceScoped ? `Pods (${scopedNamespace})` : "Pods"}
          barClassName="bg-[var(--accent)]"
          value={podValue}
          suffix={`/ ${podTotal}`}
          percent={podPercent}
          detail={
            compact
              ? ""
              : isNamespaceScoped
                ? `${activePods} total on node`
                : `${freePods} free`
          }
          highlighted={isNamespaceScoped && podValue > 0}
        />
      </div>

      {/* Precision Telemetry Chart */}
      <PrecisionTelemetryChart
        nodeName={nodeName}
        cpuPercent={clampedCpu}
        cpuDisplay={cpuDisplay}
        memoryPercent={clampedMem}
        memoryDisplay={memoryDisplay}
        compact={compact}
      />
    </div>
  );
}
