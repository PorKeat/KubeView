"use client";

import * as React from "react";
import { Activity, Layers } from "lucide-react";
import { motion } from "motion/react";
import { SpotlightCard, MetricTicker } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ClusterOverviewResult } from "@kubeview/contracts";

export interface BentoMetricCardsProps {
  clusterOverview: ClusterOverviewResult | null;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  scopedPodsCount: number;
  nodesHostingCount: number;
  availableNamespacesCount: number;
  hasMetrics: boolean;
  effectiveMode: "usage" | "allocation";
  telemetryMode: "usage" | "allocation";
  onSetTelemetryMode: (mode: "usage" | "allocation") => void;
  onOpenPodsView: () => void;
  onScrollToNodes: () => void;
}

export function BentoMetricCards({
  clusterOverview,
  isNamespaceScoped,
  currentNamespace,
  scopedPodsCount,
  nodesHostingCount,
  availableNamespacesCount,
  hasMetrics,
  effectiveMode,
  onSetTelemetryMode,
  onOpenPodsView,
  onScrollToNodes,
}: BentoMetricCardsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight">
            {isNamespaceScoped ? `Telemetry (${currentNamespace})` : "Cluster Telemetry"}
          </span>
        </div>

        {hasMetrics && (
          <div
            className="relative flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono self-start sm:self-auto select-none"
            role="group"
            aria-label="Telemetry display mode"
          >
            <button
              type="button"
              onClick={() => onSetTelemetryMode("usage")}
              aria-pressed={effectiveMode === "usage"}
              className={cn(
                "relative z-10 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                effectiveMode === "usage"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
              title="Live CPU & Memory consumption from metrics-server (kubectl top)"
            >
              {effectiveMode === "usage" && (
                <motion.div
                  layoutId="telemetry-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>Live Usage (kubectl top)</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTelemetryMode("allocation")}
              aria-pressed={effectiveMode === "allocation"}
              className={cn(
                "relative z-10 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                effectiveMode === "allocation"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
              title="Scheduled pod resource requests & capacity commitments"
            >
              {effectiveMode === "allocation" && (
                <motion.div
                  layoutId="telemetry-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Pod Allocation (Requests)</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Modern Bento Spotlight Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Cell 1: CPU */}
        <SpotlightCard className="p-5 flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)] truncate">
              {isNamespaceScoped
                ? "Namespace CPU Allocation"
                : effectiveMode === "usage"
                ? "CPU Utilization"
                : "CPU Allocation"}
            </span>
            <span className="font-mono text-[var(--muted)] tabular-nums shrink-0">
              {clusterOverview?.totalCpuCores ?? 0} Cores Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={
                  isNamespaceScoped
                    ? clusterOverview?.cpuPercent ?? 0
                    : effectiveMode === "usage"
                    ? clusterOverview?.cpuUsagePercent ?? 0
                    : clusterOverview?.cpuPercent ?? 0
                }
                suffix="%"
                className="text-2xl sm:text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                ({isNamespaceScoped
                  ? `${clusterOverview?.allocatedCpuCores ?? 0} Cores`
                  : effectiveMode === "usage"
                  ? `${clusterOverview?.usedCpuCores ?? 0} Cores`
                  : `${clusterOverview?.allocatedCpuCores ?? 0} Cores`})
              </span>
            </div>

            {/* Precision Barometer */}
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  (isNamespaceScoped
                    ? (clusterOverview?.cpuPercent ?? 0)
                    : effectiveMode === "usage"
                    ? (clusterOverview?.cpuUsagePercent ?? 0)
                    : (clusterOverview?.cpuPercent ?? 0)) > 85
                    ? "bg-rose-500"
                    : (isNamespaceScoped
                        ? (clusterOverview?.cpuPercent ?? 0)
                        : effectiveMode === "usage"
                        ? (clusterOverview?.cpuUsagePercent ?? 0)
                        : (clusterOverview?.cpuPercent ?? 0)) > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    isNamespaceScoped
                      ? clusterOverview?.cpuPercent ?? 0
                      : effectiveMode === "usage"
                      ? clusterOverview?.cpuUsagePercent ?? 0
                      : clusterOverview?.cpuPercent ?? 0
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span className="tabular-nums truncate">
              {isNamespaceScoped
                ? `Scope: ${currentNamespace}`
                : effectiveMode === "usage" && hasMetrics
                ? `Req: ${clusterOverview?.allocatedCpuCores ?? 0} Cores (${clusterOverview?.cpuPercent ?? 0}%)`
                : `Total: ${clusterOverview?.totalCpuCores ?? 0} Cores`}
            </span>
            <span
              className={cn(
                "font-semibold text-xs shrink-0",
                isNamespaceScoped
                  ? "text-[#f08a42]"
                  : (effectiveMode === "usage"
                      ? (clusterOverview?.cpuUsagePercent ?? 0)
                      : (clusterOverview?.cpuPercent ?? 0)) > 85
                  ? "text-rose-600 dark:text-rose-400"
                  : (effectiveMode === "usage"
                      ? (clusterOverview?.cpuUsagePercent ?? 0)
                      : (clusterOverview?.cpuPercent ?? 0)) > 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isNamespaceScoped
                ? `${scopedPodsCount} Pods`
                : (effectiveMode === "usage"
                    ? (clusterOverview?.cpuUsagePercent ?? 0)
                    : (clusterOverview?.cpuPercent ?? 0)) > 85
                ? "Critical"
                : (effectiveMode === "usage"
                    ? (clusterOverview?.cpuUsagePercent ?? 0)
                    : (clusterOverview?.cpuPercent ?? 0)) > 70
                ? "High Load"
                : "Healthy"}
            </span>
          </div>
        </SpotlightCard>

        {/* Cell 2: Memory */}
        <SpotlightCard className="p-5 flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)] truncate">
              {isNamespaceScoped
                ? "Namespace Memory Reserved"
                : effectiveMode === "usage"
                ? "Memory Utilization"
                : "Memory Reserved"}
            </span>
            <span className="font-mono text-[var(--muted)] tabular-nums shrink-0">
              {clusterOverview?.totalMemoryGiB ?? 0} GiB Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={
                  isNamespaceScoped
                    ? clusterOverview?.memoryPercent ?? 0
                    : effectiveMode === "usage"
                    ? clusterOverview?.memoryUsagePercent ?? 0
                    : clusterOverview?.memoryPercent ?? 0
                }
                suffix="%"
                className="text-2xl sm:text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                ({isNamespaceScoped
                  ? `${clusterOverview?.allocatedMemoryGiB ?? 0} GiB`
                  : effectiveMode === "usage"
                  ? `${clusterOverview?.usedMemoryGiB ?? 0} GiB`
                  : `${clusterOverview?.allocatedMemoryGiB ?? 0} GiB`})
              </span>
            </div>

            {/* Precision Barometer */}
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  (isNamespaceScoped
                    ? (clusterOverview?.memoryPercent ?? 0)
                    : effectiveMode === "usage"
                    ? (clusterOverview?.memoryUsagePercent ?? 0)
                    : (clusterOverview?.memoryPercent ?? 0)) > 85
                    ? "bg-rose-500"
                    : (isNamespaceScoped
                        ? (clusterOverview?.memoryPercent ?? 0)
                        : effectiveMode === "usage"
                        ? (clusterOverview?.memoryUsagePercent ?? 0)
                        : (clusterOverview?.memoryPercent ?? 0)) > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    isNamespaceScoped
                      ? clusterOverview?.memoryPercent ?? 0
                      : effectiveMode === "usage"
                      ? clusterOverview?.memoryUsagePercent ?? 0
                      : clusterOverview?.memoryPercent ?? 0
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span className="tabular-nums truncate">
              {isNamespaceScoped
                ? `Cluster Cap: ${clusterOverview?.totalMemoryGiB ?? 0} GiB`
                : effectiveMode === "usage" && hasMetrics
                ? `Req: ${clusterOverview?.allocatedMemoryGiB ?? 0} GiB (${clusterOverview?.memoryPercent ?? 0}%)`
                : `Total: ${clusterOverview?.totalMemoryGiB ?? 0} GiB`}
            </span>
            <span
              className={cn(
                "font-semibold text-xs shrink-0",
                isNamespaceScoped
                  ? "text-[#f08a42]"
                  : (effectiveMode === "usage"
                      ? (clusterOverview?.memoryUsagePercent ?? 0)
                      : (clusterOverview?.memoryPercent ?? 0)) > 85
                  ? "text-rose-600 dark:text-rose-400"
                  : (effectiveMode === "usage"
                      ? (clusterOverview?.memoryUsagePercent ?? 0)
                      : (clusterOverview?.memoryPercent ?? 0)) > 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isNamespaceScoped
                ? `${(clusterOverview?.memoryPercent ?? 0).toFixed(1)}% Fleet`
                : (effectiveMode === "usage"
                    ? (clusterOverview?.memoryUsagePercent ?? 0)
                    : (clusterOverview?.memoryPercent ?? 0)) > 85
                ? "Critical"
                : (effectiveMode === "usage"
                    ? (clusterOverview?.memoryUsagePercent ?? 0)
                    : (clusterOverview?.memoryPercent ?? 0)) > 70
                ? "High Load"
                : "Optimal"}
            </span>
          </div>
        </SpotlightCard>

        {/* Cell 3: Pod Fleet Density */}
        <SpotlightCard
          role="button"
          tabIndex={0}
          aria-label={`Pod density: ${clusterOverview?.totalPods ?? scopedPodsCount} of ${clusterOverview?.podCapacity ?? 0} pods. Press Enter or Space to view pods explorer.`}
          onClick={onOpenPodsView}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenPodsView();
            }
          }}
          containerClassName="cursor-pointer group focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          className="p-5 flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)]">
              {isNamespaceScoped ? "Namespace Pod Fleet" : "Pod Fleet Density"}
            </span>
            <span className="font-mono text-[var(--muted)] tabular-nums">
              {clusterOverview?.podCapacity ?? 0} Capacity
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={clusterOverview?.totalPods ?? scopedPodsCount}
                className="text-2xl sm:text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                / {clusterOverview?.podCapacity ?? 0} ({clusterOverview?.podPercent ?? 0}%)
              </span>
            </div>

            {/* Precision Barometer */}
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  (clusterOverview?.podPercent ?? 0) > 85
                    ? "bg-rose-500"
                    : (clusterOverview?.podPercent ?? 0) > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, clusterOverview?.podPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span className="tabular-nums">
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {clusterOverview?.runningPods ?? scopedPodsCount}
              </strong>{" "}
              Running
              {clusterOverview?.pendingPods ? ` · ${clusterOverview.pendingPods} Pending` : ""}
              {clusterOverview?.failedPods ? ` · ${clusterOverview.failedPods} Failed` : ""}
            </span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-1 transition-transform font-sans">
              View &rarr;
            </span>
          </div>
        </SpotlightCard>

        {/* Cell 4: Node Fleet Status */}
        <SpotlightCard
          role="button"
          tabIndex={0}
          aria-label={`Cluster nodes: ${clusterOverview?.readyNodes ?? 0} of ${clusterOverview?.totalNodes ?? 0} ready. Press Enter or Space to view nodes.`}
          onClick={onScrollToNodes}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onScrollToNodes();
            }
          }}
          containerClassName="cursor-pointer group focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          className="p-5 flex flex-col justify-between space-y-3.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)]">
              {isNamespaceScoped ? "Nodes Hosting Workloads" : "Cluster Nodes"}
            </span>
            <span className="font-mono text-[var(--muted)] tabular-nums">
              {clusterOverview?.totalNodes ?? 0} Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={isNamespaceScoped ? nodesHostingCount : (clusterOverview?.readyNodes ?? 0)}
                className="text-2xl sm:text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                / {clusterOverview?.totalNodes ?? 0} {isNamespaceScoped ? "Nodes Active" : "Ready"}
              </span>
            </div>

            {/* Precision Barometer */}
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  isNamespaceScoped
                    ? "bg-[#f08a42]"
                    : clusterOverview?.totalNodes && clusterOverview.readyNodes === clusterOverview.totalNodes
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-amber-500"
                )}
                style={{
                  width: `${
                    isNamespaceScoped
                      ? Math.min(100, (nodesHostingCount * 100) / (clusterOverview?.totalNodes || 1))
                      : clusterOverview?.totalNodes
                      ? Math.min(100, ((clusterOverview?.readyNodes ?? 0) * 100) / clusterOverview.totalNodes)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span className="tabular-nums truncate">
              {isNamespaceScoped ? `Scope: ${currentNamespace}` : `${availableNamespacesCount} Namespaces`}
            </span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-1 transition-transform font-sans shrink-0">
              Inspect &rarr;
            </span>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
